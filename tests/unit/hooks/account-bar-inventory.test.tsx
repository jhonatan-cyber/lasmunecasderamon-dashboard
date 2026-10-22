import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { accountCartKey } from '@/lib/sales/accountCartKey';

const mocks = vi.hoisted(() => ({ createCuenta: vi.fn() }));
vi.mock('@/hooks/cash-register/useCuentas', () => ({
  useCuentas: () => ({ createCuenta: mocks.createCuenta })
}));
vi.mock('@/hooks/sales/useChampagneRule', () => ({
  useChampagneRule: () => ({
    isChampagneProduct: () => false,
    hasChampagneProducts: false,
    maxChampagnePrice: 0,
    maxAnfitrionas: 1
  })
}));
vi.mock('@/hooks/shared/useSingleFlight', () => ({
  useSingleFlight: (handler: unknown) => handler
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
import { useAccountForm } from '@/hooks/accounts/useAccountForm';
import { useProductCart } from '@/hooks/accounts/useProductCart';

const bottle = {
  id: 'presentacion-750',
  producto_id: 'producto',
  presentacion_id: 'presentacion-750',
  nombre: 'Bebida 750 ml',
  precio: 5000,
  cantidad: 2,
  comision: 200,
  commission: 999,
  tipo_venta: 'botella' as const,
  selectedHostesses: ['hostess']
};
beforeEach(() => {
  mocks.createCuenta.mockReset().mockResolvedValue({ id: 'cuenta' });
});

it('mantiene separados formatos, precios y bebidas acompañantes', () => {
  expect(accountCartKey(bottle)).not.toBe(accountCartKey({ ...bottle, tipo_venta: 'shot' }));
  expect(accountCartKey(bottle)).not.toBe(accountCartKey({ ...bottle, presentacion_id: 'otra' }));
  expect(accountCartKey(bottle)).not.toBe(accountCartKey({ ...bottle, precio: 6000 }));
  expect(accountCartKey(bottle)).not.toBe(
    accountCartKey({
      ...bottle,
      acompanamiento_botella: { presentacion_id: 'bebida', unidades: 2 }
    })
  );
});
it('crea cuentas con precio y cantidad elegidos en el bar, conservando la presentación', async () => {
  const { result } = renderHook(() => useAccountForm());
  act(() => {
    result.current.setSelectedCliente('cliente');
    result.current.handleAddProducto(bottle);
    result.current.handleAddProducto({
      ...bottle,
      id: 'presentacion-otra',
      presentacion_id: 'presentacion-otra',
      cantidad: 1,
      precio: 7000
    });
  });
  expect(result.current.productos).toHaveLength(2);
  expect(result.current.total).toBe(17000);
  expect(result.current.productos[0].comision).toBe(200);
  await act(async () => {
    await result.current.handleSubmit(
      [{ id_cliente: 'cliente', nombre: 'Prueba' }],
      [],
      vi.fn(),
      vi.fn()
    );
  });
  expect(mocks.createCuenta).toHaveBeenCalledWith(
    expect.objectContaining({
      total: 17000,
      detalles: expect.arrayContaining([
        expect.objectContaining({
          producto_id: 'producto',
          presentacion_id: 'presentacion-750',
          tipo_venta: 'botella',
          cantidad: 2,
          precio: 5000,
          hostesses: ['hostess']
        })
      ])
    })
  );
});
it('el carrito de agregar a una cuenta conserva formatos y consumo al sumar cantidades', () => {
  const { result } = renderHook(() => useProductCart());
  const mixed = { ...bottle, acompanamiento_botella: { presentacion_id: 'bebida', unidades: 2 } };
  act(() => result.current.agregarProducto(mixed));
  act(() => result.current.agregarProducto(mixed));
  act(() => result.current.agregarProducto({ ...bottle, tipo_venta: 'shot', cantidad: 1 }));
  expect(result.current.productos).toHaveLength(2);
  expect(result.current.productos[0]).toMatchObject({
    producto_id: 'producto',
    id_producto: 'producto',
    presentacion_id: 'presentacion-750',
    cantidad: 4,
    precio: 5000,
    comision: 200,
    acompanamiento_botella: { presentacion_id: 'bebida', unidades: 2 }
  });
  expect(result.current.total).toBe(25000);
});
