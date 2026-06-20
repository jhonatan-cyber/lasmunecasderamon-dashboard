import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnticipoService } from '@/lib/services/AnticipoService';
import { ValidationError } from '@/lib/errors/errors';

vi.mock('@/lib/repositories/AnticipoRepository', () => ({
  AnticipoRepository: {
    request: vi.fn(),
    grant: vi.fn(),
    processSolicitud: vi.fn()
  }
}));

import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';

beforeEach(() => {
  vi.clearAllMocks();
});



describe('AnticipoService.grantAnticipo', () => {
  it('lanza ValidationError si monto es 0', async () => {
    await expect(AnticipoService.grantAnticipo('user-1', 0)).rejects.toThrow(ValidationError);
    await expect(AnticipoService.grantAnticipo('user-1', 0)).rejects.toThrow('positivo');
  });

  it('lanza ValidationError si monto es negativo', async () => {
    await expect(AnticipoService.grantAnticipo('user-1', -500)).rejects.toThrow(ValidationError);
  });

  it('llama al repositorio con los parámetros correctos', async () => {
    vi.mocked(AnticipoRepository.grant).mockResolvedValue({ id: 'anticipo-1' } as any);

    await AnticipoService.grantAnticipo('user-1', 50000, 'Motivo test', '2026-04-09');

    expect(AnticipoRepository.grant).toHaveBeenCalledWith(
      'user-1',
      50000,
      'Motivo test',
      '2026-04-09',
      undefined
    );
  });

  it('retorna el resultado del repositorio', async () => {
    const mockResult = { id: 'anticipo-1', monto: 50000 };
    vi.mocked(AnticipoRepository.grant).mockResolvedValue(mockResult as any);

    const result = await AnticipoService.grantAnticipo('user-1', 50000);
    expect(result).toEqual(mockResult);
  });
});



describe('AnticipoService.processAnticipoFromCommand', () => {
  const pendientes = [
    { id: 'ant-1', empleado_nombre: 'Juan Pérez' },
    { id: 'ant-2', empleado_nombre: 'María López' }
  ];

  it('retorna ok:false si el anticipo no está en la lista', async () => {
    const result = await AnticipoService.processAnticipoFromCommand(
      pendientes,
      'ant-999',
      true,
      'admin'
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('no encontrada');
  });

  it('aprueba correctamente y retorna ok:true', async () => {
    vi.mocked(AnticipoRepository.processSolicitud).mockResolvedValue(undefined as any);

    const result = await AnticipoService.processAnticipoFromCommand(
      pendientes,
      'ant-1',
      true,
      'admin'
    );

    expect(AnticipoRepository.processSolicitud).toHaveBeenCalledWith('ant-1', 'approve');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('APROBADO');
    expect(result.message).toContain('Juan Pérez');
  });

  it('rechaza correctamente y retorna ok:true', async () => {
    vi.mocked(AnticipoRepository.processSolicitud).mockResolvedValue(undefined as any);

    const result = await AnticipoService.processAnticipoFromCommand(
      pendientes,
      'ant-2',
      false,
      'admin'
    );

    expect(AnticipoRepository.processSolicitud).toHaveBeenCalledWith('ant-2', 'reject');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('RECHAZADO');
  });

  it('retorna ok:false si el repositorio lanza error', async () => {
    vi.mocked(AnticipoRepository.processSolicitud).mockRejectedValue(new Error('DB error'));

    const result = await AnticipoService.processAnticipoFromCommand(
      pendientes,
      'ant-1',
      true,
      'admin'
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain('DB error');
  });
});
