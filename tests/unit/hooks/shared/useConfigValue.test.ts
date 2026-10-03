import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const RESPUESTA = {
  success: true,
  data: {
    bar: { shot_ml: 30, botella_ml: 1000 },
    facturacion: { impuesto_iva: '22' },
    comisiones: { split_tarjeta_venta: 60 }
  }
};

let fetchMock: ReturnType<typeof vi.fn>;

/**
 * El módulo guarda la configuración en una caché compartida a propósito (es lo que evita
 * que cada pantalla vuelva a traerla), y `beforeEach` la borra de `globalThis` para que cada
 * prueba parta de cero y se pueda contar cuántas peticiones salen de verdad.
 */
async function cargarHooks() {
  return await import('@/hooks/shared/useConfigValue');
}

beforeEach(() => {
  // La caché vive en `globalThis` a propósito (ver el módulo). Hay que vaciarla **en el
  // mismo objeto**: el módulo se guarda una referencia a él, así que sustituir la propiedad
  // dejaría al hook leyendo la caché de la prueba anterior y no se mediría ninguna petición.
  for (const clave of Object.keys(globalThis.__lmrConfigCache || {})) {
    delete globalThis.__lmrConfigCache![clave];
  }
  delete globalThis.__lmrConfigEnCurso;
  delete globalThis.__lmrConfigCargada;
  fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(RESPUESTA), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useConfigValue', () => {
  it('varios lectores montados a la vez piden /api/configurations una sola vez', async () => {
    const { useConfigValue } = await cargarHooks();

    // Tres lectores distintos, como los tres componentes de una misma pantalla.
    renderHook(() => ({
      shot: useConfigValue('bar', 'shot_ml', 50),
      iva: useConfigValue('facturacion', 'impuesto_iva', '19'),
      split: useConfigValue('comisiones', 'split_tarjeta_venta', 51)
    }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/configurations');
  });

  it('devuelve el valor guardado de la categoría', async () => {
    const { useConfigValue } = await cargarHooks();
    const { result } = renderHook(() => useConfigValue('facturacion', 'impuesto_iva', '19'));

    await waitFor(() => expect(result.current).toBe('22'));
  });

  it('sigue con el default cuando la clave no vino en la respuesta', async () => {
    const { useConfigValue } = await cargarHooks();
    const { result } = renderHook(() => useConfigValue('bar', 'clave_que_no_existe', 7));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current).toBe(7);
  });

  it('aguanta un fallo de red sin romper el render', async () => {
    const { useConfigValue } = await cargarHooks();
    fetchMock.mockRejectedValueOnce(new Error('sin red'));
    const { result } = renderHook(() => useConfigValue('bar', 'shot_ml', 50));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current).toBe(50);
  });

  it('un segundo lector que monta después tampoco vuelve a pedirla', async () => {
    const { useConfigValue } = await cargarHooks();

    const { result: primero } = renderHook(() => useConfigValue('bar', 'shot_ml', 50));
    await waitFor(() => expect(primero.current).toBe(30));

    renderHook(() => useConfigValue('comisiones', 'split_tarjeta_venta', 51));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});

describe('useConfig', () => {
  it('toma categoría y default del registro de claves', async () => {
    const { useConfig } = await cargarHooks();
    const { result } = renderHook(() => useConfig<number>('shot_ml'));

    // El registro dice que `shot_ml` vive en `bar`, y la respuesta lo trae en `bar.shot_ml`.
    await waitFor(() => expect(result.current).toBe(30));
  });

  it('devuelve el default del registro mientras no llega la respuesta', async () => {
    const { useConfig } = await cargarHooks();
    const { result } = renderHook(() => useConfig<number>('shots_alerta'));

    expect(result.current).toBe(3);
  });

  it('una clave fuera del registro no inventa categoría ni valor', async () => {
    const { useConfig } = await cargarHooks();
    const { result } = renderHook(() => useConfig<string>('clave_inventada', 'x'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current).toBe('x');
  });
});
