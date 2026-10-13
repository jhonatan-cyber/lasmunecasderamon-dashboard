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
  stock_bar: 2,
  max_anfitrionas: 0
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

it('actualiza la ficha al editar y al volver a la configuración guardada', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  );
  render(
    <TransferModal
      open
      item={{ ...item, comision: 5000 }}
      onOpenChange={vi.fn()}
      onDone={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText('Máximo de anfitrionas'), { target: { value: '3' } });
  expect(screen.getByText(/Config\. comisiones: máx\. 3 anf\./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
  fireEvent.change(screen.getByLabelText('Precio por botella'), { target: { value: '35000' } });
  expect(screen.queryByLabelText('Ml acompa\u00f1amiento cliente')).not.toBeInTheDocument();
  const summary = screen.getByLabelText('Resumen de configuración');
  expect(summary).toHaveTextContent('35.000');
  fireEvent.click(screen.getByLabelText('Bebida de la botella'));
  fireEvent.change(screen.getByLabelText('Unidades por botella'), { target: { value: '2' } });
  expect(summary).toHaveTextContent('2 unidades por botella');
  fireEvent.change(screen.getByLabelText('Comisión (opcional)'), { target: { value: '0' } });
  expect(screen.getByText(/Config\. comisiones: máx\. 0 anf\./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Usar configuración guardada' }));
  expect(summary).toHaveTextContent('20.000');
  expect(summary).not.toHaveTextContent('35.000');
});

it('guarda el máximo de anfitrionas del producto antes de transferir', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal('fetch', request);
  const done = vi.fn();
  render(
    <TransferModal open item={{ ...item, comision: 5000 }} onOpenChange={vi.fn()} onDone={done} />
  );
  fireEvent.change(screen.getByLabelText('Máximo de anfitrionas'), { target: { value: '3' } });
  await screen.findByLabelText('Precio con 3 anfitrionas');
  fireEvent.change(screen.getByLabelText('Precio con 3 anfitrionas'), {
    target: { value: '50000' }
  });
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  const update = request.mock.calls.find(
    (args: any[]) => args[0] === '/api/products/prod-1' && args[1]?.method === 'PUT'
  );
  expect(JSON.parse(update![1].body)).toEqual({ max_anfitrionas: 3 });
  const tiers = request.mock.calls.find(
    (args: any[]) => args[0] === '/api/products/prod-1/tiers' && args[1]?.method === 'PUT'
  );
  expect(JSON.parse(tiers![1].body).tiers).toContainEqual({
    anfitrionas: 3,
    precio: 50000,
    comision: 5000
  });
});

it.each([0, 5000])('usa el máximo por defecto según la comisión: %s', async commission => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal('fetch', request);
  const done = vi.fn();
  render(
    <TransferModal
      open
      item={{ ...item, comision: commission, max_anfitrionas: null }}
      onOpenChange={vi.fn()}
      onDone={done}
    />
  );
  if (commission === 0)
    expect(screen.queryByLabelText('Máximo de anfitrionas')).not.toBeInTheDocument();
  else expect(screen.getByLabelText('Máximo de anfitrionas')).toHaveValue(null);
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  const update = request.mock.calls.find(
    (args: any[]) => args[0] === '/api/products/prod-1' && args[1]?.method === 'PUT'
  );
  expect(JSON.parse(update![1].body).max_anfitrionas).toBe(commission > 0 ? 1 : 0);
});

it('detiene la transferencia si no se puede guardar el máximo de anfitrionas', async () => {
  const request = vi.fn(async (_url: string, options?: RequestInit) => ({
    ok: options?.method !== 'PUT',
    json: async () => ({ success: options?.method !== 'PUT' })
  }));
  vi.stubGlobal('fetch', request);
  render(
    <TransferModal
      open
      item={{ ...item, comision: 5000 }}
      onOpenChange={vi.fn()}
      onDone={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText('Máximo de anfitrionas'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
  await waitFor(() =>
    expect(request.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(true)
  );
  await waitFor(() => expect(screen.getByRole('button', { name: 'Transferir' })).toBeEnabled());
  expect(request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});

it('agrega y guarda varios precios de anfitriona con comisiones independientes', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal('fetch', request);
  const done = vi.fn();
  render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={done} />);
  fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
  fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml' }));
  fireEvent.change(screen.getByLabelText('Precio corto cliente'), {
    target: { value: '3000' }
  });
  fireEvent.change(screen.getByLabelText('Precio corto anfitriona'), { target: { value: '6000' } });
  expect(screen.queryByLabelText('Ml acompa\u00f1amiento cliente')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ml acompa\u00f1amiento anfitriona'), {
    target: { value: '150' }
  });
  fireEvent.change(screen.getByLabelText('Comisión corto anfitriona'), {
    target: { value: '1000' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
  fireEvent.change(screen.getByLabelText('Precio corto anfitriona 2'), {
    target: { value: '8000' }
  });
  fireEvent.change(screen.getByLabelText('Comisión corto anfitriona 2'), {
    target: { value: '2000' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar precio 3' }));
  expect(screen.queryByLabelText('Precio corto anfitriona 3')).not.toBeInTheDocument();
  const summary = screen.getByLabelText('Resumen de configuración');
  expect(summary).toHaveTextContent('Corto anfitriona 1: $6.000 · Comisión: $1.000');
  expect(summary).toHaveTextContent('Corto anfitriona 2: $8.000 · Comisión: $2.000');
  expect(summary).not.toHaveTextContent('Corto anfitriona 3:');
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(
    postBody(request).opciones_venta.find((option: any) => option.tipo === 'shot')
  ).toMatchObject({
    precio: 3000,
    comision: 0,
    ml_acompanamiento_anfitriona: 150,
    precios_anfitriona: [
      { precio: 6000, comision: 1000 },
      { precio: 8000, comision: 2000 }
    ]
  });
});

describe('tipos de venta al transferir', () => {
  it('reutiliza la configuración guardada sin pedir precio manual', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    expect(screen.getByText('Configuración guardada')).toBeInTheDocument();
    expect(screen.queryByLabelText('Precio por botella')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml' }));
    fireEvent.change(screen.getByLabelText('Precio corto cliente'), {
      target: { value: '3000' }
    });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(postBody(request)).toEqual({
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 2,
      opciones_venta: [
        { tipo: 'botella', precio: 20000, comision: 0 },
        {
          tipo: 'shot',
          precio: 3000,
          comision: 0,
          precio_anfitriona: 3000,
          precios_anfitriona: [{ precio: 3000, comision: 0 }]
        }
      ]
    });
  });

  it('edita los ml por shot del producto al traspasar', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    // Sin shot activo los inputs de ml permanecen ocultos.
    expect(screen.queryByLabelText('Ml corto cliente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ml corto anfitriona')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
    expect(screen.queryByLabelText('Ml corto cliente')).not.toBeInTheDocument();
    // Al activar el shot aparecen el precio único y los dos inputs de ml.
    fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml' }));
    expect(screen.getByLabelText('Ml corto cliente')).toHaveValue('');
    expect(screen.getByLabelText('Ml corto anfitriona')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Ml corto cliente'), { target: { value: '75' } });
    // El label del tipo de venta refleja el valor editado al instante.
    expect(screen.getByRole('button', { name: 'Corto · 75 ml' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ml corto anfitriona'), { target: { value: '40' } });
    expect(screen.getByRole('button', { name: 'Corto · 75 ml · Anf 40 ml' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Precio corto cliente'), {
      target: { value: '3000' }
    });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
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
        {
          tipo: 'shot',
          precio: 3000,
          comision: 0,
          precio_anfitriona: 3000,
          precios_anfitriona: [{ precio: 3000, comision: 0 }]
        }
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
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeDisabled();
  });

  it('guarda precios y ml distintos para cliente y anfitriona', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
    // Sin shot activo no se piden ni el precio ni los ml del shot.
    expect(screen.queryByLabelText('Precio corto cliente')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml' }));
    expect(screen.getByLabelText('Precio corto cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Ml corto cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Ml corto anfitriona')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Precio corto cliente'), {
      target: { value: '3000' }
    });
    fireEvent.change(screen.getByLabelText('Ml corto cliente'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Ml corto anfitriona'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Precio corto anfitriona'), {
      target: { value: '5000' }
    });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    // Precio único para ambas audiencias; ml distintos por audiencia.
    expect(postBody(request)).toEqual({
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 1,
      opciones_venta: [
        { tipo: 'botella', precio: 20000, comision: 0 },
        {
          tipo: 'shot',
          precio: 3000,
          comision: 0,
          precio_anfitriona: 5000,
          precios_anfitriona: [{ precio: 5000, comision: 0 }]
        }
      ]
    });
    const putCall = request.mock.calls.find(
      (args: any[]) => args[1]?.method === 'PUT' && JSON.parse(args[1].body).ml_shot !== undefined
    );
    expect(JSON.parse(putCall![1].body)).toEqual({ ml_shot: 50, ml_shot_anfitriona: 30 });
  });

  it('sin ml de anfitriona el shot usa el ml de cliente', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
    fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml' }));
    fireEvent.change(screen.getByLabelText('Precio corto cliente'), {
      target: { value: '3000' }
    });
    fireEvent.change(screen.getByLabelText('Ml corto cliente'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    const shot = postBody(request).opciones_venta.find((o: any) => o.tipo === 'shot');
    expect(shot).toEqual({
      tipo: 'shot',
      precio: 3000,
      comision: 0,
      precio_anfitriona: 3000,
      precios_anfitriona: [{ precio: 3000, comision: 0 }]
    });
    const putCall = request.mock.calls.find(
      (args: any[]) => args[1]?.method === 'PUT' && JSON.parse(args[1].body).ml_shot !== undefined
    );
    expect(JSON.parse(putCall![1].body)).toEqual({ ml_shot: 50, ml_shot_anfitriona: null });
  });

  it('conserva los precios distintos al reutilizar la configuración', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', request);
    const onDone = vi.fn();
    const conAnfitriona: BarStockItem = {
      ...item,
      opciones_venta: [
        { tipo: 'botella', precio: 20000, comision: 0 },
        {
          tipo: 'shot',
          precio: 3000,
          comision: 0,
          precio_anfitriona: 2000,
          precios_anfitriona: [{ precio: 2000, comision: 0 }]
        }
      ]
    };
    render(<TransferModal open item={conAnfitriona} onOpenChange={vi.fn()} onDone={onDone} />);
    expect(screen.getByText('Anfitriona $2.000 · Comisión $0')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(postBody(request).opciones_venta.find((option: any) => option.tipo === 'shot')).toEqual({
      tipo: 'shot',
      precio: 3000,
      comision: 0,
      precio_anfitriona: 2000,
      precios_anfitriona: [{ precio: 2000, comision: 0 }]
    });
  });
});

it('guarda y reutiliza unidades de bebida por botella', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal('fetch', request);
  const done = vi.fn();
  const view = render(<TransferModal open item={item} onOpenChange={vi.fn()} onDone={done} />);
  fireEvent.click(screen.getByRole('button', { name: 'Modificar precios' }));
  fireEvent.click(screen.getByLabelText('Bebida de la botella'));
  fireEvent.change(screen.getByLabelText('Unidades por botella'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  const options = postBody(request).opciones_venta;
  expect(options[0].acompanamiento).toEqual({ unidades: 3 });
  view.unmount();
  request.mockClear();
  done.mockClear();
  render(
    <TransferModal
      open
      item={{ ...item, opciones_venta: options }}
      onOpenChange={vi.fn()}
      onDone={done}
    />
  );
  expect(screen.getByText('Incluye 3 unidades de bebida por botella')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(postBody(request).opciones_venta).toEqual(options);
});
