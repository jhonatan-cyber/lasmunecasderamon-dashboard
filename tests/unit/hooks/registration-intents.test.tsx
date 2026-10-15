import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/hooks/caja/useCuentas', () => ({ useCuentas: () => ({ createCuenta: mocks.create }) }));
vi.mock('@/hooks/shared', () => ({
  useChampagneRule: () => ({
    isChampagneProduct: () => false,
    hasChampagneProducts: false,
    maxChampagnePrice: 0,
    maxAnfitrionas: 1
  })
}));
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
import { useAccountForm } from '@/hooks/cuentas/useAccountForm';
import { useSingleFlight } from '@/hooks/shared/useSingleFlight';
beforeEach(() => mocks.create.mockReset());
afterEach(cleanup);
it('bloquea cuentas simultaneas, conserva el codigo tras fallo y evita repetir una confirmada', async () => {
  let reject!: (error: Error) => void;
  mocks.create
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        })
    )
    .mockResolvedValue({ id: 'one' });
  const { result } = renderHook(() => useAccountForm());
  act(() => {
    result.current.setSelectedCliente('c1');
    result.current.setProductos([
      { id: 'pres', id_producto: 'prod', precio: 1000, cantidad: 1, subtotal: 1000, comision: 0 }
    ]);
  });
  const clients = [{ id_cliente: 'c1', nombre: 'Juan' }];
  const success = vi.fn();
  const submit = () => result.current.handleSubmit(clients, [], vi.fn(), success);
  let first!: Promise<void>;
  let duplicate!: Promise<void>;
  await act(async () => {
    first = submit();
    duplicate = submit();
  });
  expect(first).toBe(duplicate);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject(new Error('Respuesta perdida'));
    await first;
  });
  await act(submit);
  expect(mocks.create).toHaveBeenCalledTimes(2);
  expect(mocks.create.mock.calls[0][0].codigo).toBe(mocks.create.mock.calls[1][0].codigo);
  await act(submit);
  expect(mocks.create).toHaveBeenCalledTimes(2);
  expect(success).toHaveBeenCalledTimes(1);
  act(() => result.current.setProductos([]));
  act(() =>
    result.current.setProductos([
      { id: 'pres', id_producto: 'prod', precio: 1000, cantidad: 1, subtotal: 1000, comision: 0 }
    ])
  );
  await act(submit);
  expect(mocks.create).toHaveBeenCalledTimes(3);
  expect(mocks.create.mock.calls[2][0].codigo).not.toBe(mocks.create.mock.calls[1][0].codigo);
});
it('el bloqueo compartido se libera incluso al fallar antes de enviar', async () => {
  const operation = vi
    .fn()
    .mockRejectedValueOnce(new Error('validacion'))
    .mockResolvedValueOnce('ok');
  const { result } = renderHook(() => useSingleFlight(operation));
  const a = result.current();
  const b = result.current();
  expect(a).toBe(b);
  await expect(a).rejects.toThrow('validacion');
  await expect(result.current()).resolves.toBe('ok');
  expect(operation).toHaveBeenCalledTimes(2);
});
