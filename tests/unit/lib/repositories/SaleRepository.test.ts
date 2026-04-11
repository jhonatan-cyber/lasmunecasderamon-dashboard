import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'mock-uuid',
  withTransaction: vi.fn(async (fn: any) => fn(repositoryHarness.queryMock)),
  query: repositoryHarness.queryMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00'
}));

import { SaleRepository } from '@/lib/repositories/SaleRepository';

describe('SaleRepository.processAnulacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normaliza aprobacion a confirmada y delega anulacion consistente', async () => {
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT venta_id FROM solicitudes_anulacion_ventas')) {
        return [{ venta_id: 'sale-1' }];
      }
      if (sql.includes('SELECT monto FROM solicitudes_anulacion_ventas')) {
        return [{ monto: 50 }];
      }
      if (
        sql.includes('FROM ventas') &&
        sql.includes('WHERE id_venta = ?') &&
        sql.includes('LIMIT 1')
      ) {
        return [
          {
            id_venta: 'sale-1',
            estado: 2,
            habitacion_id: null,
            cliente_id: null,
            caja_id: null,
            pedido_id: null,
            metodo_pago: 'efectivo',
            total: 100,
            sub_total: 100,
            propina: 0,
            total_comision: 0,
            pagos_mixtos: null
          }
        ];
      }
      if (sql.includes('SELECT id_detalle_venta, sub_total, comision FROM detalle_ventas')) {
        return [];
      }
      if (sql.includes('FROM comisiones c')) {
        return [];
      }
      if (sql.includes('SELECT id_propina, propina FROM propinas')) {
        return [];
      }
      if (sql.includes('FROM detalle_propinas dp')) {
        return [];
      }
      if (sql.includes('FROM ventas v') && sql.includes('GROUP BY v.id_venta')) {
        return [
          {
            id_venta: 'sale-1',
            codigo: 'V-001',
            cliente_id: null,
            pedido_id: null,
            habitacion_id: null,
            metodo_pago: 'efectivo',
            metodo_pago_adicional: null,
            monto_prepago: 0,
            monto_adicional: 0,
            propina: 0,
            sub_total: 0,
            total: 0,
            total_comision: 0,
            tiempo: 0,
            caja_id: null,
            created_by: 'admin-1',
            staff_nick: 'admin',
            estado: 0,
            fecha_crea: '2026-04-11 12:00:00',
            fecha_mod: '2026-04-11 12:00:00',
            cliente_nombre: null,
            habitacion_nombre: null,
            item_count: 0,
            anfitrionas_nicks: null,
            cajero_nick: 'admin',
            cajero_nombre: 'Admin',
            garzon_nombre: null,
            productos_detalle: null
          }
        ];
      }
      if (sql.includes('FROM detalle_ventas dv')) return [];
      if (sql.includes('FROM ventas_usuarios vu')) return [];
      return [];
    });

    await SaleRepository.processAnulacion('req-1', 'admin-1', 'confirmada');

    expect(repositoryHarness.queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE solicitudes_anulacion_ventas'),
      expect.arrayContaining(['confirmada', 'admin-1'])
    );
  });
});
