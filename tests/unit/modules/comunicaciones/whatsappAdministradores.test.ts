// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * La configuración de WhatsApp por administrador resuelve a quién se avisa y desde
 * qué cuenta de Twilio. Se prueba la resolución de destinos y el fan-out real, con
 * el repositorio SQL y Twilio mockeados: lo que importa acá es la decisión, no la red.
 */
const repo = vi.hoisted(() => ({
  listarAdministradoresWhatsApp: vi.fn(),
  listarAdministradoresActivos: vi.fn(),
  listarUsuariosAdministradores: vi.fn(),
  esUsuarioAdministrador: vi.fn(),
  obtenerAdministradorWhatsApp: vi.fn(),
  guardarAdministradorWhatsApp: vi.fn(),
  eliminarAdministradorWhatsApp: vi.fn()
}));
const mocks = vi.hoisted(() => ({ create: vi.fn(), registrar: vi.fn() }));

vi.mock('@/modules/comunicaciones/whatsapp/administradoresRepositorio', () => repo);
vi.mock('@/modules/comunicaciones/whatsapp/seguimiento', () => ({
  registrarEntregaWhatsApp: mocks.registrar
}));
vi.mock('twilio', () => ({ default: () => ({ messages: { create: mocks.create } }) }));
vi.mock('@/lib/business/twilioConfig', () => ({
  getTwilioConfig: vi.fn().mockResolvedValue({
    accountSid: 'AC' + 'g'.repeat(32),
    authToken: 'token-global',
    whatsappNumber: '+14000000000'
  })
}));
vi.mock('@/lib/business/whatsappConfig', () => ({ getAdminWhatsApp: vi.fn() }));

import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import {
  AUTH_TOKEN_MASK,
  credencialesParaWebhook,
  eliminarConfigAdministrador,
  guardarConfigAdministrador,
  numerosAdministradores,
  resolverDestinosWhatsApp
} from '@/modules/comunicaciones/whatsapp/administradores';
import { enviarWhatsAppAAdministradores } from '@/modules/comunicaciones/whatsapp/adaptador';

const GLOBAL_SID = 'AC' + 'g'.repeat(32);
const SID_BETO = 'AC' + 'b'.repeat(32);

/** Fila activa tal como la devuelve el repositorio, con los valores globales por defecto. */
const activo = (overrides: Record<string, unknown> = {}) => ({
  usuarioId: 'u1',
  nombre: 'Ana',
  apellido: 'Perez',
  nick: null,
  destino: '+56911111111',
  accountSid: null,
  authToken: null,
  whatsappNumber: null,
  activo: 1,
  ...overrides
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://dashboard.example.com');
  repo.listarAdministradoresActivos.mockResolvedValue([]);
  repo.obtenerAdministradorWhatsApp.mockResolvedValue(null);
  repo.esUsuarioAdministrador.mockResolvedValue(true);
  repo.guardarAdministradorWhatsApp.mockResolvedValue(undefined);
  repo.eliminarAdministradorWhatsApp.mockResolvedValue(undefined);
  vi.mocked(getAdminWhatsApp).mockResolvedValue('');
  mocks.create.mockResolvedValue({ sid: 'SM' + 'b'.repeat(32), status: 'queued' });
  mocks.registrar.mockResolvedValue(undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe('resolverDestinosWhatsApp', () => {
  it('arma un destino por administrador y usa las credenciales globales si no tiene propias', async () => {
    repo.listarAdministradoresActivos.mockResolvedValue([
      activo(),
      activo({
        usuarioId: 'u2',
        nombre: 'Beto',
        apellido: 'Soto',
        destino: '56922222222',
        accountSid: SID_BETO,
        authToken: 'token-beto',
        whatsappNumber: '+15005550006'
      })
    ]);

    const destinos = await resolverDestinosWhatsApp();

    expect(destinos).toHaveLength(2);
    expect(destinos[0]).toMatchObject({
      accountSid: GLOBAL_SID,
      authToken: 'token-global',
      whatsappNumber: '+14000000000',
      destino: '+56911111111'
    });
    expect(destinos[1]).toMatchObject({
      accountSid: SID_BETO,
      authToken: 'token-beto',
      whatsappNumber: '+15005550006',
      destino: '56922222222'
    });
  });

  it('cae al número global cuando no hay administradores configurados', async () => {
    vi.mocked(getAdminWhatsApp).mockResolvedValue('59170000000');

    expect(await resolverDestinosWhatsApp()).toEqual([
      expect.objectContaining({ destino: '59170000000', accountSid: GLOBAL_SID })
    ]);
  });

  it('sin administradores ni número global no hay destinos', async () => {
    expect(await resolverDestinosWhatsApp()).toEqual([]);
  });
});

describe('numerosAdministradores', () => {
  it('autoriza los números de los administradores activos', async () => {
    repo.listarAdministradoresActivos.mockResolvedValue([
      activo(),
      activo({ usuarioId: 'u2', destino: '56922222222' })
    ]);

    expect((await numerosAdministradores()).size).toBe(2);
  });

  it('sin administradores usa el número global como único autorizado', async () => {
    vi.mocked(getAdminWhatsApp).mockResolvedValue('59170000000');

    expect([...(await numerosAdministradores())]).toEqual(['59170000000']);
  });
});

describe('credencialesParaWebhook', () => {
  it('incluye la cuenta global una sola vez más la propia de cada administrador', async () => {
    repo.listarAdministradoresActivos.mockResolvedValue([
      activo(),
      activo({
        usuarioId: 'u2',
        destino: '56922222222',
        accountSid: SID_BETO,
        authToken: 'token-beto'
      })
    ]);

    expect(await credencialesParaWebhook()).toEqual([
      { accountSid: GLOBAL_SID, authToken: 'token-global' },
      { accountSid: SID_BETO, authToken: 'token-beto' }
    ]);
  });
});

describe('enviarWhatsAppAAdministradores', () => {
  it('envía a cada administrador desde su propia cuenta de Twilio', async () => {
    repo.listarAdministradoresActivos.mockResolvedValue([
      activo({ accountSid: SID_BETO, authToken: 'token-beto', whatsappNumber: '+15005550006' }),
      activo({ usuarioId: 'u2', destino: '56922222222' })
    ]);

    const resultado = await enviarWhatsAppAAdministradores('hola');

    expect(resultado).toEqual({ enviados: 2, total: 2, destinos: ['••••1111', '••••2222'] });
    expect(mocks.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ to: 'whatsapp:+56911111111', from: 'whatsapp:+15005550006' })
    );
    expect(mocks.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: 'whatsapp:+56922222222', from: 'whatsapp:+14000000000' })
    );
  });

  it('un administrador que falla no impide el envío a los demás', async () => {
    repo.listarAdministradoresActivos.mockResolvedValue([
      activo(),
      activo({ usuarioId: 'u2', destino: '56922222222' })
    ]);
    mocks.create
      .mockRejectedValueOnce(new Error('twilio caído'))
      .mockResolvedValueOnce({ sid: 'SM' + 'c'.repeat(32), status: 'queued' });

    expect(await enviarWhatsAppAAdministradores('hola')).toMatchObject({ enviados: 1, total: 2 });
  });

  it('lanza si no hay ningún destino configurado', async () => {
    await expect(enviarWhatsAppAAdministradores('hola')).rejects.toThrow(
      'Configura el WhatsApp del administrador'
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('lanza si el envío falla para todos los administradores', async () => {
    repo.listarAdministradoresActivos.mockResolvedValue([activo()]);
    mocks.create.mockRejectedValue(new Error('twilio caído'));

    await expect(enviarWhatsAppAAdministradores('hola')).rejects.toThrow(
      'WhatsApp rechazó el envío a todos los administradores'
    );
  });
});

describe('guardarConfigAdministrador', () => {
  it('guarda la configuración válida de un administrador', async () => {
    expect(await guardarConfigAdministrador('u1', { destino: '+56911111111' })).toBeNull();
    expect(repo.guardarAdministradorWhatsApp).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ destino: '+56911111111', activo: true })
    );
  });

  it('rechaza un destino que no es un número', async () => {
    expect(await guardarConfigAdministrador('u1', { destino: 'correo@ejemplo.cl' })).toContain(
      'número válido'
    );
    expect(repo.guardarAdministradorWhatsApp).not.toHaveBeenCalled();
  });

  it('rechaza un Account SID que no empieza con AC', async () => {
    expect(
      await guardarConfigAdministrador('u1', { destino: '+56911111111', accountSid: 'AC123' })
    ).toContain('Account SID');
    expect(repo.guardarAdministradorWhatsApp).not.toHaveBeenCalled();
  });

  it('conserva el Auth Token guardado cuando llega enmascarado', async () => {
    repo.obtenerAdministradorWhatsApp.mockResolvedValue({
      destino: '+56911111111',
      accountSid: null,
      authToken: 'token-previo-123456',
      whatsappNumber: null,
      activo: 1
    });

    const error = await guardarConfigAdministrador('u1', {
      destino: '+56911111111',
      authToken: AUTH_TOKEN_MASK
    });

    expect(error).toBeNull();
    expect(repo.guardarAdministradorWhatsApp).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ authToken: 'token-previo-123456' })
    );
  });

  it('rechaza a quien no tiene rol administrador', async () => {
    repo.esUsuarioAdministrador.mockResolvedValue(false);

    expect(await guardarConfigAdministrador('cajero-1', { destino: '+56911111111' })).toContain(
      'rol administrador'
    );
    expect(repo.guardarAdministradorWhatsApp).not.toHaveBeenCalled();
  });
});

describe('eliminarConfigAdministrador', () => {
  it('borra la configuración del administrador', async () => {
    await eliminarConfigAdministrador('u1');
    expect(repo.eliminarAdministradorWhatsApp).toHaveBeenCalledWith('u1');
  });
});
