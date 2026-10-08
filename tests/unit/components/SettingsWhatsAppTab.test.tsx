import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsWhatsAppTab } from '@/components/settings/SettingsWhatsAppTab';
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const fetchMock = vi.fn();
beforeEach(() => {
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
      if (options?.method === 'POST')
        return { success: true, data: { destino: '••••0000', seguimientoGuardado: true } };
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
    expect(screen.getByRole('status')).toHaveTextContent('Prueba aceptada por Twilio')
  );
  expect(screen.getByText('En cola')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/whatsapp/test', { method: 'POST' });
});
