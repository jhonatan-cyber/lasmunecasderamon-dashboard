// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn(), registrar: vi.fn() }));
vi.mock('twilio', () => ({ default: () => ({ messages: { create: mocks.create } }) }));
vi.mock('@/lib/business/twilioConfig', () => ({
  getTwilioConfig: vi.fn().mockResolvedValue({
    accountSid: 'AC' + 'a'.repeat(32),
    authToken: 'token-ficticio',
    whatsappNumber: '+14155238886'
  })
}));
vi.mock('@/lib/business/whatsappConfig', () => ({
  getAdminWhatsApp: vi.fn().mockResolvedValue('59170000000')
}));
vi.mock('@/modules/comunicaciones/whatsapp/seguimiento', () => ({
  registrarEntregaWhatsApp: mocks.registrar
}));
import { enviarPruebaWhatsApp } from '@/modules/comunicaciones/whatsapp/adaptador';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://dashboard.example.com');
  mocks.create.mockResolvedValue({ sid: 'SM' + 'b'.repeat(32), status: 'queued' });
  mocks.registrar.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
it('usa el destino guardado e incluye el callback público al enviar la prueba', async () => {
  const result = await enviarPruebaWhatsApp();
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'whatsapp:+59170000000',
      from: 'whatsapp:+14155238886',
      statusCallback: 'https://dashboard.example.com/api/whatsapp/status'
    })
  );
  expect(mocks.registrar).toHaveBeenCalledWith(
    expect.objectContaining({ tipo: 'prueba', estado: 'queued' })
  );
  expect(result).toMatchObject({
    estado: 'queued',
    destino: '••••0000',
    seguimientoGuardado: true
  });
});
it('un error guardando el seguimiento no reenvía un mensaje que Twilio ya aceptó', async () => {
  mocks.registrar.mockRejectedValue(new Error('database unavailable'));
  expect(await enviarPruebaWhatsApp()).toMatchObject({ seguimientoGuardado: false });
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
