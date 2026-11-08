import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsWhatsAppTab } from '@/components/settings/SettingsWhatsAppTab';
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/** Administrador logueado que expone `useAuth`. Por defecto es el admin ya configurado (u1). */
const auth = vi.hoisted(() => ({
  user: { id: 'u1', role: 'Administrador' } as { id: string; role: string } | null
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));

const fetchMock = vi.fn();

/** Administrador ya configurado que devuelve el endpoint para dibujar su fila. */
const ADMIN_CONFIGURADO = {
  usuarioId: 'u1',
  nombre: 'Ana Perez',
  nick: 'ana',
  destino: '+56911111111',
  accountSid: '',
  authToken: '••••••••••••',
  whatsappNumber: '',
  activo: true
};

/** Administrador del sistema que todavía no tiene WhatsApp configurado. */
const ADMIN_DISPONIBLE = { id: 'u2', nombre: 'Beto Diaz', nick: 'beto' };

beforeEach(() => {
  auth.user = { id: 'u1', role: 'Administrador' };
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async (url: string, options?: RequestInit) => ({
    ok: true,
    json: async () => {
      if (url === '/api/configurations')
        return {
          success: true,
          data: {
            integraciones: { twilio_auth_token: '••••••••••••' },
            sistema: { admin_whatsapp: '59170000000' }
          }
        };
      if (url === '/api/whatsapp/administradores')
        return {
          success: true,
          data: { administradores: [ADMIN_CONFIGURADO], disponibles: [ADMIN_DISPONIBLE] }
        };
      if (options?.method === 'POST')
        return { success: true, data: { enviados: 1, total: 1, destinos: ['••••0000'] } };
      return {
        success: true,
        data: {
          incomingUrl: 'https://example.com/api/whatsapp/webhook',
          statusCallbackUrl: 'https://example.com/api/whatsapp/status',
          messages: [
            {
              message_sid: 'SM-test',
              destino: '••••0000',
              tipo: 'prueba',
              estado: 'queued',
              error_code: null
            }
          ]
        }
      };
    }
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('exige guardar los cambios antes de probar y muestra la URL del callback', async () => {
  render(<SettingsWhatsAppTab />);
  const button = await screen.findByRole('button', { name: 'Enviar mensaje de prueba' });
  expect(
    await screen.findByDisplayValue('https://example.com/api/whatsapp/status')
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Configurando WhatsApp de'), {
    target: { value: 'global' }
  });
  fireEvent.change(screen.getByLabelText('WhatsApp del administrador (destino)'), {
    target: { value: '59171111111' }
  });
  expect(button).toBeDisabled();
  expect(screen.getByText('Guarda los cambios antes de probar.')).toBeInTheDocument();
});
it('envía solo al pulsar el botón y distingue aceptación de entrega', async () => {
  render(<SettingsWhatsAppTab />);
  const button = await screen.findByRole('button', { name: 'Enviar mensaje de prueba' });
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('Twilio aceptó la prueba para 1 de 1')
  );
  expect(screen.getByText('En cola')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/whatsapp/test', { method: 'POST' });
});
it('carga el administrador elegido en el selector y lo guarda desde WhatsApp / Twilio', async () => {
  render(<SettingsWhatsAppTab />);

  const selector = await screen.findByLabelText('Configurando WhatsApp de');
  await screen.findAllByText('Ana Perez (@ana)');

  fireEvent.change(selector, { target: { value: 'u1' } });

  expect(await screen.findByDisplayValue('+56911111111')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar administrador' }));

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/whatsapp/administradores',
      expect.objectContaining({ method: 'PUT' })
    )
  );
});

it('deja seleccionado al administrador logueado al abrir la pestaña', async () => {
  render(<SettingsWhatsAppTab />);

  const selector = await screen.findByLabelText('Configurando WhatsApp de');
  expect(selector).toHaveValue('u1');
  expect(await screen.findByDisplayValue('+56911111111')).toBeInTheDocument();
});

it('lista todos los administradores en el selector, tengan o no WhatsApp configurado', async () => {
  render(<SettingsWhatsAppTab />);

  await screen.findByLabelText('Configurando WhatsApp de');

  expect(screen.getByRole('option', { name: 'Ana Perez (@ana)' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Beto Diaz (@beto)' })).toBeInTheDocument();
});

it('permite configurar por primera vez a un administrador sin WhatsApp', async () => {
  render(<SettingsWhatsAppTab />);

  const selector = await screen.findByLabelText('Configurando WhatsApp de');
  fireEvent.change(selector, { target: { value: 'u2' } });

  fireEvent.change(await screen.findByLabelText('WhatsApp destino'), {
    target: { value: '+56922222222' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar administrador' }));

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/whatsapp/administradores',
      expect.objectContaining({ method: 'PUT' })
    )
  );
});
