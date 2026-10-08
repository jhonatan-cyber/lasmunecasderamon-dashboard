// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  send: vi.fn(),
  handler: undefined as
    | ((request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>)
    | undefined
}));

vi.mock('@/lib/api/withRoute', () => ({
  withRoute: (_config: unknown, handler: typeof mocks.handler) => {
    mocks.handler = handler;
    return handler;
  }
}));
vi.mock('@/modules/caja', () => ({ CashRegisterService: { getById: mocks.getById } }));
vi.mock('@/modules/comunicaciones', () => ({ enviarReporteCajaWhatsApp: mocks.send }));
vi.mock('@/lib/api/cajaReportePdfToken', () => ({
  crearTokenCajaReporte: vi.fn().mockResolvedValue('signed-token')
}));
vi.mock('@/lib/utils/logger', () => ({ default: { error: vi.fn() } }));

import { POST } from '@/app/api/cashregister/[id]/whatsapp/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getById.mockResolvedValue({ id_caja: 'caja-1' });
  mocks.send.mockResolvedValue(true);
});

const post = () =>
  POST(new Request('http://localhost/api/cashregister/caja-1/whatsapp', { method: 'POST' }), {
    params: Promise.resolve({ id: 'caja-1' })
  });

it('envía el detalle de caja y confirma cuando WhatsApp acepta el mensaje', async () => {
  const response = await post();

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true });
  expect(mocks.send).toHaveBeenCalledWith({ cajaId: 'caja-1', token: 'signed-token' });
});

it('devuelve un error claro cuando el destinatario no se unió al Sandbox', async () => {
  mocks.send.mockRejectedValue(Object.assign(new Error('Twilio rejected'), { code: 63015 }));

  const response = await post();

  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({
    success: false,
    message: 'El destinatario debe unirse al Sandbox de Twilio antes de recibir mensajes.'
  });
});
