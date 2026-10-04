// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { abrirPuerta } from '@/modules/asistencia/biometrico/puertaClient';
import {
  DeviceAuthError,
  DeviceConnectionError
} from '@/modules/asistencia/biometrico/deviceClient';

const CREDS = { ip: '10.62.213.212', usuario: 'admin', clave: 'Admin123' };

interface Llamada {
  url: string;
  headers: Record<string, string>;
}

function simularEquipo(responder: (llamada: Llamada, indice: number) => Response): Llamada[] {
  const llamadas: Llamada[] = [];
  vi.stubGlobal('fetch', async (url: unknown, init?: { headers?: Record<string, string> }) => {
    const llamada: Llamada = {
      url: String(url),
      headers: { ...(init?.headers ?? {}) }
    };
    llamadas.push(llamada);
    return responder(llamada, llamadas.length - 1);
  });
  return llamadas;
}

const challenge = new Response('', {
  status: 401,
  headers: { 'www-authenticate': 'Digest realm="Login", qop="auth", nonce="abc"' }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('abrirPuerta', () => {
  it('llama al CGI oficial con openDoor, canal y Type=Remote', async () => {
    const llamadas = simularEquipo(() => new Response('OK', { status: 200 }));

    await abrirPuerta(CREDS);

    expect(llamadas).toHaveLength(1);
    const url = new URL(llamadas[0].url);
    expect(url.pathname).toBe('/cgi-bin/accessControl.cgi');
    expect(url.searchParams.get('action')).toBe('openDoor');
    expect(url.searchParams.get('channel')).toBe('1');
    expect(url.searchParams.get('Type')).toBe('Remote');
    expect(url.searchParams.get('UserID')).toBeNull();
  });

  it('manda el código del usuario codificado y recorta espacios', async () => {
    const llamadas = simularEquipo(() => new Response('OK', { status: 200 }));

    await abrirPuerta(CREDS, { usuarioId: ' 1001 ' });

    const url = new URL(llamadas[0].url);
    expect(url.searchParams.get('UserID')).toBe('1001');
  });

  it('reintenta con Digest cuando el equipo responde 401', async () => {
    const llamadas = simularEquipo((_, indice) =>
      indice === 0 ? challenge : new Response('OK', { status: 200 })
    );

    await abrirPuerta(CREDS);

    expect(llamadas).toHaveLength(2);
    expect(llamadas[0].headers['Authorization']).toBeUndefined();
    const auth = llamadas[1].headers['Authorization'] ?? '';
    expect(auth.startsWith('Digest ')).toBe(true);
    expect(auth).toContain('username="admin"');
    expect(auth).toContain(
      'uri="/cgi-bin/accessControl.cgi?action=openDoor&channel=1&Type=Remote"'
    );
  });

  it('401 persistente es error de credenciales', async () => {
    simularEquipo(() => challenge);

    await expect(abrirPuerta(CREDS)).rejects.toBeInstanceOf(DeviceAuthError);
  });

  it('respuesta HTTP distinta de 200 es error de conexión', async () => {
    simularEquipo(() => new Response('Internal Server Error', { status: 500 }));

    await expect(abrirPuerta(CREDS)).rejects.toBeInstanceOf(DeviceConnectionError);
  });

  it('cuerpo distinto de OK no abre (el equipo rechazó)', async () => {
    simularEquipo(() => new Response('Invalid parameter', { status: 200 }));

    await expect(abrirPuerta(CREDS)).rejects.toThrow('no abrió la puerta');
  });

  it('caída de red queda como error de conexión', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED');
    });

    await expect(abrirPuerta(CREDS)).rejects.toBeInstanceOf(DeviceConnectionError);
  });

  it('acepta canal distinto de 1', async () => {
    const llamadas = simularEquipo(() => new Response('OK', { status: 200 }));

    await abrirPuerta(CREDS, { canal: 2 });

    expect(new URL(llamadas[0].url).searchParams.get('channel')).toBe('2');
  });
});
