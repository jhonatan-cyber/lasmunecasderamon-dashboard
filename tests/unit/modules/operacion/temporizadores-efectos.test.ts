import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  limpiar: vi.fn(),
  avisar: vi.fn(),
  falloCommit: false,
  orden: [] as string[]
}));
vi.mock('@/lib/database/db', () => ({
  withTransaction: async (operacion: (trx: unknown) => Promise<unknown>) => {
    const resultado = await operacion(vi.fn());
    if (mocks.falloCommit) throw new Error('commit fallido');
    mocks.orden.push('commit');
    return resultado;
  }
}));
vi.mock('@/modules/operacion/temporizadores/consultas', () => ({
  TimerRepository: { limpiarEnUnidad: mocks.limpiar }
}));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-05 12:00:00'
}));
vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: (...args: unknown[]) => {
    mocks.orden.push('aviso');
    mocks.avisar(...args);
  }
}));
import { TimerService } from '@/modules/operacion/temporizadores/fachada';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.orden.length = 0;
  mocks.falloCommit = false;
  mocks.limpiar.mockResolvedValue({ changed: true, cuentas: ['cuenta-1'] });
});

describe('efectos de limpieza de temporizadores', () => {
  it('entrega contexto opaco y avisa después del commit', async () => {
    await TimerService.runAutoCleanup();
    expect(mocks.limpiar).toHaveBeenCalledWith({ id: expect.any(String) }, '2026-10-05 12:00:00');
    expect(mocks.orden).toEqual(['commit', 'aviso', 'aviso']);
    expect(mocks.avisar).toHaveBeenCalledWith(
      'timer_stopped',
      expect.objectContaining({ servicioId: 'cuenta-1' })
    );
  });
  it('un fallo del commit impide publicar estados que no se confirmaron', async () => {
    mocks.falloCommit = true;
    await expect(TimerService.runAutoCleanup()).rejects.toThrow('commit fallido');
    expect(mocks.avisar).not.toHaveBeenCalled();
  });
});
