import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransferModal, type BarStockItem } from '@/components/bar/TransferModal';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const item: BarStockItem = {
  id: 'pres-1',
  producto_id: 'prod-1',
  producto_nombre: 'Whisky',
  producto_codigo: 'W1',
  producto_foto: null,
  nombre: '750 ml',
  codigo_barras: null,
  precio_compra: 10000,
  precio_venta: 20000,
  comision: 0,
  foto: null,
  stock: 5,
  stock_bar: 2
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// El modal también pide /api/configurations (ml por shot), así que se busca el POST
// de la transferencia en vez de asumir que es la primera llamada.
const postBody = (request: any) => {
  const call = request.mock.calls.find((args: any[]) => args[1]?.method === 'POST');
  return JSON.parse(call![1].body);
};

describe('tipos de venta al transferir', () => {
  it('reutiliza la configuración guardada sin pedir precio manual', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    expect(screen.getByText('Configuración guardada')).toBeInTheDocument();
    expect(screen.queryByLabelText('Precio por botella')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Traspasar' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(postBody(request)).toEqual({
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 2,
      opciones_venta: [{ tipo: 'botella', precio: 20000, comision: 0 }]
    });
  });

  it('permite modificar precios tras ver la configuración guardada', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
    fireEvent.click(screen.getByRole('button', { name: 'Shot' }));
    fireEvent.change(screen.getByLabelText('Precio por shot'), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Traspasar' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(postBody(request)).toEqual({
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 2,
      opciones_venta: [
        { tipo: 'botella', precio: 20000, comision: 0 },
        { tipo: 'shot', precio: 3000, comision: 0 }
      ]
    });
  });

  it('pide precio manual solo cuando no hay configuración y exige al menos un tipo', () => {
    const sinConfig: BarStockItem = {
      ...item,
      precio_venta: 0,
      comision: 0,
      opciones_venta: undefined
    };
    render(<TransferModal open item={sinConfig} onOpenChange={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByLabelText('Precio por botella')).toBeInTheDocument();
    expect(screen.queryByText('Configuración guardada')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Botella' }));
    expect(screen.getByRole('button', { name: 'Traspasar' })).toBeDisabled();
  });
});
