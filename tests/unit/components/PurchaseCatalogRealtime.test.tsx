import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import NewPurchasePage from '@/app/purchases/new/page';

const realtime = vi.hoisted(() => ({ refresh: null as null | (() => Promise<unknown>) }));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({
  useRealtimeRefresh: (_resource: string, refresh: () => Promise<unknown>) => {
    realtime.refresh = refresh;
  }
}));
vi.mock('@/components/auth/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@/components/purchases/PurchaseForm', () => ({
  PurchaseForm: ({ catalog }: { catalog: { stock: number }[] }) => {
    const [draft, setDraft] = useState('');
    return (
      <>
        <input
          aria-label='Proveedor'
          value={draft}
          onChange={event => setDraft(event.target.value)}
        />
        <span>Stock: {catalog[0]?.stock}</span>
      </>
    );
  }
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('actualiza el catálogo sin desmontar el formulario en curso', async () => {
  let finish!: (response: Response) => void;
  const response = (stock: number) =>
    new Response(
      JSON.stringify({ success: true, data: [{ id: 'pres', producto_id: 'prod', stock }] })
    );
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response(1))
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
  render(<NewPurchasePage />);
  const input = await screen.findByLabelText('Proveedor');
  fireEvent.change(input, { target: { value: 'Distribuidora' } });
  let refresh!: Promise<unknown>;
  act(() => {
    refresh = realtime.refresh!();
  });
  expect(screen.getByLabelText('Proveedor')).toHaveValue('Distribuidora');
  await act(async () => {
    finish(response(2));
    await refresh;
  });
  expect(screen.getByText('Stock: 2')).toBeInTheDocument();
  expect(screen.getByLabelText('Proveedor')).toHaveValue('Distribuidora');
});
