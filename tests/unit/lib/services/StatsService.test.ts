import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDashboardAlerts: vi.fn(),
  getDashboardPendingItems: vi.fn(),
  getDashboardInsights: vi.fn(),
  getRecentActivity: vi.fn(),
  getHabitacionesStats: vi.fn(),
  getCajaGeneralStats: vi.fn(),
  getLoggedUsers: vi.fn(),
  getSalesByMonth: vi.fn(),
  getSalesByWeek: vi.fn(),
  getDashboardComposite: vi.fn(),
  getUserDashboardSummary: vi.fn()
}));

vi.mock('@/modules/reportes/dashboard/consultas', () => ({
  StatsQueries: mocks
}));

import { StatsService } from '@/modules/reportes/dashboard/servicio';
import { StatsRepository } from '@/modules/reportes/dashboard/repositorio';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StatsService.getDashboardAlerts', () => {
  it('delega en StatsRepository/StatsQueries', async () => {
    const alerts = [{ type: 'caja', message: 'Caja abierta 2h' }];
    mocks.getDashboardAlerts.mockResolvedValue(alerts);

    const result = await StatsService.getDashboardAlerts();

    expect(mocks.getDashboardAlerts).toHaveBeenCalledOnce();
    expect(result).toEqual(alerts);
  });
});

describe('StatsService.getDashboardPendingItems', () => {
  it('retorna items pendientes del repositorio', async () => {
    const pending = { anticipos: 2, servicios: 1 };
    mocks.getDashboardPendingItems.mockResolvedValue(pending);

    await expect(StatsService.getDashboardPendingItems()).resolves.toEqual(pending);
  });
});

describe('StatsService.getDashboardInsights', () => {
  it('delega insights', async () => {
    mocks.getDashboardInsights.mockResolvedValue({ tendencia: 'up' });

    await expect(StatsService.getDashboardInsights()).resolves.toEqual({ tendencia: 'up' });
  });
});

describe('StatsService.getRecentActivity', () => {
  it('usa limit por defecto 8', async () => {
    mocks.getRecentActivity.mockResolvedValue([]);

    await StatsService.getRecentActivity();

    expect(mocks.getRecentActivity).toHaveBeenCalledWith(8);
  });

  it('respeta limit personalizado', async () => {
    mocks.getRecentActivity.mockResolvedValue([]);

    await StatsService.getRecentActivity(20);

    expect(mocks.getRecentActivity).toHaveBeenCalledWith(20);
  });
});

describe('StatsService.getHabitacionesStats', () => {
  it('pasa cajaId al repositorio', async () => {
    const stats = { ocupadas: 3, total: 10 };
    mocks.getHabitacionesStats.mockResolvedValue(stats);

    const result = await StatsService.getHabitacionesStats('caja-1');

    expect(mocks.getHabitacionesStats).toHaveBeenCalledWith('caja-1');
    expect(result).toEqual(stats);
  });
});

describe('StatsService.getCajaGeneralStats', () => {
  it('retorna stats de caja', async () => {
    const caja = { ventas: 500000, efectivo: 300000 };
    mocks.getCajaGeneralStats.mockResolvedValue(caja);

    await expect(StatsService.getCajaGeneralStats()).resolves.toEqual(caja);
  });
});

describe('StatsService.getLoggedUsers', () => {
  it('retorna usuarios con sesión', async () => {
    const users = [{ id: 1, nick: 'admin' }];
    mocks.getLoggedUsers.mockResolvedValue(users);

    await expect(StatsService.getLoggedUsers()).resolves.toEqual(users);
  });
});

describe('StatsService.getSalesByMonth', () => {
  it('usa offset 0 por defecto', async () => {
    mocks.getSalesByMonth.mockResolvedValue([]);

    await StatsService.getSalesByMonth();

    expect(mocks.getSalesByMonth).toHaveBeenCalledWith(0);
  });

  it('respeta offset de mes anterior', async () => {
    mocks.getSalesByMonth.mockResolvedValue([]);

    await StatsService.getSalesByMonth(-1);

    expect(mocks.getSalesByMonth).toHaveBeenCalledWith(-1);
  });
});

describe('StatsService.getSalesByWeek', () => {
  it('usa offset 0 por defecto', async () => {
    mocks.getSalesByWeek.mockResolvedValue([]);

    await StatsService.getSalesByWeek();

    expect(mocks.getSalesByWeek).toHaveBeenCalledWith(0);
  });

  it('respeta offset de semana', async () => {
    mocks.getSalesByWeek.mockResolvedValue([]);

    await StatsService.getSalesByWeek(2);

    expect(mocks.getSalesByWeek).toHaveBeenCalledWith(2);
  });
});

describe('StatsService.getDashboardComposite', () => {
  it('retorna el composite completo', async () => {
    const composite = { alerts: [], pending: {}, insights: {} };
    mocks.getDashboardComposite.mockResolvedValue(composite);

    await expect(StatsService.getDashboardComposite()).resolves.toEqual(composite);
  });
});

describe('StatsService.getUserDashboardSummary', () => {
  it('pasa userId y role', async () => {
    const summary = { ventas: 10, propinas: 5 };
    mocks.getUserDashboardSummary.mockResolvedValue(summary);

    const result = await StatsService.getUserDashboardSummary('user-1', 'anfitriona');

    expect(mocks.getUserDashboardSummary).toHaveBeenCalledWith('user-1', 'anfitriona');
    expect(result).toEqual(summary);
  });
});

describe('StatsService ↔ StatsRepository capas', () => {
  it('StatsService y StatsRepository exponen el mismo conjunto de métodos', () => {
    const serviceMethods = Object.getOwnPropertyNames(StatsService).filter(
      m => typeof (StatsService as any)[m] === 'function'
    );
    const repoMethods = Object.getOwnPropertyNames(StatsRepository).filter(
      m => typeof (StatsRepository as any)[m] === 'function'
    );

    for (const m of serviceMethods) {
      expect(repoMethods).toContain(m);
    }
  });

  it('propaga errores de StatsQueries sin transformar', async () => {
    mocks.getDashboardAlerts.mockRejectedValue(new Error('DB caída'));

    await expect(StatsService.getDashboardAlerts()).rejects.toThrow('DB caída');
  });
});
