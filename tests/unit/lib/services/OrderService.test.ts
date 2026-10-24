import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService, prepararVentaPedido } from '@/modules/operacion/pedidos/servicio';

vi.mock('@/modules/operacion/pedidos/repositorio', () => ({
  OrderRepository: {
    getAll: vi.fn(),
    getByUser: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    getDetail: vi.fn(),
    updateStatus: vi.fn(),
    paraVenta: vi.fn()
  }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { OrderRepository } from '@/modules/operacion/pedidos/repositorio';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OrderService.getAll', () => {
  it('calls repository with default limit', async () => {
    vi.mocked(OrderRepository.getAll).mockResolvedValue([]);
    await OrderService.getAll();
    expect(OrderRepository.getAll).toHaveBeenCalledWith(200);
  });

  it('calls repository with custom limit', async () => {
    vi.mocked(OrderRepository.getAll).mockResolvedValue([]);
    await OrderService.getAll(50);
    expect(OrderRepository.getAll).toHaveBeenCalledWith(50);
  });

  it('returns orders from repository', async () => {
    const orders = [{ id: '1', producto: 'test' }];
    vi.mocked(OrderRepository.getAll).mockResolvedValue(orders as any);
    const result = await OrderService.getAll();
    expect(result).toEqual(orders);
  });
});

describe('OrderService.getByUser', () => {
  it('calls repository with userId', async () => {
    vi.mocked(OrderRepository.getByUser).mockResolvedValue([]);
    await OrderService.getByUser('user-1');
    expect(OrderRepository.getByUser).toHaveBeenCalledWith('user-1');
  });
});

describe('OrderService.create', () => {
  it('creates order through the repository', async () => {
    const input = {
      codigo: 'ORD-001',
      meseroId: 'user-1',
      metodoPago: 'efectivo' as const,
      subtotal: 10000,
      total: 10000,
      detalles: [{ productoId: 'prod-1', precio: 5000, cantidad: 2, subtotal: 10000 }]
    };
    vi.mocked(OrderRepository.create).mockResolvedValue({ id: 'new-1' } as any);
    const result = await OrderService.create(input);
    expect(OrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'ORD-001', meseroId: 'user-1' })
    );
    expect(result).toMatchObject({ id: 'new-1' });
  });
});

describe('prepararVentaPedido', () => {
  it('compone el pago del cobro con lo que se vendió en el pedido', async () => {
    vi.mocked(OrderRepository.paraVenta).mockResolvedValue({
      pedido_id: 'pedido',
      cliente_id: 'cliente',
      metodo_pago: 'efectivo',
      propina: 1000,
      sub_total: 10000,
      total: 11000,
      usuarios: ['ana'],
      detalles: [{ producto_id: 'producto', precio: 10000, cantidad: 1, comision: 0 }]
    } as any);

    const venta = await prepararVentaPedido('pedido', 0, { id: 'tx' } as any, {
      metodo_pago: 'prepago',
      propina: 0,
      monto_prepago: 5000
    });

    expect(OrderRepository.paraVenta).toHaveBeenCalledWith('pedido', 0, { id: 'tx' });
    expect(venta).toMatchObject({
      metodo_pago: 'prepago',
      propina: 0,
      total: 10000,
      monto_prepago: 5000
    });
  });
});

describe('OrderService.delete', () => {
  it('calls repository with id', async () => {
    vi.mocked(OrderRepository.delete).mockResolvedValue(undefined);
    await OrderService.delete('order-1');
    expect(OrderRepository.delete).toHaveBeenCalledWith('order-1');
  });
});

describe('OrderService.getDetail', () => {
  it('calls repository with id', async () => {
    vi.mocked(OrderRepository.getDetail).mockResolvedValue({ id: 'order-1' } as any);
    const result = await OrderService.getDetail('order-1');
    expect(OrderRepository.getDetail).toHaveBeenCalledWith('order-1');
    expect(result).toMatchObject({ id: 'order-1' });
  });
});

describe('OrderService.updateStatus', () => {
  it('calls repository with id and estado', async () => {
    vi.mocked(OrderRepository.updateStatus).mockResolvedValue(null);
    await OrderService.updateStatus('order-1', 2);
    expect(OrderRepository.updateStatus).toHaveBeenCalledWith('order-1', 2);
  });
});
