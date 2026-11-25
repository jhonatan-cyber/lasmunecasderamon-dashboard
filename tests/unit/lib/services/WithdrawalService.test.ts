import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawalService } from '@/modules/caja/retiros/servicio';
import { ValidationError, BusinessError } from '@/lib/errors/errors';

vi.mock('@/modules/caja/retiros/repositorio', () => ({
  WithdrawalRepository: {
    getOpenCajaId: vi.fn(),
    getOpenCajaForUpdate: vi.fn(),
    subtractCajaCash: vi.fn(),
    getByCajaId: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('@/lib/database/db', () => ({
  withTransaction: vi.fn(async (fn: any) => fn(vi.fn()))
}));

import { WithdrawalRepository } from '@/modules/caja/retiros/repositorio';
import { withTransaction } from '@/lib/database/db';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(WithdrawalRepository.getOpenCajaId).mockResolvedValue(null);
  vi.mocked(WithdrawalRepository.getOpenCajaForUpdate).mockResolvedValue([]);
});

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
      const trx = vi.fn().mockResolvedValue([]);
      return fn(trx);
    });

    await expect(WithdrawalService.addRetiro(retiroSinCaja as any)).rejects.toThrow(BusinessError);
    await expect(WithdrawalService.addRetiro(retiroSinCaja as any)).rejects.toThrow('caja abierta');
  });

  it('usa la caja del parámetro si se proporciona', async () => {
    vi.mocked(WithdrawalRepository.create).mockResolvedValue('ret-1' as any);
    vi.mocked(WithdrawalRepository.getOpenCajaForUpdate).mockResolvedValue([
      { monto_apertura: 100000, efectivo: 0 }
    ]);

    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      const trx = vi.fn();
      return fn(trx);
    });

    const result = await WithdrawalService.addRetiro(validRetiro as any);

    expect(result).toMatchObject({ id_retiro: 'ret-1', caja_id: 'caja-1' });
  });

  it('delega la actualización del efectivo al repositorio de caja', async () => {
    vi.mocked(WithdrawalRepository.create).mockResolvedValue('ret-1' as any);
    vi.mocked(WithdrawalRepository.getOpenCajaForUpdate).mockResolvedValue([
      { monto_apertura: 100000, efectivo: 0 }
    ]);

    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      return fn(vi.fn());
    });

    const result = await WithdrawalService.addRetiro(validRetiro as any);

    expect(WithdrawalRepository.subtractCajaCash).toHaveBeenCalledWith(
      expect.any(Function),
      'caja-1',
      50000
    );
    expect(result).toMatchObject({ caja_id: 'caja-1' });
  });

  it('bloquea retiros mayores al efectivo disponible', async () => {
    vi.mocked(WithdrawalRepository.getOpenCajaForUpdate).mockResolvedValue([
      { monto_apertura: 10000, efectivo: 5000 }
    ]);
    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      return fn(vi.fn());
    });

    await expect(
      WithdrawalService.addRetiro({ ...validRetiro, monto: 20000 } as any)
    ).rejects.toThrow(BusinessError);

    expect(WithdrawalRepository.create).not.toHaveBeenCalled();
  });
});
