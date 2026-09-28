import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import db, { query, withTransaction } from '@/lib/database/db';
import { StatsRepository } from '@/lib/repositories/StatsRepository';
import { TimerRepository } from '@/lib/repositories/TimerRepository';
import { CalendarRepository } from '@/lib/repositories/CalendarRepository';
import { ReportRepository } from '@/lib/repositories/ReportRepository';
import { PayrollRepository } from '@/lib/repositories/PayrollRepository';
import { EventRepository } from '@/lib/repositories/EventRepository';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';
import { OrderRepository } from '@/lib/repositories/OrderRepository';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { TipRepository } from '@/lib/repositories/TipRepository';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';
import { QueryLogRepository } from '@/lib/repositories/QueryLogRepository';
import { VentasStatsRepository } from '@/lib/repositories/VentasStatsRepository';
import * as services from '@/lib/repositories/service/ServiceQueries';
import * as attendance from '@/lib/repositories/attendance/AttendanceQueries';
import * as anticipos from '@/lib/repositories/anticipo/AnticipoQueries';
import { getAllGratificaciones } from '@/lib/repositories/gratificacion/GratificacionQueries';
import { getAnticipoBalances } from '@/lib/business/anticiposUtils';
import { prepareQuery } from '@/lib/database/postgres.cjs';

let userId: string, saleId: string, cajaId: string;
beforeAll(async () => {
  userId = (await query('SELECT id_usuario FROM usuarios LIMIT 1'))[0].id_usuario;
  const sale = (await query('SELECT id_venta, caja_id FROM ventas LIMIT 1'))[0];
  saleId = sale?.id_venta || 'missing';
  cajaId = sale?.caja_id || 'missing';
});
afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

const reads: [string, () => Promise<unknown>][] = [
  ['dashboard', () => StatsRepository.getDashboardComposite()],
  ['insights', () => StatsRepository.getDashboardInsights()],
  ['alerts', () => StatsRepository.getDashboardAlerts()],
  ['pending', () => StatsRepository.getDashboardPendingItems()],
  ['activity', () => StatsRepository.getRecentActivity()],
  ['months', () => StatsRepository.getSalesByMonth()],
  ['weeks', () => StatsRepository.getSalesByWeek()],
  ['rooms stats', () => StatsRepository.getHabitacionesStats(cajaId)],
  ['user dashboard', () => StatsRepository.getUserDashboardSummary(userId, 'admin')],
  ['timers', () => TimerRepository.getActive()],
  ['calendar services', () => CalendarRepository.getData('2020-01-01', '2030-12-31', 'servicios')],
  ['calendar sales', () => CalendarRepository.getData('2020-01-01', '2030-12-31', 'ventas')],
  ['payroll', () => PayrollRepository.getSummary()],
  ['event stats', () => EventRepository.getStats(userId)],
  ['events', () => EventRepository.getUserEvents(userId)],
  ['event sale detail', () => EventRepository.getEventDetail(saleId, 'venta')],
  ['sales', () => SaleRepository.getAll({})],
  ['sale detail', () => SaleRepository.getById(saleId)],
  ['services', () => services.getAllServicios({})],
  ['user services', () => services.getServiciosByUser(userId)],
  ['service detail', () => services.getServicioById('missing')],
  ['cash summary', () => CashRegisterRepository.summary()],
  ['cash registers', () => CashRegisterRepository.getAll()],
  ['cash detail', () => CashRegisterRepository.getById(cajaId)],
  ['service requests', () => ServiceRequestRepository.getAll('pendiente')],
  ['pending count', () => ServiceRequestRepository.getPendingCount()],
  ['pending requests', () => ServiceRequestRepository.getPendingServiceRequests()],
  ['clients', () => ClientRepository.getAll({ search: 'a' })],
  ['users', () => UserRepository.getAll({})],
  ['tips', () => TipRepository.getSummary(true, userId, false)],
  ['tip details', () => TipRepository.getDetails(userId)],
  ['commissions', () => CommissionRepository.summary()],
  ['commission details', () => CommissionRepository.getDetails(userId)],
  ['query logs', () => QueryLogRepository.getRecent()],
  ['query stats', () => QueryLogRepository.getStats()],
  ['bar sales', () => VentasStatsRepository.getVentasBarras(cajaId)],
  ['champagne sales', () => VentasStatsRepository.getVentasChampagne(cajaId)],
  ['hostess sales', () => VentasStatsRepository.getVentasTragosChicas(cajaId)],
  ['attendance summary', () => attendance.getAttendanceSummary()],
  ['attendance stats', () => attendance.getAttendanceStats()],
  ['attendance dates', () => attendance.getAttendanceByDates(userId, ['2026-09-19', '2026-09-20'])],
  ['anticipos', () => anticipos.getAllAnticipos({})],
  ['anticipo dates', () => anticipos.getAnticiposByDates(userId, ['2026-09-19'])],
  ['anticipo balance', () => getAnticipoBalances(userId)],
  ['gratificaciones', () => getAllGratificaciones(userId)],
  ['gratificaciones (unión solicitante)', () => getAllGratificaciones(userId, userId)]
];
describe('Actual repositories on PostgreSQL', () => {
  for (const [name, read] of reads)
    it(name, async () => {
      await read();
    });
  for (const period of [
    'today',
    'yesterday',
    'week',
    'month',
    'current_month',
    'last_month',
    'current_year',
    'last_year',
    'custom'
  ]) {
    for (const name of [
      'getSalesReport',
      'getCommissionsReport',
      'getCashRegisterReport'
    ] as const) {
      it(`${name}: ${period}`, async () => {
        await (
          ReportRepository[name] as (period: string, start: string, end: string) => Promise<unknown>
        )(period, '2026-01-01', '2026-12-31');
      });
    }
  }
});

it('preserves numeric, date, timestamp and camelCase API values', async () => {
  const [row] = await query(`SELECT 15.5::numeric AS amount, 2::bigint AS count,
    DATE '2026-09-19' AS date, TIMESTAMP '2026-09-19 20:30:00' AS "startTime"`);
  expect(row).toEqual({
    amount: 15.5,
    count: 2,
    date: '2026-09-19',
    startTime: '2026-09-19 20:30:00'
  });
});
it('binds lists, empty lists, quotes and comments safely', async () => {
  expect(await query('SELECT id_usuario FROM usuarios WHERE id_usuario IN (?)', [[]])).toEqual([]);
  expect(
    await query('SELECT id_usuario FROM usuarios WHERE id_usuario IN (?)', [[userId]])
  ).toEqual([{ id_usuario: userId }]);
  expect(prepareQuery("SELECT '?' AS literal, ? AS value /* ? */ -- ?\n", [12]).values).toEqual([
    12
  ]);
  expect(() => prepareQuery('SELECT ?', [])).toThrow('Missing SQL parameter');
});
it('rolls back all writes when a transaction fails', async () => {
  const id = crypto.randomUUID();
  await expect(
    withTransaction(async trx => {
      await trx(
        'INSERT INTO roles (id_rol, nombre, descripcion, estado, fecha_crea) VALUES (?, ?, ?, 1, now())',
        [id, 'PG rollback', 'test']
      );
      await trx('SELECT 1 / 0');
    })
  ).rejects.toThrow();
  expect(await query('SELECT id_rol FROM roles WHERE id_rol = ?', [id])).toEqual([]);
});
