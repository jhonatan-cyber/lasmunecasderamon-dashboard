// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import twilio from 'twilio';
vi.mock('@/lib/business/twilioConfig', () => ({
  getTwilioConfig: vi
    .fn()
    .mockResolvedValue({ accountSid: 'AC' + 'a'.repeat(32), authToken: 'token-de-pruebas' })
}));
vi.mock('@/modules/comunicaciones', () => ({ registrarEntregaWhatsApp: vi.fn() }));
import { validarWebhookTwilio, whatsappWebhookUrl } from '@/lib/integrations/twilioWebhook';
import { registrarEntregaWhatsApp } from '@/modules/comunicaciones';
import { POST } from '@/app/api/whatsapp/status/route';

const base = 'https://dashboard.example.com';
const params = {
  AccountSid: 'AC' + 'a'.repeat(32),
  MessageSid: 'SM' + 'b'.repeat(32),
  MessageStatus: 'delivered',
  To: 'whatsapp:+59170000000',
  ChannelPrefix: 'whatsapp'
};
function signedRequest(overrides = {}, signedPath = '/api/whatsapp/status') {
  const values = { ...params, ...overrides };
  return new Request('http://127.0.0.1:3000/api/whatsapp/status', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-twilio-signature': twilio.getExpectedTwilioSignature(
        'token-de-pruebas',
        base + signedPath,
        values
      ),
      'x-forwarded-host': 'attacker.example.com'
    },
    body: new URLSearchParams(values)
  });
}
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', base);
  vi.stubEnv('TWILIO_WEBHOOK_BASE_URL', '');
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
describe('Twilio detrás de Nginx', () => {
  it('permite usar webhooks públicos mientras el dashboard apunta a localhost', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000');
    vi.stubEnv('TWILIO_WEBHOOK_BASE_URL', base);
    expect(whatsappWebhookUrl('/api/whatsapp/status')).toBe(base + '/api/whatsapp/status');
    expect(await validarWebhookTwilio(signedRequest())).toBe(true);
  });
  it('valida la URL pública y todos los parámetros, ignorando el host interno y headers falsificados', async () => {
    expect(await validarWebhookTwilio(signedRequest())).toBe(true);
  });
  it('rechaza firmas para otra ruta y cuentas distintas', async () => {
    expect(await validarWebhookTwilio(signedRequest({}, '/api/whatsapp/webhook'))).toBe(false);
    expect(await validarWebhookTwilio(signedRequest({ AccountSid: 'AC' + 'c'.repeat(32) }))).toBe(
      false
    );
  });
  it('rechaza parámetros alterados', async () => {
    const valid = signedRequest();
    const altered = new Request(valid.url, {
      method: 'POST',
      headers: valid.headers,
      body: new URLSearchParams({ ...params, MessageStatus: 'read' })
    });
    expect(await validarWebhookTwilio(altered)).toBe(false);
  });
  it('acepta callbacks sin sesión y devuelve 204 después de persistirlos', async () => {
    expect((await POST(signedRequest())).status).toBe(204);
    expect(registrarEntregaWhatsApp).toHaveBeenCalledWith(
      expect.objectContaining({ sid: params.MessageSid, estado: 'delivered' })
    );
  });
  it('no escribe nada si falta la firma', async () => {
    expect(
      (await POST(new Request('http://localhost/api/whatsapp/status', { method: 'POST' }))).status
    ).toBe(403);
    expect(registrarEntregaWhatsApp).not.toHaveBeenCalled();
  });
});
