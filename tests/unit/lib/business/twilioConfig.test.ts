// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: db.query }));

import { clearTwilioConfigCache, getTwilioConfig } from '@/lib/business/twilioConfig';

const ENV_CLAVES = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'ADMIN_WHATSAPP_NUMBER'
] as const;

const envOriginal: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const clave of ENV_CLAVES) envOriginal[clave] = process.env[clave];
  clearTwilioConfigCache();
  db.query.mockReset();
  db.query.mockResolvedValue([]);
});

afterEach(() => {
  for (const clave of ENV_CLAVES) {
    if (envOriginal[clave] === undefined) delete process.env[clave];
    else process.env[clave] = envOriginal[clave];
  }
  clearTwilioConfigCache();
});

const filas = (valores: Record<string, string>) =>
  Object.entries(valores).map(([clave, valor]) => ({ clave, valor }));

describe('getTwilioConfig', () => {
  it('lee lo que está guardado en configuraciones', async () => {
    db.query.mockResolvedValue(
      filas({
        twilio_account_sid: 'AC11111111111111111111111111111111',
        twilio_auth_token: 'token-desde-la-base',
        twilio_whatsapp_number: 'whatsapp:+56911111111'
      })
    );

    const config = await getTwilioConfig();

    expect(config).toEqual({
      accountSid: 'AC11111111111111111111111111111111',
      authToken: 'token-desde-la-base',
      whatsappNumber: '+56911111111'
    });
  });

  it('una clave vacía en la base cae a la variable de entorno', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC22222222222222222222222222222222';
    process.env.TWILIO_AUTH_TOKEN = 'token-del-env';
    process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+56922222222';
    db.query.mockResolvedValue(
      filas({
        twilio_account_sid: '',
        twilio_auth_token: '',
        twilio_whatsapp_number: ''
      })
    );

    const config = await getTwilioConfig();

    expect(config.accountSid).toBe('AC22222222222222222222222222222222');
    expect(config.authToken).toBe('token-del-env');
    expect(config.whatsappNumber).toBe('+56922222222');
  });

  it('sin base resuelve todo desde el .env', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC33333333333333333333333333333333';
    process.env.TWILIO_AUTH_TOKEN = 'token-env';
    process.env.TWILIO_WHATSAPP_NUMBER = '+56933333333';
    db.query.mockResolvedValue([]);

    const config = await getTwilioConfig();

    expect(config).toEqual({
      accountSid: 'AC33333333333333333333333333333333',
      authToken: 'token-env',
      whatsappNumber: '+56933333333'
    });
  });

  it('la base manda sobre el .env cuando tiene valor', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC00000000000000000000000000000000';
    db.query.mockResolvedValue(filas({ twilio_account_sid: 'AC99999999999999999999999999999999' }));

    const config = await getTwilioConfig();

    expect(config.accountSid).toBe('AC99999999999999999999999999999999');
  });

  it('si nada está configurado usa el número por defecto de Twilio', async () => {
    db.query.mockResolvedValue([]);

    const config = await getTwilioConfig();

    expect(config.whatsappNumber).toBe('+14155238886');
  });

  it('si la base falla sigue funcionando con el .env', async () => {
    process.env.TWILIO_AUTH_TOKEN = 'token-respaldo';
    db.query.mockRejectedValue(new Error('sin conexion'));

    const config = await getTwilioConfig();

    expect(config.authToken).toBe('token-respaldo');
  });

  it('cachea el resultado hasta que se limpia la caché', async () => {
    db.query.mockResolvedValue(filas({ twilio_auth_token: 'primero' }));

    await getTwilioConfig();
    await getTwilioConfig();
    expect(db.query).toHaveBeenCalledTimes(1);

    clearTwilioConfigCache();
    db.query.mockResolvedValue(filas({ twilio_auth_token: 'segundo' }));

    const config = await getTwilioConfig();
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(config.authToken).toBe('segundo');
  });
});
