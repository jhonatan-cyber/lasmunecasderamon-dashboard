import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsServiceLevelsCard } from '@/components/settings/SettingsServiceLevelsCard';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/utils/logger', () => ({
  default: { captureException: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));
vi.mock('@/hooks/shared/useConfigValue', () => ({
  useConfigValue: (_category: string, _key: string, defaultValue: string | number) => defaultValue,
  useConfig: (_clave: string, defaultValue?: string) => defaultValue ?? '',
  refrescarConfiguraciones: vi.fn(async () => {})
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Los roles viven con `id_rol` varchar(36): el id es un UUID, no un número.
const ROLES = [
  { id_rol: '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', nombre: 'Anfitriona', estado: 1 },
  { id_rol: '8bb76943-c1ec-46ae-ab32-76d35e9726e0', nombre: 'Cajero', estado: 1 },
  { id_rol: '3c4ae24a-700a-436d-8bb8-d44e6d45b007', nombre: 'Administrador', estado: 1 },
  { id_rol: 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', nombre: 'Garzon', estado: 0 }
];

function stubFetch(roles: unknown[]) {
  const request = vi.fn(async (url: string, init?: { method?: string }) => {
    if (init?.method === 'PUT') return { ok: true, json: async () => ({ success: true }) };
    if (String(url).includes('/api/roles'))
      return { ok: true, json: async () => ({ success: true, data: roles }) };
    return { ok: true, json: async () => ({ success: true, data: {} }) };
  });
  vi.stubGlobal('fetch', request);
  return request;
}

describe('SettingsServiceLevelsCard · colaciones por rol', () => {
  it('lista los roles activos con id UUID y omite al administrador', async () => {
    stubFetch(ROLES);

    render(<SettingsServiceLevelsCard />);

    expect(
      await screen.findByLabelText('Colaciones por turno de caja para Anfitriona')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Colaciones por turno de caja para Cajero')).toBeInTheDocument();
    expect(screen.queryByText('No hay roles activos para configurar.')).not.toBeInTheDocument();
    // El administrador no recibe colaciones: no se configura.
    expect(
      screen.queryByLabelText('Colaciones por turno de caja para Administrador')
    ).not.toBeInTheDocument();
    // Un rol inactivo no se configura.
    expect(screen.queryByText('Garzon')).not.toBeInTheDocument();
  });

  it('guarda el tope con el id del rol como clave', async () => {
    const request = stubFetch(ROLES);

    render(<SettingsServiceLevelsCard />);
    const input = await screen.findByLabelText('Colaciones por turno de caja para Cajero');
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/ }));

    await waitFor(() => {
      const put = request.mock.calls.find(args => args[1]?.method === 'PUT');
      expect(put?.[0]).toBe('/api/configurations');
      const body = JSON.parse((put![1] as { body: string }).body);
      const guardado = body.configs.find(
        (config: { clave: string }) => config.clave === 'colaciones_por_rol_y_turno'
      );
      expect(JSON.parse(guardado.valor)).toEqual({
        '8bb76943-c1ec-46ae-ab32-76d35e9726e0': 2
      });
    });
  });
});
