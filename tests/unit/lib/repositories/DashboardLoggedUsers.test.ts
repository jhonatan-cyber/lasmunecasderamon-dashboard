import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query }));
vi.mock('@/modules/operacion', () => ({
  TimerService: {},
  ServiceRequestService: {},
  RoomService: {},
  OrderService: {}
}));
vi.mock('@/modules/reportes/dashboard/infraestructura', () => ({
  buildDashboardInsights: vi.fn(),
  buildCajaStatsResult: vi.fn()
}));
import { StatsQueries } from '@/modules/reportes/dashboard/consultas';

beforeEach(() => vi.clearAllMocks());
describe('Personal en local del dashboard', () => {
  it('excluye usuarios sin sesión local activa y usuarios deshabilitados', async () => {
    const roles = ['anfitriona', 'garzon', 'cajero', 'barman'].map(nombre => ({
      id_rol: nombre,
      nombre
    }));
    mocks.query.mockResolvedValueOnce(roles).mockResolvedValueOnce([
      { id_usuario: 'ana', nick: 'Ana', rol_id: 'anfitriona', estado: 1, logueado_en_local: 1 },
      { id_usuario: 'lola', nick: 'Lola', rol_id: 'anfitriona', estado: 1, logueado_en_local: 0 },
      { id_usuario: 'lizi', nick: 'Lizi', rol_id: 'anfitriona', estado: 0, logueado_en_local: 1 },
      { id_usuario: 'pepe', nick: 'Pepe', rol_id: 'garzon', estado: 1, logueado_en_local: 0 },
      { id_usuario: 'caja', nick: 'Caja', rol_id: 'cajero', estado: 1, logueado_en_local: 1 },
      { id_usuario: 'bar', nick: 'Bar', rol_id: 'barman', estado: 1, logueado_en_local: 1 }
    ]);
    const result = await StatsQueries.getLoggedUsers();
    expect(result.anfitrionas).toMatchObject({
      logueadas: 1,
      usuarios: [{ id_usuario: 'ana', nick: 'Ana' }]
    });
    expect(result.garzones).toMatchObject({ logueadas: 0, usuarios: [] });
    expect(result.cajeros).toEqual({
      logueadas: 1,
      total: 1,
      porcentaje: 100,
      usuarios: [{ id_usuario: 'caja', nick: 'Caja' }]
    });
    expect(result.barman).toEqual({
      logueadas: 1,
      total: 1,
      porcentaje: 100,
      usuarios: [{ id_usuario: 'bar', nick: 'Bar' }]
    });
    const sql = mocks.query.mock.calls[1][0];
    expect(sql).toContain('CASE WHEN EXISTS');
    expect(sql).toContain('l.estado = 1 AND l.en_local = 1');
    expect(sql).not.toContain('JOIN logins');
  });
});
