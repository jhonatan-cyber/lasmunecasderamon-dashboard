// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  CHUNK_BYTES,
  COLA_MS,
  RATE_TALK_HZ,
  altavozTalk,
  envioTalk,
  formatoTalk,
  reproducirAudio,
  salidaEnvioTalk,
  type ConexionNet,
  type NetSdk
} from '@/modules/asistencia/biometrico/audioLib';

/**
 * Tests del núcleo de audio por streaming Talk: los structs binarios que come
 * el NetSDK, la secuencia login → formato → altavoz → talk → chunks → stop, y
 * el RELOJ ABSOLUTO del envío (verificado contra el ASI3213A-W real).
 *
 * El SDK es un doble inyectado: acá no hay koffi ni hardware.
 */

const cred: ConexionNet = { ip: '192.168.0.5', usuario: 'admin', clave: 'secreta' };

interface DobleSdk {
  net: NetSdk;
  llamadas: string[];
  login: ReturnType<typeof vi.fn>;
  setDeviceMode: ReturnType<typeof vi.fn>;
  startTalkEx: ReturnType<typeof vi.fn>;
  talkSendData: ReturnType<typeof vi.fn>;
  stopTalkEx: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  /** Bytes totales aceptados por el equipo falso. */
  enviados: () => number;
}

function sdkFalso(
  opciones: {
    login?: number;
    setDeviceMode?: number;
    startTalk?: number;
    /** Retorno de cada envío; por omisión, los bytes del chunk. */
    alEnviar?: (datos: Buffer, numero: number) => number;
    /** Efecto lateral por envío (p. ej. avanzar el reloj de prueba). */
    duranteEnvio?: (datos: Buffer, numero: number) => void;
    stopTalk?: () => Promise<number>;
  } = {}
): DobleSdk {
  const llamadas: string[] = [];
  let total = 0;
  let numero = 0;

  const login = vi.fn(() => {
    llamadas.push('login');
    return opciones.login ?? 777;
  });
  const setDeviceMode = vi.fn((_h: number, modo: number) => {
    llamadas.push(`modo:${modo}`);
    return opciones.setDeviceMode ?? 1;
  });
  const startTalkEx = vi.fn(async () => {
    llamadas.push('startTalk');
    return opciones.startTalk ?? 555;
  });
  const talkSendData = vi.fn(async (_talk: number, datos: Buffer) => {
    numero += 1;
    llamadas.push(`envio:${datos.length}`);
    opciones.duranteEnvio?.(datos, numero);
    const devuelto = opciones.alEnviar ? opciones.alEnviar(datos, numero) : datos.length;
    if (devuelto > 0) total += devuelto;
    return devuelto;
  });
  const stopTalkEx = vi.fn(() => {
    llamadas.push('stopTalk');
    return opciones.stopTalk ? opciones.stopTalk() : Promise.resolve(1);
  });
  const logout = vi.fn(() => {
    llamadas.push('logout');
  });

  return {
    net: {
      login,
      setDeviceMode,
      startTalkEx,
      talkSendData,
      stopTalkEx,
      logout,
      getLastError: vi.fn(() => 0)
    } as unknown as NetSdk,
    llamadas,
    login,
    setDeviceMode,
    startTalkEx,
    talkSendData,
    stopTalkEx,
    logout,
    enviados: () => total
  };
}

/** Reloj monótono falso: solo avanza cuando el código espera. */
function relojFalso() {
  const esperas: number[] = [];
  let reloj = 0;
  return {
    esperas,
    avanzar: (ms: number) => {
      reloj += ms;
    },
    opciones: {
      ahora: () => reloj,
      esperar: async (ms: number) => {
        esperas.push(ms);
        reloj += ms;
      }
    }
  };
}

describe('structs del Talk', () => {
  it('formatoTalk: PCM s16le mono 16 kHz en 76 bytes', () => {
    const b = formatoTalk();

    expect(b.length).toBe(76);
    expect(b.readInt32LE(0)).toBe(1); // 16 bits por muestra
    expect(b.readInt32LE(4)).toBe(16);
    expect(b.readInt32LE(8)).toBe(RATE_TALK_HZ);
    expect(b.readInt32LE(12)).toBe(25); // 25 ms por paquete
  });

  it('altavozTalk: modo altavoz en 16 bytes', () => {
    const b = altavozTalk();

    expect(b.length).toBe(16);
    expect(b.readUInt32LE(0)).toBe(16);
    expect(b.readInt32LE(4)).toBe(1);
    expect(b.readInt32LE(8)).toBe(0);
    expect(b.readInt32LE(12)).toBe(1);
  });

  it('envioTalk: NET_IN_TALK_SEND_DATA_STREAM de 40 bytes con puntero y formato', () => {
    const b = envioTalk(0x00abcdef, 800);

    expect(b.length).toBe(40);
    expect(b.readUInt32LE(0)).toBe(40);
    expect(b.readBigUInt64LE(8)).toBe(0x00abcdefn);
    expect(b.readUInt32LE(16)).toBe(800);
    expect(b.readInt32LE(20)).toBe(1);
    expect(b.readInt32LE(24)).toBe(1);
    expect(b.readInt32LE(28)).toBe(16);
    expect(b.readInt32LE(32)).toBe(RATE_TALK_HZ);
  });

  it('salidaEnvioTalk: NET_OUT de 4 bytes', () => {
    const b = salidaEnvioTalk();

    expect(b.length).toBe(4);
    expect(b.readUInt32LE(0)).toBe(4);
  });
});

describe('reproducirAudio', () => {
  it('hace la secuencia completa y cierra la sesión', async () => {
    const sdk = sdkFalso();
    const reloj = relojFalso();
    const pcm = Buffer.alloc(1600, 7);

    const r = await reproducirAudio(sdk.net, cred, pcm, { ...reloj.opciones, colaMs: 0 });

    expect(r).toEqual({ enviados: 1600 });
    expect(sdk.llamadas).toEqual([
      'login',
      'modo:2',
      'modo:7',
      'startTalk',
      'envio:800',
      'envio:800',
      'stopTalk',
      'logout'
    ]);
    expect(sdk.login).toHaveBeenCalledWith(cred);
  });

  it('parte el PCM en chunks de 800 B y el último va recortado', async () => {
    const sdk = sdkFalso();
    const reloj = relojFalso();

    const r = await reproducirAudio(sdk.net, cred, Buffer.alloc(2000), {
      ...reloj.opciones,
      colaMs: 0
    });

    expect(sdk.llamadas.filter(l => l.startsWith('envio'))).toEqual([
      'envio:800',
      'envio:800',
      'envio:400'
    ]);
    expect(r.enviados).toBe(2000);
  });

  it('respeta un chunkBytes distinto (un solo envío si el audio es más corto)', async () => {
    const sdk = sdkFalso();

    await reproducirAudio(sdk.net, cred, Buffer.alloc(500), { chunkBytes: 4096, colaMs: 0 });

    expect(sdk.llamadas.filter(l => l.startsWith('envio'))).toEqual(['envio:500']);
  });

  it('pauta con reloj ABSOLUTO: el chunk k sale a los k·25 ms y después deja drenar', async () => {
    const sdk = sdkFalso();
    const reloj = relojFalso();

    await reproducirAudio(sdk.net, cred, Buffer.alloc(1600), reloj.opciones);

    // 800 B = 25 ms; los dos chunks se pautan y la cola final es de 800 ms.
    expect(reloj.esperas).toEqual([25, 25, COLA_MS]);
  });

  it('si el envío se atrasa no acumula espera: el reloj absoluto saltea la pausa', async () => {
    const reloj = relojFalso();
    // Cada envío tarda 30 ms (más que los 25 ms que dura el audio del chunk).
    const sdk = sdkFalso({ duranteEnvio: () => reloj.avanzar(30) });

    await reproducirAudio(sdk.net, cred, Buffer.alloc(1600), reloj.opciones);

    expect(reloj.esperas).toEqual([COLA_MS]); // solo la cola, sin pausas de datos
  });

  it('devuelve los bytes aceptados por el equipo, no los enviados a ciegas', async () => {
    const sdk = sdkFalso({ alEnviar: datos => datos.length });

    const r = await reproducirAudio(sdk.net, cred, Buffer.alloc(1600), { colaMs: 0 });

    expect(r.enviados).toBe(sdk.enviados());
  });

  it('sin PCM no toca el SDK', async () => {
    const sdk = sdkFalso();

    await expect(reproducirAudio(sdk.net, cred, Buffer.alloc(0))).rejects.toThrow('No hay PCM');

    expect(sdk.login).not.toHaveBeenCalled();
  });

  it('un login rechazado corta sin abrir talk ni cerrar sesión', async () => {
    const sdk = sdkFalso({ login: 0 });

    await expect(reproducirAudio(sdk.net, cred, Buffer.alloc(800))).rejects.toThrow(
      'CLIENT_LoginEx2'
    );

    expect(sdk.startTalkEx).not.toHaveBeenCalled();
    expect(sdk.logout).not.toHaveBeenCalled();
  });

  it('si falla el formato cierra la sesión (nunca deja el handle colgado)', async () => {
    const sdk = sdkFalso({ setDeviceMode: 0 });

    await expect(reproducirAudio(sdk.net, cred, Buffer.alloc(800))).rejects.toThrow(
      'CLIENT_SetDeviceMode(formato)'
    );

    expect(sdk.llamadas.at(-1)).toBe('logout');
    expect(sdk.startTalkEx).not.toHaveBeenCalled();
  });

  it('si el altavoz no se configura también cierra la sesión', async () => {
    let modo = 0;
    const sdk = sdkFalso();
    sdk.setDeviceMode.mockImplementation((_h: number, m: number) => {
      modo += 1;
      return modo === 1 ? 1 : 0;
    });

    await expect(reproducirAudio(sdk.net, cred, Buffer.alloc(800))).rejects.toThrow(
      'CLIENT_SetDeviceMode(altavoz)'
    );

    expect(sdk.llamadas.at(-1)).toBe('logout');
  });

  it('si StartTalkEx no da handle, avisa y cierra la sesión sin stopTalk', async () => {
    const sdk = sdkFalso({ startTalk: 0 });

    await expect(reproducirAudio(sdk.net, cred, Buffer.alloc(800))).rejects.toThrow(
      'CLIENT_StartTalkEx'
    );

    expect(sdk.stopTalkEx).not.toHaveBeenCalled();
    expect(sdk.llamadas.at(-1)).toBe('logout');
  });

  it('si el equipo rechaza un envío, corta y cierra el talk', async () => {
    const sdk = sdkFalso({ alEnviar: (_datos, numero) => (numero === 2 ? 0 : 800) });

    await expect(reproducirAudio(sdk.net, cred, Buffer.alloc(1600))).rejects.toThrow(
      'CLIENT_TalkSendDataByStream'
    );

    expect(sdk.stopTalkEx).toHaveBeenCalledTimes(1);
    expect(sdk.logout).toHaveBeenCalledTimes(1);
  });

  it('un fallo al cerrar el talk no impide el logout', async () => {
    const sdk = sdkFalso({ stopTalk: async () => Promise.reject(new Error('talk ya cerrado')) });

    await expect(reproducirAudio(sdk.net, cred, Buffer.alloc(800), { colaMs: 0 })).resolves.toEqual(
      {
        enviados: 800
      }
    );

    expect(sdk.logout).toHaveBeenCalledTimes(1);
  });

  it('usa el puerto 37777 y permite uno alternativo', async () => {
    const sdk = sdkFalso();

    await reproducirAudio(sdk.net, { ...cred, puerto: 8888 }, Buffer.alloc(800), { colaMs: 0 });

    expect(sdk.login).toHaveBeenCalledWith({ ...cred, puerto: 8888 });
  });

  it('con colaMs 0 no espera al final', async () => {
    const sdk = sdkFalso();
    const reloj = relojFalso();

    await reproducirAudio(sdk.net, cred, Buffer.alloc(800), { ...reloj.opciones, colaMs: 0 });

    expect(reloj.esperas).toEqual([25]);
    expect(CHUNK_BYTES).toBe(800);
  });
});
