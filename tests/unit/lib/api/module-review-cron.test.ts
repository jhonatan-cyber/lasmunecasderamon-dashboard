import { expect, it, vi } from 'vitest';
vi.mock('@/modules/inventario/reposicion/servicio', () => ({
  revisarReposicion: vi.fn().mockResolvedValue([])
}));
const mocks = vi.hoisted(() => ({ revisar: vi.fn() }));
vi.mock('@/lib/api/withRoute', () => ({ withPublicRoute: (handler: unknown) => handler }));
vi.mock('@/modules/operacion', () => ({ revisarTemporizadores: mocks.revisar }));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
vi.mock('@/lib/business/containerAlerts', () => ({ checkWarehouseContainerAlerts: vi.fn() }));
vi.mock('@/lib/business/cierreCajaRecordatorios', () => ({ reavisarCierresPendientes: vi.fn() }));
vi.mock('@/lib/business/timezoneService', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/business/timezoneService')>()),
  getNowInBusinessTimezone: () => '2026-10-16 21:00:00'
}));
it('el cron convierte la hora de Santiago al instante UTC antes de revisar temporizadores', async () => {
  const { GET } = await import('@/app/api/cron/check-timers/route');
  await GET(new Request('http://localhost/api/cron/check-timers') as any, {} as any);
  expect(mocks.revisar).toHaveBeenCalledWith(new Date('2026-10-17T00:00:00Z'));
});
