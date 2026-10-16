import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fecha: '2026-10-05T10:00:00Z',
  orden: [] as string[],
  falloCommit: false,
  marcar: vi.fn(),
  marcar5m: vi.fn(),
  avisado5m: false,
  cerrar: vi.fn(),
  avisar: vi.fn(),
  push: vi.fn(),
  pushRol: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({
  withTransaction: async (operacion: (trx: unknown) => Promise<unknown>) => {
    const resultado = await operacion(vi.fn());
    if (mocks.falloCommit) throw new Error('commit fallido');
    mocks.orden.push('commit');
    return resultado;
  }
}));
vi.mock('@/modules/operacion/temporizadores/repositorio', () => ({
  listarTemporizadoresActivos: async () => [
    {
      id: 'venta-1',
      type: 'venta',
      fecha_crea: mocks.fecha,
      tiempo: 60,
      created_by: 'usuario-1',
      room_name: 'Sala',
      push_notified_5m: mocks.avisado5m,
      push_notified_end: false
    }
  ],
  marcarAvisoFin: mocks.marcar,
  marcarAviso5m: mocks.marcar5m,
  cerrarTemporizador: mocks.cerrar,
  leerHabitacionTemporizador: async () => null
}));
vi.mock('@/modules/comunicaciones', () => ({
  sendPushNotification: mocks.push,
  sendPushByRole: mocks.pushRol
}));
vi.mock('@/modules/identidad', () => ({ actualizarDisponibilidad: vi.fn() }));
vi.mock('@/modules/operacion/facturacion/servicio', () => ({
  liberarHabitacionPorAnulacion: vi.fn()
}));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: mocks.avisar }));
import { revisarTemporizadores } from '@/modules/operacion/temporizadores/servicio';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.orden.length = 0;
  mocks.fecha = '2026-10-05T10:00:00Z';
  mocks.falloCommit = false;
  mocks.avisado5m = false;
  mocks.marcar.mockImplementation(async () => {
    mocks.orden.push('marca');
  });
  mocks.cerrar.mockImplementation(async () => {
    mocks.orden.push('cierre');
  });
  mocks.push.mockImplementation(async () => {
    mocks.orden.push('push');
  });
  mocks.pushRol.mockResolvedValue(undefined);
  mocks.avisar.mockImplementation(() => {
    mocks.orden.push('aviso');
  });
});

describe('efectos del cron de temporizadores', () => {
  it.each(['2026-10-07 12:00:00', '2026-10-07 12:00:00.123456'])(
    'conserva un servicio vigente con fecha local %s en un servidor UTC',
    async fecha => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
        mocks.fecha = fecha;
        expect(await revisarTemporizadores(new Date())).toEqual({ avisos5m: 0, cierres: 0 });
        expect(mocks.cerrar).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    }
  );
  it('marca y cierre comparten contexto y los avisos esperan al commit', async () => {
    expect(await revisarTemporizadores(new Date('2026-10-05T12:00:00Z'))).toEqual({
      avisos5m: 0,
      cierres: 1
    });
    const contexto = mocks.marcar.mock.calls[0][2];
    expect(contexto).toEqual({ id: expect.any(String) });
    expect(mocks.cerrar).toHaveBeenCalledWith('venta', 'venta-1', contexto);
    expect(mocks.orden.indexOf('commit')).toBeGreaterThan(mocks.orden.indexOf('cierre'));
    expect(mocks.orden.indexOf('push')).toBeGreaterThan(mocks.orden.indexOf('commit'));
    expect(mocks.orden.indexOf('aviso')).toBeGreaterThan(mocks.orden.indexOf('commit'));
  });
  it('no publica cierre ni push si falla el commit', async () => {
    mocks.falloCommit = true;
    await expect(revisarTemporizadores(new Date('2026-10-05T12:00:00Z'))).rejects.toThrow(
      'commit fallido'
    );
    expect(mocks.avisar).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.pushRol).not.toHaveBeenCalled();
  });
});

it('avisa aunque el cron pase con cuatro minutos restantes y no repite un aviso marcado', async () => {
  expect(await revisarTemporizadores(new Date('2026-10-05T10:56:00Z'))).toEqual({
    avisos5m: 1,
    cierres: 0
  });
  expect(mocks.marcar5m).toHaveBeenCalledWith('venta', 'venta-1');
  mocks.avisado5m = true;
  expect(await revisarTemporizadores(new Date('2026-10-05T10:57:00Z'))).toEqual({
    avisos5m: 0,
    cierres: 0
  });
  expect(mocks.marcar5m).toHaveBeenCalledTimes(1);
});
