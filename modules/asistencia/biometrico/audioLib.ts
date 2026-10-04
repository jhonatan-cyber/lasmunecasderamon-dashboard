export const RATE_TALK_HZ = 16_000;
export const CHUNK_BYTES = 800;
export const COLA_MS = 800;
const BYTES_POR_SEGUNDO = RATE_TALK_HZ * 2;
export interface ConexionNet {
  ip: string;
  usuario: string;
  clave: string;
  puerto?: number;
}

export interface NetSdk {
  login(conexion: ConexionNet): number;
  setDeviceMode(h: number, modo: number, param: Buffer): number;
  startTalkEx(h: number): Promise<number>;
  talkSendData(talk: number, datos: Buffer, tamano: number): Promise<number>;
  stopTalkEx(talk: number): Promise<number>;
  logout(h: number): void;
  getLastError(): number;
}

export function formatoTalk(): Buffer {
  const b = Buffer.alloc(76);
  b.writeInt32LE(1, 0);
  b.writeInt32LE(16, 4);
  b.writeInt32LE(RATE_TALK_HZ, 8);
  b.writeInt32LE(25, 12);
  return b;
}

export function altavozTalk(): Buffer {
  const b = Buffer.alloc(16);
  b.writeUInt32LE(16, 0);
  b.writeInt32LE(1, 4);
  b.writeInt32LE(0, 8);
  b.writeInt32LE(1, 12);
  return b;
}

export function envioTalk(direccion: number | bigint, tamano: number): Buffer {
  const b = Buffer.alloc(40);
  b.writeUInt32LE(40, 0);
  b.writeBigUInt64LE(BigInt(direccion), 8);
  b.writeUInt32LE(tamano, 16);
  b.writeInt32LE(1, 20);
  b.writeInt32LE(1, 24);
  b.writeInt32LE(16, 28);
  b.writeInt32LE(RATE_TALK_HZ, 32);
  return b;
}

export function salidaEnvioTalk(): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(4, 0);
  return b;
}

export interface OpcionesEnvio {
  chunkBytes?: number;
  colaMs?: number;
  ahora?: () => number;
  esperar?: (ms: number) => Promise<void>;
}

export async function reproducirAudio(
  net: NetSdk,
  conexion: ConexionNet,
  pcm: Buffer,
  opciones: OpcionesEnvio = {}
): Promise<{ enviados: number }> {
  if (pcm.length === 0) throw new Error('No hay PCM para enviar al lector.');

  const chunkBytes = opciones.chunkBytes ?? CHUNK_BYTES;
  const colaMs = opciones.colaMs ?? COLA_MS;
  const ahora = opciones.ahora ?? (() => performance.now());
  const esperar =
    opciones.esperar ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));

  const h = net.login(conexion);
  if (!h) {
    throw new Error(
      `CLIENT_LoginEx2 rechazó la conexión a ${conexion.ip} (código ${net.getLastError()})`
    );
  }

  let talk = 0;
  try {
    if (!net.setDeviceMode(h, 2, formatoTalk())) {
      throw new Error(`CLIENT_SetDeviceMode(formato) falló (código ${net.getLastError()})`);
    }
    if (!net.setDeviceMode(h, 7, altavozTalk())) {
      throw new Error(`CLIENT_SetDeviceMode(altavoz) falló (código ${net.getLastError()})`);
    }

    talk = await net.startTalkEx(h);
    if (!talk) {
      throw new Error(`CLIENT_StartTalkEx falló (código ${net.getLastError()})`);
    }

    const inicio = ahora();
    let enviados = 0;
    for (let offset = 0; offset < pcm.length; offset += chunkBytes) {
      const parte = pcm.subarray(offset, Math.min(offset + chunkBytes, pcm.length));
      const aceptados = await net.talkSendData(talk, parte, parte.length);
      if (Number(aceptados) <= 0) {
        throw new Error(`CLIENT_TalkSendDataByStream falló (código ${net.getLastError()})`);
      }
      enviados += parte.length;
      const objetivo = inicio + (enviados / BYTES_POR_SEGUNDO) * 1000;
      const falta = objetivo - ahora();
      if (falta > 0) await esperar(falta);
    }

    if (colaMs > 0) await esperar(colaMs);
    return { enviados };
  } finally {
    if (talk) await net.stopTalkEx(talk).catch(() => {});
    net.logout(h);
  }
}
