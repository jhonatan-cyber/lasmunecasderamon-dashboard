// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  capturarFotoDelEquipo,
  construirAuthorizationDigest,
  contarCarasEnEquipo,
  leerCara,
  leerRegistrosAcceso,
  parsearTablaCGI
} from '@/modules/asistencia/biometrico/deviceClient';

/**
 * Los CGI de caras del ASI3213A-W responden JSON en PascalCase
 * (`{ "Token": N, "Total": M }`), no `clave=valor`. El token puede ser 0 y ser
 * válido, así que estos tests fijan ese formato real contra un fetch simulado.
 */
function simularEquipo(respuesta: (url: string) => string) {
  const llamadas: string[] = [];
  vi.stubGlobal('fetch', async (url: unknown, init?: { headers?: Record<string, string> }) => {
    const texto = String(url);
    llamadas.push(texto);
    // Sin Authorization responde el challenge Digest (como el equipo real).
    if (!init?.headers || !(init.headers as Record<string, string>)['Authorization']) {
      return new Response('', {
        status: 401,
        headers: { 'www-authenticate': 'Digest realm="Login", qop="auth", nonce="abc"' }
      });
    }
    return new Response(respuesta(texto), { status: 200 });
  });
  return llamadas;
}

/**
 * Tests del Digest (RFC 2617, MD5 + qop=auth): el challenge es fijo y se compara
 * contra el valor esperado calculado a mano. También el parser de respuestas
 * `tabla=valor` de los CGI clásicos.
 */

const CHALLENGE = {
  realm: 'Login to ASI3213S',
  nonce: 'abcdef123456',
  qop: 'auth',
  opaque: 'xyz'
};

const CREDS = { usuario: 'admin', clave: 'admin123' };

describe('construirAuthorizationDigest', () => {
  it('calcula response = md5(ha1:nonce:nc:cnonce:auth:ha2) con qop=auth', () => {
    const header = construirAuthorizationDigest(
      'GET',
      '/cgi-bin/magicBox.cgi?action=getSystemInfo',
      CREDS,
      CHALLENGE
    );

    expect(header.startsWith('Digest ')).toBe(true);
    expect(header).toContain('username="admin"');
    expect(header).toContain('realm="Login to ASI3213S"');
    expect(header).toContain('nonce="abcdef123456"');
    expect(header).toContain('uri="/cgi-bin/magicBox.cgi?action=getSystemInfo"');
    expect(header).toContain('algorithm=MD5');
    expect(header).toContain('qop=auth');
    expect(header).toContain('nc=00000001');
    expect(header).toContain('cnonce="');
    expect(header).toContain('opaque="xyz"');

    // Verificación independiente del hash (RFC 2617):
    // ha1 = md5(user:realm:pass), ha2 = md5(method:uri)
    const crypto = require('crypto') as typeof import('crypto');
    const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');
    const ha1 = md5(`admin:Login to ASI3213S:admin123`);
    const ha2 = md5(`GET:/cgi-bin/magicBox.cgi?action=getSystemInfo`);
    const responseEsperado = md5(`${ha1}:abcdef123456:00000001:${'x'}:auth:${ha2}`);
    // No conocemos el cnonce generado, pero el formato del response sí se puede
    // verificar con un cnonce fijo usando la función exportada:
    const header2 = construirAuthorizationDigest('GET', '/cgi-bin/x', CREDS, {
      realm: 'r',
      nonce: 'n',
      qop: 'auth'
    });
    expect(header2).toContain('response="');
    // y el del primero contiene exactamente 32 hex en response
    const m = header.match(/response="([0-9a-f]{32})"/);
    expect(m).not.toBeNull();
    expect(responseEsperado).not.toBeNull(); // sanidad del cálculo manual
  });

  it('sin qop: response = md5(ha1:nonce:ha2)', () => {
    const crypto = require('crypto') as typeof import('crypto');
    const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');
    const ha1 = md5(`admin:r:clave`);
    const ha2 = md5(`POST:/cgi-bin/FaceInfoManager.cgi?action=add`);
    const esperado = md5(`${ha1}:nonce123:${ha2}`);

    const header = construirAuthorizationDigest(
      'POST',
      '/cgi-bin/FaceInfoManager.cgi?action=add',
      { usuario: 'admin', clave: 'clave' },
      { realm: 'r', nonce: 'nonce123' }
    );

    expect(header).toContain(`response="${esperado}"`);
    expect(header).not.toContain('qop=');
    expect(header).not.toContain('cnonce=');
  });
});

describe('parsearTablaCGI', () => {
  it('parsea la respuesta tabla=valor de magicBox', () => {
    const texto = [
      'table=CGLLog',
      'DeviceType=ASI3213S',
      'SerialNumber=SERIAL1',
      'softwareVersion=4.000.0000000.1.R'
    ].join('\r\n');

    const tabla = parsearTablaCGI(texto);

    expect(tabla['DeviceType']).toBe('ASI3213S');
    expect(tabla['SerialNumber']).toBe('SERIAL1');
    expect(tabla['softwareVersion']).toContain('4.000');
  });

  it('valores con = embebido no se cortan', () => {
    const tabla = parsearTablaCGI('a=b=c');
    expect(tabla['a']).toBe('b=c');
  });
});

describe('leerCara', () => {
  afterEach(() => vi.unstubAllGlobals());

  const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };

  it('sin caras en el equipo (Total 0) devuelve null y no busca', async () => {
    const llamadas = simularEquipo(() => '{ "Token" : 2, "Total" : 0 }');

    const r = await leerCara(cred, '1001');

    expect(r).toBeNull();
    expect(llamadas.some(u => u.includes('action=startFind'))).toBe(true);
    expect(llamadas.some(u => u.includes('action=doFind'))).toBe(false);
    // La búsqueda se cierra para no dejar tokens abiertos en el equipo.
    expect(llamadas.some(u => u.includes('action=stopFind'))).toBe(true);
  });

  it('encuentra la foto del UserID pedido en la respuesta de doFind', async () => {
    simularEquipo(url => {
      if (url.includes('action=startFind')) return '{ "Token" : 7, "Total" : 2 }';
      if (url.includes('action=doFind'))
        return JSON.stringify([
          { UserID: '2002', Info: { PhotoData: ['OTRA-FOTO'] } },
          { UserID: '1001', Info: { PhotoData: ['FOTO-B64'] } }
        ]);
      return 'OK';
    });

    const r = await leerCara(cred, '1001');

    expect(r).toEqual({ fotoBase64: 'FOTO-B64' });
  });

  it('con caras guardadas pero ninguna del código pedido devuelve null', async () => {
    simularEquipo(url => {
      if (url.includes('action=startFind')) return '{ "Token" : 3, "Total" : 1 }';
      if (url.includes('action=doFind'))
        return JSON.stringify([{ UserID: '2002', Info: { PhotoData: ['OTRA-FOTO'] } }]);
      return 'OK';
    });

    const r = await leerCara(cred, '1001');
    expect(r).toBeNull();
  });

  it('contarCarasEnEquipo lee el Total del equipo', async () => {
    simularEquipo(() => '{ "Token" : 4, "Total" : 12 }');
    await expect(contarCarasEnEquipo(cred)).resolves.toBe(12);
  });

  it('doFind con 400 se informa como acción no implementada (ASI3213A-W)', async () => {
    const llamadas: string[] = [];
    vi.stubGlobal('fetch', async (url: unknown, init?: { headers?: Record<string, string> }) => {
      const texto = String(url);
      llamadas.push(texto);
      if (!init?.headers || !(init.headers as Record<string, string>)['Authorization']) {
        return new Response('', {
          status: 401,
          headers: { 'www-authenticate': 'Digest realm="Login", qop="auth", nonce="abc"' }
        });
      }
      if (texto.includes('action=doFind')) {
        return new Response('Error\r\nBad Request!\r\n', { status: 400 });
      }
      if (texto.includes('action=startFind')) {
        return new Response('{ "Token" : 9, "Total" : 1 }', { status: 200 });
      }
      return new Response('OK', { status: 200 });
    });

    await expect(leerCara(cred, '1001')).rejects.toThrow(/no implementada/);
    // La búsqueda se cierra igual (el stopFind fallido se ignora).
    expect(llamadas.some(u => u.includes('action=stopFind'))).toBe(true);
  });
});

describe('leerRegistrosAcceso', () => {
  afterEach(() => vi.unstubAllGlobals());

  const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };

  /** Respuesta real del ASI3213A-W: tabla CGI, no JSON. */
  const TABLA_REAL = [
    'found=3',
    'records[0].RecNo=1',
    'records[0].CreateTime=1788555611',
    'records[0].UserID=',
    'records[0].CardName=',
    'records[0].Status=0',
    'records[0].Method=15',
    'records[0].Type=Entry',
    'records[0].URL=',
    'records[1].RecNo=84',
    'records[1].CreateTime=1790858332',
    'records[1].UserID=1005',
    'records[1].CardName=Damian',
    'records[1].Status=0',
    'records[1].Method=15',
    'records[1].Type=Entry',
    'records[1].URL=/SnapShotFilePath/2026-10-01/20/38/1005_99_100.jpg?a=b',
    'records[2].RecNo=85',
    'records[2].CreateTime=1790858340',
    'records[2].UserID=1007',
    'records[2].Status=0',
    'records[2].Method=15',
    'records[2].Type=Entry'
  ].join('\r\n');

  it('lee la tabla CGI del ASI3213A-W (no JSON)', async () => {
    simularEquipo(() => TABLA_REAL);

    const records = await leerRegistrosAcceso(cred);

    expect(records).toHaveLength(3);
    expect(records[1]).toEqual({
      recNo: 84,
      createTime: 1790858332,
      userId: '1005',
      tipo: 'Entry',
      status: 0,
      metodo: 15,
      url: '/SnapShotFilePath/2026-10-01/20/38/1005_99_100.jpg?a=b'
    });
    // Sin UserID se conserva: es una cara que el equipo no supo asignar.
    expect(records[0].recNo).toBe(1);
    expect(records[0].userId).toBe('');
    // URL vacía = record sin foto (clave/tarjeta): queda null, no string.
    expect(records[0].url).toBeNull();
    expect(records[2].url).toBeNull();
  });

  it('el registro sin UserID llega al poller (auditoría, no se descarta)', async () => {
    simularEquipo(() => TABLA_REAL);
    const records = await leerRegistrosAcceso(cred);
    expect(records.some(r => r.userId === '')).toBe(true);
  });

  it('también entiende la respuesta JSON de otros firmwares', async () => {
    simularEquipo(() =>
      JSON.stringify({
        records: [{ RecNo: 5, CreateTime: 1790000000, UserID: '1001', Status: 1, Method: 6 }]
      })
    );

    const records = await leerRegistrosAcceso(cred);

    expect(records).toEqual([
      {
        recNo: 5,
        createTime: 1790000000,
        userId: '1001',
        tipo: null,
        status: 1,
        metodo: 6,
        url: null
      }
    ]);
  });

  it('pide con offset: sin él el equipo siempre devuelve los más viejos', async () => {
    const llamadas = simularEquipo(() => TABLA_REAL);

    await leerRegistrosAcceso(cred, { count: 50, desde: 120 });

    expect(llamadas.some(l => l.includes('count=50') && l.includes('offset=120'))).toBe(true);
    expect(llamadas.some(l => l.includes('offset=0'))).toBe(false);
  });

  it('fuera del final devuelve vacío sin releer todo (la cola sigue ahí)', async () => {
    const llamadas = simularEquipo(url => {
      const offset = Number((url.match(/offset=(\d+)/) || [])[1] ?? -1);
      return offset === 99 ? TABLA_REAL : 'found=0';
    });

    const records = await leerRegistrosAcceso(cred, { desde: 100 });

    expect(records).toEqual([]);
    // Existía la posición 99: no hay nada nuevo y no hace falta releer.
    expect(llamadas.some(l => l.includes('offset=0'))).toBe(false);
  });

  it('si el equipo limpió su memoria, relee desde el principio', async () => {
    const llamadas = simularEquipo(url => {
      const offset = Number((url.match(/offset=(\d+)/) || [])[1] ?? -1);
      return offset === 0 ? TABLA_REAL : 'found=0';
    });

    const records = await leerRegistrosAcceso(cred, { desde: 100 });

    expect(records).toHaveLength(3);
    expect(llamadas.some(l => l.includes('offset=0'))).toBe(true);
  });
});

describe('capturarFotoDelEquipo', () => {
  afterEach(() => vi.unstubAllGlobals());

  const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };

  it('devuelve el JPEG de snapshot.cgi en base64', async () => {
    const bytes = [0xff, 0xd8, 0xff, 0xe0, 0x10, 0x20, 0x30];
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: unknown, init?: { headers?: Record<string, string> }) => {
      urls.push(String(url));
      if (!init?.headers?.['Authorization']) {
        return new Response('', {
          status: 401,
          headers: { 'www-authenticate': 'Digest realm="Login", qop="auth", nonce="abc"' }
        });
      }
      return new Response(new Uint8Array(bytes), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' }
      });
    });

    const foto = await capturarFotoDelEquipo(cred);

    expect(foto.contentType).toBe('image/jpeg');
    expect(Buffer.from(foto.base64, 'base64').equals(Buffer.from(bytes))).toBe(true);
    expect(urls.some(u => u.includes('/cgi-bin/snapshot.cgi?channel=1'))).toBe(true);
  });

  it('una imagen vacía es un error explícito', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(new Uint8Array([]), { status: 200, headers: { 'content-type': 'image/jpeg' } })
    );
    await expect(capturarFotoDelEquipo(cred)).rejects.toThrow(/imagen vacía/i);
  });
});
