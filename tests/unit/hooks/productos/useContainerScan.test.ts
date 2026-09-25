import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const audio = vi.hoisted(() => ({ play: vi.fn(), preparar: vi.fn() }));
const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/audioUtils', () => ({
  playScanSound: audio.play,
  prepareScanSound: audio.preparar
}));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

import {
  claveColaDeEscaneos,
  useContainerScan,
  type EscaneoEnvase
} from '@/hooks/productos/useContainerScan';

const ENDPOINT = '/api/bar/containers';
const CLAVE_COLA = claveColaDeEscaneos(ENDPOINT);

const unidad = {
  id: 'unidad-1',
  codigo: 'LM-000123',
  codigo_barras: '2912345678901',
  estado: 'vendida',
  fecha_devolucion: '2026-09-20 22:30:00',
  fecha_confirmacion: null,
  producto_nombre: 'Paceña',
  presentacion_nombre: '750 ml',
  compra_folio: 'C-001'
};

const aceptado = (mensaje = 'Envase verificado') => ({ ok: true, mensaje, unidad });
const rechazado = (motivo: string) => ({
  ok: false,
  motivo,
  mensaje: `Rechazado: ${motivo}`,
  unidad: null
});

/** fetch simulado: `porCodigo` decide la respuesta de cada código leído. */
const simularFetch = (
  porCodigo: (codigo: string) => unknown | Promise<unknown>,
  opciones: { status?: number } = {}
) => {
  const status = opciones.status ?? 200;
  const llamadas: string[] = [];
  const fetchFalso = vi.fn(async (_url: string, init?: RequestInit) => {
    const codigo = JSON.parse(String(init?.body ?? '{}')).codigo as string;
    llamadas.push(codigo);
    const diagnostico = await porCodigo(codigo);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ success: status < 300, message: 'msg', data: diagnostico })
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchFalso);
  return llamadas;
};

/** La red no responde: cualquier lectura queda en cola local. */
const simularSinRed = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('fetch failed');
    })
  );
};

const colaGuardada = (): EscaneoEnvase[] =>
  JSON.parse(window.localStorage.getItem(CLAVE_COLA) || '[]');

const render = () => renderHook(() => useContainerScan({ endpoint: ENDPOINT }));

describe('escaneo continuo de envases', () => {
  beforeEach(() => {
    audio.play.mockClear();
    audio.preparar.mockClear();
    toastError.mockClear();
    toastSuccess.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('acumula el lote separando aceptados de rechazados y suena distinto en cada caso', async () => {
    simularFetch(() => aceptado());
    const { result } = render();

    await act(async () => {
      await result.current.escanear(' 2912345678901 ');
    });

    simularFetch(() => rechazado('no_es_nuestro'));
    await act(async () => {
      await result.current.escanear('7800000000001');
    });

    simularFetch(() => rechazado('ya_devuelto'));
    await act(async () => {
      await result.current.escanear('LM-000123');
    });

    expect(result.current.aceptados).toBe(1);
    expect(result.current.rechazados).toBe(2);
    expect(result.current.enCola).toBe(0);
    // Lo más reciente primero, con el motivo para el repaso del operador.
    expect(result.current.sesion.map(e => e.motivo)).toEqual([
      'ya_devuelto',
      'no_es_nuestro',
      null
    ]);
    expect(result.current.sesion[2]).toMatchObject({ codigo: '2912345678901', ok: true });
    expect(audio.play.mock.calls).toEqual([['aceptado'], ['rechazado'], ['rechazado']]);
    expect(result.current.resultado).toMatchObject({ ok: false, motivo: 'ya_devuelto' });
  });

  it('ignora códigos vacíos y un segundo escaneo mientras el primero está en curso', async () => {
    const llamadas = simularFetch(() => aceptado());
    const { result } = render();

    let procesado: boolean | null = null;
    await act(async () => {
      procesado = await result.current.escanear('   ');
    });
    expect(procesado).toBe(false);
    expect(llamadas).toHaveLength(0);

    let resolver: (valor: unknown) => void = () => {};
    const pendiente = new Promise(res => {
      resolver = res;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pendiente)
    );

    let primero: Promise<boolean> = Promise.resolve(false);
    let segundo: boolean | null = null;
    await act(async () => {
      primero = result.current.escanear('LM-000123');
      segundo = await result.current.escanear('LM-000124');
      resolver({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: '', data: aceptado() })
      });
      await primero;
    });

    expect(segundo).toBe(false);
    expect(await primero).toBe(true);
    expect(result.current.aceptados).toBe(1);
  });

  it('agrupa el refresco del historial: una ráfaga dispara una sola recarga', async () => {
    vi.useFakeTimers();
    simularFetch(() => aceptado());
    const onAceptado = vi.fn();
    const { result } = renderHook(() => useContainerScan({ endpoint: ENDPOINT, onAceptado }));

    await act(async () => {
      await result.current.escanear('LM-000123');
    });
    await act(async () => {
      await result.current.escanear('LM-000124');
    });

    expect(onAceptado).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(onAceptado).toHaveBeenCalledTimes(1);
  });

  it('un error del cliente (HTTP 400) avisa por toast y no entra al lote', async () => {
    simularFetch(() => null, { status: 400 });
    const { result } = render();

    let procesado: boolean | null = null;
    await act(async () => {
      procesado = await result.current.escanear('LM-000123');
    });

    expect(procesado).toBe(false);
    expect(toastError).toHaveBeenCalledWith('msg');
    expect(result.current.sesion).toEqual([]);
    expect(audio.play).not.toHaveBeenCalled();
  });

  it('sin conexión la lectura queda en cola local, se cuenta y suena su propio tono', async () => {
    simularSinRed();
    const { result } = render();

    let procesado: boolean | null = null;
    await act(async () => {
      procesado = await result.current.escanear('LM-000123');
    });

    // El código se registró: el campo se limpia y el operador sigue con el lote.
    expect(procesado).toBe(true);
    expect(result.current.escaneando).toBe(false);
    expect(result.current.enCola).toBe(1);
    expect(result.current.aceptados).toBe(0);
    expect(result.current.sesion[0]).toMatchObject({ codigo: 'LM-000123', ok: null });
    expect(audio.play).toHaveBeenCalledWith('cola');
    // Se avisa una sola vez por episodio, no un toast por lectura.
    expect(toastError).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.escanear('LM-000124');
    });
    expect(result.current.enCola).toBe(2);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(colaGuardada().map(c => c.codigo)).toEqual(['LM-000124', 'LM-000123']);
  });

  it('sin conexión un código repetido no se duplica en la cola', async () => {
    simularSinRed();
    const { result } = render();

    await act(async () => {
      await result.current.escanear('lm-000123');
    });
    await act(async () => {
      await result.current.escanear(' LM-000123 ');
    });

    expect(result.current.enCola).toBe(1);
    expect(result.current.sesion[0].codigo).toBe('LM-000123');
    expect(colaGuardada()).toHaveLength(1);
  });

  it('un servidor caído (HTTP 500) también se guarda en cola', async () => {
    simularFetch(() => null, { status: 500 });
    const { result } = render();

    let procesado: boolean | null = null;
    await act(async () => {
      procesado = await result.current.escanear('LM-000123');
    });

    expect(procesado).toBe(true);
    expect(result.current.enCola).toBe(1);
    expect(colaGuardada()).toHaveLength(1);
  });

  it('la cola sobrevive a un refresco de página y se drena al reconectar', async () => {
    // 1) Se guardan dos lecturas sin conexión en una sesión anterior.
    simularSinRed();
    const primera = render();
    await act(async () => {
      await primera.result.current.escanear('LM-000123');
      await primera.result.current.escanear('LM-000124');
    });
    primera.unmount();
    expect(colaGuardada()).toHaveLength(2);

    // 2) Al volver a abrir, la cola se recupera; mientras no hay red sigue en cola.
    const { result } = render();
    await waitFor(() => expect(result.current.enCola).toBe(2));
    // Deja terminar el intento fallido del montaje antes de reconectar.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.sesion.map(e => e.codigo)).toEqual(['LM-000124', 'LM-000123']);

    // 3) Vuelve la red: el evento 'online' la drena en orden con sus veredictos.
    simularFetch(codigo => (codigo === 'LM-000123' ? aceptado() : rechazado('ya_devuelto')));
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(result.current.enCola).toBe(0));
    expect(result.current.aceptados).toBe(1);
    expect(result.current.rechazados).toBe(1);
    expect(result.current.sesion.find(e => e.codigo === 'LM-000123')?.ok).toBe(true);
    expect(result.current.sesion.find(e => e.codigo === 'LM-000124')).toMatchObject({
      ok: false,
      motivo: 'ya_devuelto'
    });
    expect(colaGuardada()).toEqual([]);
    // Con rechazos el resumen se avisa en rojo: hay que mirarlo.
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('Cola sincronizada: 1 aceptado(s), 1 rechazado(s)')
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('si la red cae a mitad de la sincronización no se pierde nada: el resto queda en cola', async () => {
    simularSinRed();
    const { result } = render();
    await act(async () => {
      await result.current.escanear('LM-000123');
      await result.current.escanear('LM-000124');
      await result.current.escanear('LM-000125');
    });
    expect(result.current.enCola).toBe(3);

    // La red vuelve pero falla después del segundo código.
    const intentos: string[] = [];
    simularFetch(codigo => {
      intentos.push(codigo);
      if (codigo === 'LM-000124') throw new TypeError('fetch failed');
      return aceptado();
    });

    await act(async () => {
      await result.current.sincronizar();
    });

    expect(intentos).toEqual(['LM-000123', 'LM-000124']);
    expect(result.current.aceptados).toBe(1);
    expect(result.current.enCola).toBe(2);
    expect(colaGuardada().map(c => c.codigo)).toEqual(['LM-000125', 'LM-000124']);
    // Lo que se resolvió se cuenta y lo que no, sigue esperando.
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining(
        'Cola sincronizada: 1 aceptado(s), 0 rechazado(s). Quedan 2 pendientes.'
      )
    );
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('Sin conexión: el escaneo quedó guardado')
    );
  });

  it('sincronizar sin nada pendiente no hace peticiones ni avisa', async () => {
    const llamadas = simularFetch(() => aceptado());
    const { result } = render();

    let sincronizado: boolean | null = null;
    await act(async () => {
      sincronizado = await result.current.sincronizar();
    });

    expect(sincronizado).toBe(false);
    expect(llamadas).toHaveLength(0);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('limpiar reinicia el conteo pero conserva los escaneos pendientes', async () => {
    simularFetch(codigo => (codigo === 'LM-000123' ? aceptado() : undefined));
    const { result } = render();
    await act(async () => {
      await result.current.escanear('LM-000123');
    });
    simularSinRed();
    await act(async () => {
      await result.current.escanear('LM-000124');
    });
    expect(result.current.aceptados).toBe(1);
    expect(result.current.enCola).toBe(1);

    act(() => result.current.limpiar());

    expect(result.current.aceptados).toBe(0);
    expect(result.current.enCola).toBe(1);
    expect(result.current.sesion.map(e => e.codigo)).toEqual(['LM-000124']);
    expect(result.current.resultado).toBeNull();
    expect(colaGuardada()).toHaveLength(1);
  });

  it('la cola pendiente nunca se recorta aunque el lote crezca', async () => {
    simularSinRed();
    const { result } = render();

    for (let i = 1; i <= 55; i++) {
      await act(async () => {
        await result.current.escanear(`LM-${String(i).padStart(6, '0')}`);
      });
    }

    expect(result.current.enCola).toBe(55);
    expect(colaGuardada()).toHaveLength(55);
  });

  it('el interruptor silencia el aviso, lo reanuda y recuerda la preferencia', async () => {
    simularFetch(() => aceptado());
    const { result, unmount } = render();

    await act(async () => {
      await result.current.escanear('LM-000123');
    });
    expect(audio.play).toHaveBeenCalledWith('aceptado');

    act(() => result.current.alternarSonido());
    expect(result.current.sonido).toBe(false);
    expect(window.localStorage.getItem('envases_aviso_sonoro')).toBe('off');

    await act(async () => {
      await result.current.escanear('LM-000124');
    });
    expect(audio.play).toHaveBeenCalledTimes(1);

    act(() => result.current.alternarSonido());
    expect(result.current.sonido).toBe(true);
    expect(window.localStorage.getItem('envases_aviso_sonoro')).toBe('on');
    expect(audio.preparar).toHaveBeenCalled();

    unmount();
    const segundoRender = render();
    expect(segundoRender.result.current.sonido).toBe(true);
  });

  it('arranca sin aviso si la preferencia quedó apagada', () => {
    window.localStorage.setItem('envases_aviso_sonoro', 'off');
    const { result } = render();

    expect(result.current.sonido).toBe(false);
  });

  it('limpiar deja el lote en cero para el siguiente conteo', async () => {
    simularFetch(() => aceptado());
    const { result } = render();

    await act(async () => {
      await result.current.escanear('LM-000123');
    });
    expect(result.current.aceptados).toBe(1);

    act(() => result.current.limpiar());

    expect(result.current.sesion).toEqual([]);
    expect(result.current.aceptados).toBe(0);
    expect(result.current.rechazados).toBe(0);
    expect(result.current.resultado).toBeNull();
  });
});
