import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTransferSubmit } from '@/hooks/shared/useTransferSubmit';
import type { TransferForm } from '@/hooks/shared/useTransferForm';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/**
 * La configuración del Acompañamiento de la colación (unidades y ml) tiene que
 * quedar guardada en el campo explícito `acompanamiento_colacion`: si solo se
 * guarda en el campo heredado, la configuración de la colación depende de que
 * alguien lo lea como si fuera "bebidas incluidas por botella".
 */

const item = {
  id: 'p-1',
  producto_id: 'prod-1',
  max_anfitrionas: 0,
  ml_shot: null,
  ml_shot_anfitriona: null
} as unknown as BarStockItem;

function formulario(overrides: Partial<TransferForm> = {}): TransferForm {
  const base = {
    colacionHabilitada: true,
    mlColacion: '',
    mlColacionSugerido: null,
    mlAcompanamientoColacion: '',
    mlAcompanamientoColacionSugerido: null,
    coverHabilitado: false,
    acompanamientoBotella: 'gaseosa',
    unidadesAcompanamiento: '2',
    cantidad: '1',
    disponible: 5,
    precioVenta: '30000',
    comision: '0',
    precioSinAnfitriona: '',
    precioShot: '0',
    precioShotAnfitriona: '0',
    comisionShot: '0',
    mlShotCliente: '',
    mlShotAnfitriona: '',
    mlAcompanamientoAnfitriona: '',
    preciosAnfitrionaExtra: [],
    tipos: ['botella'],
    usarConfigGuardada: false,
    opcionesGuardadas: [],
    editarPrecios: false,
    maxAnfitrionas: '',
    tiers: [],
    shotActivo: false,
    reset: vi.fn()
  } as unknown as TransferForm;
  return { ...base, ...overrides } as TransferForm;
}

async function enviar(form: TransferForm) {
  const cuerpos: any[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body) cuerpos.push(JSON.parse(String(init.body)));
      return { ok: true, json: async () => ({ success: true, message: 'ok' }) };
    })
  );
  const { result } = renderHook(() =>
    useTransferSubmit({
      item,
      form,
      endpoint: '/api/bar',
      onOpenChange: vi.fn(),
      onDone: vi.fn()
    })
  );
  await act(async () => {
    await result.current.handleSubmit({
      preventDefault: () => {}
    } as unknown as React.FormEvent);
  });
  return cuerpos;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useTransferSubmit guarda la configuración de colación', () => {
  it('guarda las unidades de Acompañamiento aunque no haya ml', async () => {
    const cuerpos = await enviar(formulario({ mlAcompanamientoColacion: '' }));

    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0].opciones_venta[0].acompanamiento_colacion).toEqual({ unidades: 2 });
  });

  it('guarda las unidades y los ml del Acompañamiento', async () => {
    const cuerpos = await enviar(formulario({ mlAcompanamientoColacion: '50' }));

    expect(cuerpos[0].opciones_venta[0].acompanamiento_colacion).toEqual({
      unidades: 2,
      ml: 50
    });
  });

  it('no guarda configuración de Acompañamiento si la colación está apagada', async () => {
    const cuerpos = await enviar(
      formulario({ colacionHabilitada: false, mlAcompanamientoColacion: '50' })
    );

    expect(cuerpos[0].opciones_venta[0].acompanamiento_colacion).toBeUndefined();
  });

  it('guarda los ml de la colación', async () => {
    const cuerpos = await enviar(formulario({ mlColacion: '150' }));

    expect(cuerpos[0].opciones_venta[0].ml_colacion).toBe(150);
  });
});
