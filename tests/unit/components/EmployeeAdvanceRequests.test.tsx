import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmployeeAdvanceRequests } from '@/components/advances/EmployeeAdvanceRequests';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('rechaza un monto superior al saldo y envía una solicitud propia válida', async () => {
  let requested = false;
  const onRequested = vi.fn();
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      requested = true;
      return Response.json({ success: true });
    }
    return Response.json({
      success: true,
      data: url.endsWith('/maximo')
        ? { monto_maximo: 10000, tiene_solicitud_pendiente: requested }
        : []
    });
  });
  vi.stubGlobal('fetch', fetcher);
  render(<EmployeeAdvanceRequests onRequested={onRequested} />);
  const button = screen.getByRole('button', { name: 'Solicitar anticipo' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '15000' } });
  fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Transporte' } });
  fireEvent.submit(button.closest('form')!);
  expect(fetcher.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '8000' } });
  fireEvent.submit(button.closest('form')!);
  await waitFor(() => expect(onRequested).toHaveBeenCalledOnce());
  const post = fetcher.mock.calls.find(([, options]) => options?.method === 'POST');
  expect(JSON.parse(post![1]!.body as string)).toEqual({ monto: 8000, motivo: 'Transporte' });
  expect(button).toBeDisabled();
});

it('no permite enviar otra solicitud mientras espera aprobación', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      Response.json({
        success: true,
        data: url.endsWith('/maximo')
          ? { monto_maximo: 10000, tiene_solicitud_pendiente: true }
          : []
      })
    )
  );
  render(<EmployeeAdvanceRequests onRequested={vi.fn()} />);
  await screen.findByText('Ya tienes una solicitud pendiente de aprobación.');
  expect(screen.getByRole('button', { name: 'Solicitar anticipo' })).toBeDisabled();
});
