import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { SolicitudesCoversPanel } from '@/components/bar/SolicitudesCoversPanel';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const solicitud = {
  id: 'sol-1',
  cliente_nombre: 'Mesa 1',
  solicitado_por_nick: 'anita',
  unidades: [
    { presentacion_id: 'p-whisky', tipo_entrega: 'corte', acompanamientos: null },
    { presentacion_id: 'p-whisky', tipo_entrega: 'corte', acompanamientos: null }
  ],
  monto_total: 4000,
  estado: 'pendiente',
  fecha_solicitud: '2026-11-18 22:10:00'
};

function stubApi(solicitudes: unknown[], entrega = { entradas: 2, productos: 2 }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
    if (url.startsWith('/api/tickets/cover-solicitudes?'))
      return { ok: true, json: async () => ({ success: true, data: solicitudes }) };
    if (url === '/api/products/for-sale')
      return ok([
        { presentacion_id: 'p-whisky', producto_nombre: 'Whisky', presentacion_nombre: '750 ml' }
      ]);
    if (url.endsWith('/approve') && init?.method === 'PATCH') return ok(entrega);
    if (url.endsWith('/reject') && init?.method === 'PATCH')
      return { ok: true, json: async () => ({ success: true }) };
    throw new Error(`URL inesperada: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('SolicitudesCoversPanel', () => {
  it('muestra la solicitud con el nombre del producto y quién la pidió', async () => {
    stubApi([solicitud]);
    render(<SolicitudesCoversPanel />);

    expect(await screen.findByText('Mesa 1')).toBeInTheDocument();
    expect(screen.getByText(/Solicitó anita/)).toBeInTheDocument();
    const lineas = screen.getAllByRole('listitem');
    expect(lineas.some(item => item.textContent?.includes('2× Whisky · 750 ml · Corte'))).toBe(
      true
    );
  });

  it('aprueba la solicitud, avisa cuántos covers se entregaron y recarga la cola', async () => {
    const fetchMock = stubApi([solicitud]);
    const onProcesada = vi.fn();
    render(<SolicitudesCoversPanel onProcesada={onProcesada} />);

    fireEvent.click(await screen.findByRole('button', { name: /Aprobar entrega de Mesa 1/ }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('2 covers entregados', { description: 'Mesa 1' })
    );
    expect(onProcesada).toHaveBeenCalled();
    const aprobacion = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/cover-solicitudes/sol-1/approve')
    );
    expect(aprobacion?.[1]?.method).toBe('PATCH');
  });

  it('exige el motivo y lo envía al rechazar', async () => {
    const fetchMock = stubApi([solicitud]);
    render(<SolicitudesCoversPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /Rechazar solicitud de Mesa 1/ }));
    const confirmar = screen.getByRole('button', { name: 'Rechazar solicitud' });
    expect(confirmar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), {
      target: { value: 'Stock insuficiente' }
    });
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Solicitud rechazada', { description: 'Mesa 1' })
    );
    const rechazo = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/cover-solicitudes/sol-1/reject')
    );
    expect(JSON.parse(String(rechazo?.[1]?.body))).toEqual({ motivo: 'Stock insuficiente' });
  });

  it('avisa cuando no hay solicitudes pendientes', async () => {
    stubApi([]);
    render(<SolicitudesCoversPanel />);
    expect(await screen.findByText('No hay covers por autorizar.')).toBeInTheDocument();
  });
});
