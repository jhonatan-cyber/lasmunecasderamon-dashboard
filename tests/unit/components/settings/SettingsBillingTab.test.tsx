import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsBillingTab } from '@/components/settings/SettingsBillingTab';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/** Respuesta de GET /api/configurations con las claves de facturación que el tab ya no edita. */
const CONFIGURACIONES = {
  success: true,
  data: {
    facturacion: {
      impuesto_iva: '22',
      propina_venta: '10',
      moneda: 'CLP',
      facturacion_activada: 'false',
      resolucion_sii: 'SII-12345'
    },
    comisiones: { split_tarjeta_venta: '51', split_tarjeta_propina: '49' }
  }
};

let peticionesPut: { clave: string; valor: string }[] = [];

beforeEach(() => {
  peticionesPut = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        peticionesPut = body.configs;
        return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
      }
      return { ok: true, json: async () => CONFIGURACIONES } as unknown as Response;
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('tab de Facturación', () => {
  it('ya no muestra el input de Resolución SII ni el check de facturación electrónica', async () => {
    render(<SettingsBillingTab />);
    await waitFor(() => expect(screen.getByLabelText('% IVA')).toBeInTheDocument());

    expect(screen.queryByLabelText('Resolución SII')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolución SII')).not.toBeInTheDocument();
    expect(screen.queryByText('Activar facturación electrónica')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('sigue trayendo de la API los valores de los campos que quedan', async () => {
    render(<SettingsBillingTab />);

    // El IVA guardado es 22, no el default 19: la carga sigue funcionando.
    await waitFor(() => expect(screen.getByLabelText('% IVA')).toHaveValue(22));
    expect(screen.getByLabelText('Venta %')).toHaveValue(51);
    expect(screen.getByLabelText('Propina %')).toHaveValue(49);
  });

  it('guardar ya no reenvía las claves que ya no tienen campo', async () => {
    render(<SettingsBillingTab />);
    await waitFor(() => expect(screen.getByLabelText('% IVA')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración/i }));

    await waitFor(() => expect(peticionesPut).toHaveLength(5));
    // Si estas dos volvieran al estado por el spread de la carga, cada guardado
    // reescribiría `facturacion_activada` con el valor por defecto de un campo que nadie ve.
    expect(peticionesPut.map(c => c.clave).sort()).toEqual([
      'impuesto_iva',
      'moneda',
      'propina_venta',
      'split_tarjeta_propina',
      'split_tarjeta_venta'
    ]);
    expect(peticionesPut.find(c => c.clave === 'impuesto_iva')?.valor).toBe('22');
  });
});
