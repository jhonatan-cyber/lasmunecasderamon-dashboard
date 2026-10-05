/**
 * Casos de uso públicos del módulo Personal — anticipos.
 *
 * Fija la API pública de `modules/personal` para anticipos: validación de la
 * entrada y delegación sobre el repositorio privado (mockeado acá). El
 * comportamiento de la infraestructura (transacciones, caja, notificaciones)
 * se fija en `anticipos-repositorio.test.ts` y en las suites de postgres.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError } from '@/lib/errors/errors';

vi.mock('@/modules/personal/anticipos/repositorio', () => ({
  requestAnticipo: vi.fn(),
  grantAnticipo: vi.fn(),
  processSolicitudAnticipo: vi.fn()
}));

// La API pública (`modules/personal/index.ts`) carga también horas extras, cuyo
// repositorio toca el driver; se mockea para no arrastrarlo a este entorno.
vi.mock('@/modules/personal/horas-extras/repositorio', () => ({
  buscarTodas: vi.fn(),
  buscarPorFechas: vi.fn(),
  insertar: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn()
}));

// Los saldos que habilitan un anticipo viven en su propio subdominio y tocan el
// driver; se mockean para no arrastrarlo a este entorno.
vi.mock('@/modules/personal/balances/repositorio', () => ({
  getAnticipoBalances: vi.fn(async () => ({
    montoAsistencia: 0,
    montoComision: 0,
    montoPropina: 0,
    montoMaximo: 0
  }))
}));

import {
  otorgarAnticipo,
  procesarAnticipoDesdeComando,
  procesarSolicitud,
  procesarSolicitudDeTexto,
  solicitarAnticipo,
  solicitarAnticipoSimple
} from '@/modules/personal';
import {
  grantAnticipo,
  processSolicitudAnticipo,
  requestAnticipo
} from '@/modules/personal/anticipos/repositorio';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('otorgarAnticipo', () => {
  it('lanza ValidationError si monto es 0', async () => {
    await expect(otorgarAnticipo('user-1', 0)).rejects.toThrow(ValidationError);
    await expect(otorgarAnticipo('user-1', 0)).rejects.toThrow('positivo');
  });

  it('lanza ValidationError si monto es negativo', async () => {
    await expect(otorgarAnticipo('user-1', -500)).rejects.toThrow(ValidationError);
  });

  it('llama al repositorio con los parámetros correctos', async () => {
    vi.mocked(grantAnticipo).mockResolvedValue({ id_anticipo: 'anticipo-1' } as any);

    await otorgarAnticipo('user-1', 50000, 'Motivo test', '2026-04-09');

    expect(grantAnticipo).toHaveBeenCalledWith(
      'user-1',
      50000,
      'Motivo test',
      '2026-04-09',
      undefined
    );
  });

  it('propaga el adminId cuando viene', async () => {
    vi.mocked(grantAnticipo).mockResolvedValue(null);

    await otorgarAnticipo('user-1', 50000, 'Motivo', undefined, 'admin-1');

    expect(grantAnticipo).toHaveBeenCalledWith('user-1', 50000, 'Motivo', undefined, 'admin-1');
  });

  it('retorna el resultado del repositorio', async () => {
    const mockResult = { id_anticipo: 'anticipo-1', monto: 50000 };
    vi.mocked(grantAnticipo).mockResolvedValue(mockResult as any);

    const result = await otorgarAnticipo('user-1', 50000);
    expect(result).toEqual(mockResult);
  });
});

describe('solicitarAnticipo', () => {
  it('valida con el esquema y delega al repositorio', async () => {
    vi.mocked(requestAnticipo).mockResolvedValue({ id_anticipo: 'ant-1' } as any);

    await solicitarAnticipo('user-1', { monto: 100, motivo: 'Sueldo', device_date: '2026-04-09' });

    expect(requestAnticipo).toHaveBeenCalledWith('user-1', 100, 'Sueldo', '2026-04-09');
  });

  it('rechaza un monto no positivo sin tocar el repositorio', async () => {
    await expect(solicitarAnticipo('user-1', { monto: 0, motivo: 'Sueldo' })).rejects.toThrow(
      /positivo/
    );
    expect(requestAnticipo).not.toHaveBeenCalled();
  });

  it('rechaza un motivo vacío', async () => {
    await expect(solicitarAnticipo('user-1', { monto: 100, motivo: '' })).rejects.toThrow(
      /motivo es requerido/
    );
    expect(requestAnticipo).not.toHaveBeenCalled();
  });
});

describe('solicitarAnticipoSimple', () => {
  it('delega sin validar esquema, como el antiguo AnticipoService.request', async () => {
    vi.mocked(requestAnticipo).mockResolvedValue({ id_anticipo: 'ant-2' } as any);

    const result = await solicitarAnticipoSimple('user-1', 100, 'Sueldo');

    expect(requestAnticipo).toHaveBeenCalledWith('user-1', 100, 'Sueldo');
    expect(result).toEqual({ id_anticipo: 'ant-2' });
  });
});

describe('procesarSolicitud', () => {
  it('delega id, acción y adminId', async () => {
    vi.mocked(processSolicitudAnticipo).mockResolvedValue({ ok: true, id: 'ant-1' });

    await procesarSolicitud('ant-1', 'approve', 'admin-123');

    expect(processSolicitudAnticipo).toHaveBeenCalledWith('ant-1', 'approve', 'admin-123');
  });

  it('procesarSolicitudDeTexto pasa el texto crudo, como la ruta por token', async () => {
    vi.mocked(processSolicitudAnticipo).mockResolvedValue({ ok: true, id: 'ant-2' });

    await procesarSolicitudDeTexto('ant-2', 'reject');

    expect(processSolicitudAnticipo).toHaveBeenCalledWith('ant-2', 'reject', undefined);
  });
});

describe('procesarAnticipoDesdeComando', () => {
  const pendientes = [
    { id: 'ant-1', empleado_nombre: 'Juan Pérez' },
    { id: 'ant-2', empleado_nombre: 'María López' }
  ];

  it('retorna ok:false si el anticipo no está en la lista', async () => {
    const result = await procesarAnticipoDesdeComando(pendientes, 'ant-999', true, 'admin');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('no encontrada');
  });

  it('aprueba correctamente y retorna ok:true', async () => {
    vi.mocked(processSolicitudAnticipo).mockResolvedValue(undefined as any);

    const result = await procesarAnticipoDesdeComando(pendientes, 'ant-1', true, 'admin');

    expect(processSolicitudAnticipo).toHaveBeenCalledWith('ant-1', 'approve');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('APROBADO');
    expect(result.message).toContain('Juan Pérez');
  });

  it('rechaza correctamente y retorna ok:true', async () => {
    vi.mocked(processSolicitudAnticipo).mockResolvedValue(undefined as any);

    const result = await procesarAnticipoDesdeComando(pendientes, 'ant-2', false, 'admin');

    expect(processSolicitudAnticipo).toHaveBeenCalledWith('ant-2', 'reject');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('RECHAZADO');
  });

  it('retorna ok:false si el repositorio lanza error', async () => {
    vi.mocked(processSolicitudAnticipo).mockRejectedValue(new Error('DB error'));

    const result = await procesarAnticipoDesdeComando(pendientes, 'ant-1', true, 'admin');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('DB error');
  });
});
