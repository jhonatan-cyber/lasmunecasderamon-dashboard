import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CashRegisterService } from '@/lib/services/CashRegisterService';
import { ConflictError, NotFoundError } from '@/lib/errors/errors';

vi.mock('@/lib/repositories/CashRegisterRepository', () => ({
  CashRegisterRepository: {
    open: vi.fn(),
    close: vi.fn(),
    update: vi.fn(),
    getById: vi.fn()
  }
}));

import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';

beforeEach(() => {
  vi.clearAllMocks();
});



describe('CashRegisterService.openCaja', () => {
  it('llama al repositorio con los parámetros validados', async () => {
    const mockCaja = { id_caja: 'caja-1', estado: 1, monto_apertura: 50000 };
    vi.mocked(CashRegisterRepository.open).mockResolvedValue(mockCaja as any);

    const result = await CashRegisterService.openCaja({
      usuario_id_apertura: 'user-1',
      monto_apertura: 50000
    });

    expect(CashRegisterRepository.open).toHaveBeenCalledWith('user-1', 50000);
    expect(result).toEqual(mockCaja);
  });

  it('convierte usuario_id_apertura numérico a string', async () => {
    vi.mocked(CashRegisterRepository.open).mockResolvedValue({ id_caja: 'caja-1' } as any);

    await CashRegisterService.openCaja({
      usuario_id_apertura: 123 as any,
      monto_apertura: 10000
    });

    expect(CashRegisterRepository.open).toHaveBeenCalledWith('123', 10000);
  });

  it('propaga ConflictError si el usuario ya tiene caja abierta', async () => {
    vi.mocked(CashRegisterRepository.open).mockRejectedValue(
      new ConflictError('Usuario ya tiene una caja abierta')
    );

    await expect(
      CashRegisterService.openCaja({ usuario_id_apertura: 'user-1', monto_apertura: 50000 })
    ).rejects.toThrow(ConflictError);
  });

  it('acepta monto_apertura de 0', async () => {
    vi.mocked(CashRegisterRepository.open).mockResolvedValue({ id_caja: 'caja-1' } as any);

    await expect(
      CashRegisterService.openCaja({ usuario_id_apertura: 'user-1', monto_apertura: 0 })
    ).resolves.not.toThrow();

    expect(CashRegisterRepository.open).toHaveBeenCalledWith('user-1', 0);
  });

  it('lanza ZodError si monto_apertura es negativo', async () => {
    await expect(
      CashRegisterService.openCaja({ usuario_id_apertura: 'user-1', monto_apertura: -100 })
    ).rejects.toThrow();
  });
});



describe('CashRegisterService.closeCaja', () => {
  it('llama al repositorio con los parámetros validados', async () => {
    const mockCaja = { id_caja: 'caja-1', estado: 0 };
    vi.mocked(CashRegisterRepository.close).mockResolvedValue(mockCaja as any);

    const result = await CashRegisterService.closeCaja({
      id_caja: 'caja-1',
      usuario_id_cierre: 'user-1'
    });

    expect(CashRegisterRepository.close).toHaveBeenCalledWith('caja-1', 'user-1');
    expect(result).toEqual(mockCaja);
  });

  it('convierte id_caja numérico a string', async () => {
    vi.mocked(CashRegisterRepository.close).mockResolvedValue({ id_caja: 'caja-1' } as any);

    await CashRegisterService.closeCaja({
      id_caja: 42 as any,
      usuario_id_cierre: 'user-1'
    });

    expect(CashRegisterRepository.close).toHaveBeenCalledWith('42', 'user-1');
  });

  it('propaga NotFoundError si la caja no existe o ya está cerrada', async () => {
    vi.mocked(CashRegisterRepository.close).mockRejectedValue(new NotFoundError('Caja abierta'));

    await expect(
      CashRegisterService.closeCaja({ id_caja: 'caja-1', usuario_id_cierre: 'user-1' })
    ).rejects.toThrow(NotFoundError);
  });
});



describe('CashRegisterService.updateCaja', () => {
  it('llama al repositorio con los datos validados', async () => {
    const mockCaja = { id_caja: 'caja-1', ventas: 100000 };
    vi.mocked(CashRegisterRepository.update).mockResolvedValue(mockCaja as any);

    const result = await CashRegisterService.updateCaja('caja-1', { ventas: 100000 });

    expect(CashRegisterRepository.update).toHaveBeenCalledWith('caja-1', { ventas: 100000 });
    expect(result).toEqual(mockCaja);
  });

  it('ignora campos desconocidos (Zod strip)', async () => {
    vi.mocked(CashRegisterRepository.update).mockResolvedValue({ id_caja: 'caja-1' } as any);

    await CashRegisterService.updateCaja('caja-1', { ventas: 5000, campoDesconocido: 'x' } as any);

    const callArg = vi.mocked(CashRegisterRepository.update).mock.calls[0][1];
    expect(callArg).not.toHaveProperty('campoDesconocido');
  });

  it('retorna el resultado del repositorio', async () => {
    const mockCaja = { id_caja: 'caja-1', efectivo: 75000 };
    vi.mocked(CashRegisterRepository.update).mockResolvedValue(mockCaja as any);

    const result = await CashRegisterService.updateCaja('caja-1', { efectivo: 75000 });
    expect(result).toEqual(mockCaja);
  });
});
