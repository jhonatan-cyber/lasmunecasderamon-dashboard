import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '@/modules/operacion/pedidos/servicio';

vi.mock('@/modules/operacion/pedidos/repositorio', () => ({
  OrderRepository: {
    getAll: vi.fn(),
    getByUser: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    getDetail: vi.fn(),
    updateStatus: vi.fn()
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
