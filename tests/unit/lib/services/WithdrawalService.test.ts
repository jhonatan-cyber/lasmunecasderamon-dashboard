import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawalService } from '@/lib/services/WithdrawalService';
import { ValidationError, BusinessError } from '@/lib/errors/errors';

vi.mock('@/lib/repositories/WithdrawalRepository', () => ({
  WithdrawalRepository: {
    getByCajaId: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('@/lib/repositories/CashRegisterRepository', () => ({
  CashRegisterRepository: {
    getCurrentCajaId: vi.fn(),
    updateBalances: vi.fn()
  }
}));

vi.mock('@/lib/database/db', () => ({
  withTransaction: vi.fn(async (fn: any) => fn(vi.fn()))
}));

import { WithdrawalRepository } from '@/lib/repositories/WithdrawalRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { withTransaction } from '@/lib/database/db';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getByCajaId ─────────────────────────────────────────────────────────────

describe('WithdrawalService.getByCajaId', () => {
  it('lanza ValidationError si cajaId está vacío', async () => {
    await expect(WithdrawalService.getByCajaId('')).rejects.toThrow(ValidationError);
    await expect(WithdrawalService.getByCajaId('')).rejects.toThrow('ID de caja es requerido');
  });

  it('llama al repositorio con el id correcto', async () => {
    vi.mocked(WithdrawalRepository.getByCajaId).mockResolvedValue([]);

    await WithdrawalService.getByCajaId('caja-1');

    expect(WithdrawalRepository.getByCajaId).toHaveBeenCalledWith('caja-1');
  });

  it('retorna los retiros del repositorio', async () => {
    const mockRetiros = [{ id: 'ret-1', monto: 10000 }];
    vi.mocked(WithdrawalRepository.getByCajaId).mockResolvedValue(mockRetiros as any);

    const result = await WithdrawalService.getByCajaId('caja-1');
    expect(result).toEqual(mockRetiros);
  });
});

// ─── addRetiro ───────────────────────────────────────────────────────────────

describe('WithdrawalService.addRetiro', () => {
  const validRetiro = {
    monto: 50000,
    motivo: 'Retiro de prueba',
    caja_id: 'caja-1',
    usuario_id: 'user-1'
  };

  it('lanza BusinessError si no hay caja abierta y no se puede obtener', async () => {
    const retiroSinCaja = { ...validRetiro, caja_id: undefined };

    vi.mocked(withTransaction).mockImplementation(async (fn: any) => {
      const trx = vi.fn().mockResolvedValue([]); // devuelve [] para que rows[0]?.id_caja sea undefined
      vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue(null);
      return fn(trx);
    });

    await expect(WithdrawalService.addRetiro(retiroSinCaja as any)).rejects.toThrow(BusinessError);
    await expect(WithdrawalService.addRetiro(retiroSinCaja as any)).rejects.toThrow('caja abierta');
  });

  it('usa la caja del parámetro si se proporciona', async () => {
    vi.mocked(WithdrawalRepository.create).mockResolvedValue('ret-1' as any);
    vi.mocked(CashRegisterRepository.updateBalances).mockResolvedValue(undefined);

    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      const trx = vi.fn().mockResolvedValue([{ monto_apertura: 100000, efectivo: 0 }]);
      return fn(trx);
    });

    const result = await WithdrawalService.addRetiro(validRetiro as any);

    expect(CashRegisterRepository.getCurrentCajaId).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id_retiro: 'ret-1', caja_id: 'caja-1' });
  });

  it('actualiza el balance de la caja con un UPDATE directo (monto negativo)', async () => {
    vi.mocked(WithdrawalRepository.create).mockResolvedValue('ret-1' as any);

    let capturedTrx: any;
    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      capturedTrx = vi.fn().mockResolvedValue([{ monto_apertura: 100000, efectivo: 0 }]);
      return fn(capturedTrx);
    });

    await WithdrawalService.addRetiro(validRetiro as any);

    // Ahora usa UPDATE directo en cajas en vez de CashRegisterRepository.updateBalances
    expect(capturedTrx).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE cajas SET efectivo = efectivo - ?'),
      expect.arrayContaining([50000, 'caja-1'])
    );
  });

  it('bloquea retiros mayores al efectivo disponible', async () => {
    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      const trx = vi.fn().mockResolvedValue([{ monto_apertura: 10000, efectivo: 5000 }]);
      return fn(trx);
    });

    await expect(
      WithdrawalService.addRetiro({ ...validRetiro, monto: 20000 } as any)
    ).rejects.toThrow(BusinessError);

    expect(WithdrawalRepository.create).not.toHaveBeenCalled();
  });
});
