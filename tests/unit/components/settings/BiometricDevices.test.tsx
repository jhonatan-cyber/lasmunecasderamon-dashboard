import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { BiometricDevices } from '@/components/settings/BiometricDevices';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const equipo = {
  id: 'eq1',
  nombre: 'Puerta principal',
  marca: 'dahua',
  modelo: 'DHI-ASI7213X',
  serial: '8J01234ABCD',
  ip: '192.168.1.50',
  usuario_equipo: 'admin',
  mac: '00:11:22:33:44:55',
  recoger_registros: 1,
  fecha_crea: '2025-01-01T10:00:00.000Z',
  ultimo_uso: null,
  revocado_en: null,
  activo: true
};

function stubearEquipos() {
  const request = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: [equipo] })
  }));
  vi.stubGlobal('fetch', request);
  return request;
}

describe('BiometricDevices', () => {
  it('usa las credenciales ingresadas al buscar y conserva la IP guardada después', async () => {
    const request = vi.fn(async (_url: unknown, options?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () =>
        options?.method === 'POST'
          ? { success: true, message: 'Conexión OK' }
          : { success: true, data: [equipo] }
    }));
    vi.stubGlobal('fetch', request);
    render(<BiometricDevices />);
    await screen.findByText('Puerta principal');
    fireEvent.change(screen.getByLabelText('Clave CGI'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar por MAC' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        '/api/biometric/devices/eq1/credentials',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ip: equipo.ip, usuario: 'admin', clave: 'test-password' })
        })
      )
    );
    await waitFor(() => expect(screen.getByLabelText('Clave CGI')).toHaveValue(''));
    expect(screen.getByLabelText('IP del equipo')).toHaveValue(equipo.ip);
    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('/api/biometric/devices/eq1/credentials')
    );
  });

  it('explica un timeout HTML sin mostrar un error de JSON', async () => {
    const request = vi.fn(async (url: unknown) =>
      String(url).endsWith('/credentials')
        ? {
            ok: false,
            status: 504,
            json: async () => {
              throw new SyntaxError('Unexpected token <');
            }
          }
        : { ok: true, status: 200, json: async () => ({ success: true, data: [equipo] }) }
    );
    vi.stubGlobal('fetch', request);
    render(<BiometricDevices />);
    await screen.findByText('Puerta principal');
    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('VPS tenga acceso'))
    );
  });
  it('lista el equipo sin mostrar la URL de configuración ni el botón de copiar', async () => {
    stubearEquipos();

    render(<BiometricDevices />);

    await waitFor(() => expect(screen.getByText('Puerta principal')).toBeInTheDocument());
    expect(screen.getByText(/8J01234ABCD/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desvincular' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Copiar URL' })).not.toBeInTheDocument();
    expect(screen.queryByText('Copiar URL')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('/dahua/push');
    expect(document.body.textContent).not.toContain('/iclock/cdata');
  });

  it('con la lista vacía abre el formulario de alta en vez de dejar un hueco', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [] })
      }))
    );

    render(<BiometricDevices />);

    await waitFor(() =>
      expect(screen.getByText(/Todavía no hay equipos vinculados/)).toBeInTheDocument()
    );
    expect(screen.getByText(/Cargá el serial del lector/)).toBeInTheDocument();
  });
});
