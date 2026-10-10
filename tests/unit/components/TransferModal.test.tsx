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
    // El toggle muestra los ml por shot efectivos (producto o global).
    fireEvent.click(screen.getByRole('button', { name: 'Shot · 50 ml' }));
    fireEvent.change(screen.getByLabelText('Precio shot (cliente y anfitriona)'), {
      target: { value: '3000' }
    });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Traspasar' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(postBody(request)).toEqual({
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 2,
      opciones_venta: [
        { tipo: 'botella', precio: 20000, comision: 0 },
        { tipo: 'shot', precio: 3000, comision: 0, precio_anfitriona: 3000 }
      ]
    });
  });

  it('edita los ml por shot del producto al traspasar', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    // Sin shot activo los inputs de ml permanecen ocultos.
    expect(screen.queryByLabelText('Ml shot cliente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ml shot anfitriona')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
    expect(screen.queryByLabelText('Ml shot cliente')).not.toBeInTheDocument();
    // Al activar el shot aparecen el precio único y los dos inputs de ml.
    fireEvent.click(screen.getByRole('button', { name: 'Shot · 50 ml' }));
    expect(screen.getByLabelText('Ml shot cliente')).toHaveValue('');
    expect(screen.getByLabelText('Ml shot anfitriona')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Ml shot cliente'), { target: { value: '75' } });
    // El label del tipo de venta refleja el valor editado al instante.
    expect(screen.getByRole('button', { name: 'Shot · 75 ml' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ml shot anfitriona'), { target: { value: '40' } });
    expect(screen.getByRole('button', { name: 'Shot · 75 ml · Anf 40 ml' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Precio shot (cliente y anfitriona)'), {
      target: { value: '3000' }
    });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Traspasar' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    const putCall = request.mock.calls.find((args: any[]) => args[1]?.method === 'PUT');
    expect(putCall![0]).toBe('/api/products/prod-1');
    expect(JSON.parse(putCall![1].body)).toEqual({ ml_shot: 75, ml_shot_anfitriona: 40 });
    expect(postBody(request)).toEqual({
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 2,
      opciones_venta: [
        { tipo: 'botella', precio: 20000, comision: 0 },
        { tipo: 'shot', precio: 3000, comision: 0, precio_anfitriona: 3000 }
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

  it('al activar el shot pide un precio único y ml para cliente y anfitriona', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
    // Sin shot activo no se piden ni el precio ni los ml del shot.
    expect(screen.queryByLabelText('Precio shot (cliente y anfitriona)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Shot · 50 ml' }));
    expect(screen.getByLabelText('Precio shot (cliente y anfitriona)')).toBeInTheDocument();
    expect(screen.getByLabelText('Ml shot cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Ml shot anfitriona')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Precio shot (cliente y anfitriona)'), {
      target: { value: '3000' }
    });
    fireEvent.change(screen.getByLabelText('Ml shot cliente'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Ml shot anfitriona'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Traspasar' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    // Precio único para ambas audiencias; ml distintos por audiencia.
    expect(postBody(request)).toEqual({
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 1,
      opciones_venta: [
        { tipo: 'botella', precio: 20000, comision: 0 },
        { tipo: 'shot', precio: 3000, comision: 0, precio_anfitriona: 3000 }
      ]
    });
    const putCall = request.mock.calls.find((args: any[]) => args[1]?.method === 'PUT');
    expect(JSON.parse(putCall![1].body)).toEqual({ ml_shot: 50, ml_shot_anfitriona: 30 });
  });

  it('sin ml de anfitriona el shot usa el ml de cliente', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
    fireEvent.click(screen.getByRole('button', { name: 'Shot · 50 ml' }));
    fireEvent.change(screen.getByLabelText('Precio shot (cliente y anfitriona)'), {
      target: { value: '3000' }
    });
    fireEvent.change(screen.getByLabelText('Ml shot cliente'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Traspasar' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    const shot = postBody(request).opciones_venta.find((o: any) => o.tipo === 'shot');
    expect(shot).toEqual({ tipo: 'shot', precio: 3000, comision: 0, precio_anfitriona: 3000 });
    const putCall = request.mock.calls.find((args: any[]) => args[1]?.method === 'PUT');
    expect(JSON.parse(putCall![1].body)).toEqual({ ml_shot: 50, ml_shot_anfitriona: null });
  });

  it('unifica el precio al traspasar una configuración con precios antiguos distintos', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    const conAnfitriona: BarStockItem = {
      ...item,
      opciones_venta: [
        { tipo: 'botella', precio: 20000, comision: 0 },
        { tipo: 'shot', precio: 3000, comision: 0, precio_anfitriona: 2000 }
      ]
    };
    render(<TransferModal open item={conAnfitriona} onOpenChange={vi.fn()} onDone={onDone} />);
    expect(screen.getByText('$3.000 · Cliente y anfitriona')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Traspasar' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(postBody(request).opciones_venta.find((option: any) => option.tipo === 'shot')).toEqual({
      tipo: 'shot',
      precio: 3000,
      comision: 0,
      precio_anfitriona: 3000
    });
  });
});
