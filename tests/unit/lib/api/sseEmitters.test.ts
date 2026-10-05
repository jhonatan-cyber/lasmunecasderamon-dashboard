// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const sse = vi.hoisted(() => ({ broadcast: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-1',
  withTransaction: vi.fn(async (fn: any) => fn(db.queryMock))
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: sse.broadcast,
  sseManager: { broadcast: sse.broadcast }
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));

vi.mock('@/lib/services/RoomManager', () => ({
  RoomManager: { resumeRoomLogic: vi.fn() }
}));

vi.mock('@/lib/repositories/CashRegisterRepository', () => ({
  CashRegisterRepository: { updateBalances: vi.fn() }
}));

vi.mock('@/lib/utils/logUtils', () => ({
  addVentaLog: vi.fn()
}));

import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { OrderRepository } from '@/lib/repositories/OrderRepository';

const VENTA = {
  id_venta: 'v-1',
  estado: 2,
  habitacion_id: null,
  cliente_id: null,
  caja_id: 'caja-1',
  pedido_id: null,
  metodo_pago: 'efectivo',
  total: 100,
  sub_total: 100,
  propina: 0,
  total_comision: 0,
  pagos_mixtos: null
};

const VENTA_MAPS = {
  id_venta: 'v-1',
  codigo: 'V-001',
  cliente_id: null,
  pedido_id: null,
  habitacion_id: null,
  metodo_pago: 'efectivo',
  metodo_pago_adicional: null,
  monto_prepago: 0,
  monto_adicional: 0,
  propina: 0,
  sub_total: 100,
  total: 100,
  total_comision: 0,
  tiempo: 0,
  caja_id: 'caja-1',
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
};

beforeEach(() => {
  vi.clearAllMocks();
  db.queryMock.mockReset();
  db.queryMock.mockResolvedValue([]);
});

describe('emisión de sale_cancelled', () => {
  it('al anular una venta (estado 0) se emite el evento con su monto y caja', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (
        sql.includes('FROM ventas') &&
        sql.includes('WHERE id_venta = ?') &&
        !sql.includes('GROUP BY')
      ) {
        return [VENTA];
      }
      if (
        sql.includes('SELECT id_detalle_venta, producto_id, cantidad, precio, sub_total, comision')
      ) {
        return [];
      }
      if (sql.includes('SELECT COALESCE(SUM(monto), 0) as total_prepago')) {
        return [{ total_prepago: 0 }];
      }
      if (sql.includes('FROM ventas') && sql.includes('GROUP BY')) {
        return [VENTA_MAPS];
      }
      return [];
    });

    await SaleRepository.updateStatus('v-1', 0, 'admin-1');

    // La emisión es async (setTimeout 0): se espera a que ocurra.
    await vi.waitFor(() => {
      expect(sse.broadcast).toHaveBeenCalledWith(
        'sale_cancelled',
        expect.objectContaining({ ventaId: 'v-1', cajaId: 'caja-1' })
      );
    });
  });

  it('cambiar a un estado que no es anulación no emite nada', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (
        sql.includes('FROM ventas') &&
        sql.includes('WHERE id_venta = ?') &&
        !sql.includes('GROUP BY')
      ) {
        return [VENTA];
      }
      if (sql.includes('FROM ventas') && sql.includes('GROUP BY')) {
        return [{ ...VENTA_MAPS, estado: 1 }];
      }
      return [];
    });

    await SaleRepository.updateStatus('v-1', 1, 'admin-1');
    await new Promise(resolve => setTimeout(resolve, 10));

    const tipos = sse.broadcast.mock.calls.map(call => call[0]);
    expect(tipos).not.toContain('sale_cancelled');
  });
});

describe('emisión de order_updated', () => {
  it('al cambiar el estado de un pedido se emite con su id y código', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM pedidos P')) {
        return [
          {
            id_pedido: 'p-1',
            cliente: 'Ana Perez',
            codigo: 'PED-9',
            garzon: 'Juan',
            nicks: 'ana',
            subtotal: 5000,
            total: 5000,
            propina: 0,
            estado: 2,
            fecha_crea: '2026-04-11 12:00:00'
          }
        ];
      }
      return [];
    });

    await OrderRepository.updateStatus('p-1', 2);

    expect(sse.broadcast).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({ orderId: 'p-1', estado: 2, codigo: 'PED-9' })
    );
  });

  it('si el pedido no existe, no emite', async () => {
    await OrderRepository.updateStatus('inexistente', 2);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(sse.broadcast).not.toHaveBeenCalled();
  });
});
