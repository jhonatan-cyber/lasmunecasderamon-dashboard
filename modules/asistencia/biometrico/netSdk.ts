import fs from 'node:fs';
import path from 'node:path';

/**
 * Punto único de arranque del NetSDK de Dahua.
 *
 * Resuelve carpeta y nombre de la librería nativa según la plataforma
 * (`dhnetsdk.dll` en Windows, `libdhnetsdk.so` en Linux), la carga con koffi,
 * ejecuta `CLIENT_Init` una sola vez por proceso y cachea el resultado en
 * `globalThis.__dahuaSdkFacial`.
 *
 * El facial, el audio, las fotos y el reloj consumen este módulo en lugar de
 * repetir el arranque. `scripts/biometric-events-sdk.cjs` corre en un proceso
 * aparte y sólo duplica la resolución de carpeta/nombre, que no se puede
 * compartir con TypeScript sin empaquetarlo.
 */

export interface FuncionSdk {
  (...args: unknown[]): unknown;
}

export interface LibreriaNet {
  func(prototipo: string): FuncionSdk;
}

export interface ModuloKoffi {
  load(ruta: string): unknown;
  proto(...argumentos: unknown[]): unknown;
  register(callback: (...args: unknown[]) => void, tipo: unknown): unknown;
  unregister(callback: unknown): void;
  pointer(tipo: unknown): unknown;
  address(buffer: Buffer): number;
}

export interface SdkNet {
  lib: LibreriaNet;
  koffi: ModuloKoffi;
  direccion: (buffer: Buffer) => number;
  callbacks: unknown[];
  callbackAudio: unknown;
}

const ES_WINDOWS = process.platform === 'win32';

const CARPETA_DEFECTO = ES_WINDOWS ? 'C:\\Program Files\\SmartPSSLite' : '/opt/SmartPSSLite';

export const NOMBRE_LIBRERIA = ES_WINDOWS ? 'dhnetsdk.dll' : 'libdhnetsdk.so';

type CacheSdk = typeof globalThis & { __dahuaSdkFacial?: SdkNet | null };

/** koffi registra los prototipos por nombre: cada uno necesita el suyo. */
let prototiposRegistrados = 0;

export function carpetaSdk(entorno: NodeJS.ProcessEnv = process.env): string {
  return entorno.DAHUA_SDK_DIR?.trim() || CARPETA_DEFECTO;
}

export function rutaLibreria(entorno: NodeJS.ProcessEnv = process.env): string {
  return path.join(carpetaSdk(entorno), NOMBRE_LIBRERIA);
}

/**
 * Deja la carpeta del SDK a mano del cargador dinámico: `PATH` en Windows y
 * además `LD_LIBRARY_PATH` en Linux, donde las dependencias de
 * `libdhnetsdk.so` no se resuelven por `PATH`.
 */
export function prepararEntornoNativo(entorno: NodeJS.ProcessEnv = process.env): void {
  const carpeta = carpetaSdk(entorno);
  const separador = path.delimiter;
  if (!(entorno.PATH || '').split(separador).includes(carpeta)) {
    entorno.PATH = `${entorno.PATH || ''}${separador}${carpeta}`;
  }
  if (ES_WINDOWS) return;
  if (!(entorno.LD_LIBRARY_PATH || '').split(separador).includes(carpeta)) {
    entorno.LD_LIBRARY_PATH = `${entorno.LD_LIBRARY_PATH || ''}${separador}${carpeta}`;
  }
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function importarKoffi(): Promise<ModuloKoffi> {
  try {
    const modulo = (await import('koffi')) as unknown as { default?: ModuloKoffi } & ModuloKoffi;
    return (modulo.default ?? modulo) as ModuloKoffi;
  } catch (error) {
    throw new Error(
      `El puente FFI koffi no está disponible en el servidor (${mensajeDeError(error)}).`
    );
  }
}

/** Dirección de un buffer para el SDK sin haber cargado la librería aún. */
export async function direccionDe(buffer: Buffer): Promise<bigint> {
  const koffi = await importarKoffi();
  return BigInt(koffi.address(buffer));
}

export async function cargarSdkNet(): Promise<SdkNet> {
  const cache = globalThis as CacheSdk;
  if (cache.__dahuaSdkFacial) return cache.__dahuaSdkFacial;

  const ruta = rutaLibreria();
  if (!fs.existsSync(ruta)) {
    throw new Error(
      `No se encontró ${NOMBRE_LIBRERIA} en "${carpetaSdk()}". Instalá SmartPSS Lite o configurá DAHUA_SDK_DIR con la carpeta que tenga el SDK.`
    );
  }

  const koffi = await importarKoffi();
  prepararEntornoNativo();

  let lib: LibreriaNet;
  try {
    lib = koffi.load(ruta) as LibreriaNet;
  } catch (error) {
    throw new Error(`No se pudo cargar ${NOMBRE_LIBRERIA}: ${mensajeDeError(error)}`);
  }

  const callbacks: unknown[] = [];
  try {
    prototiposRegistrados += 1;
    const proto = koffi.proto(
      `void DesconexionNetSDK${prototiposRegistrados}(int64 h, const char *ip, int puerto, uintptr_t usuario)`
    );
    const desconectado = koffi.register(() => {}, koffi.pointer(proto));
    callbacks.push(desconectado);

    const init = lib.func('bool CLIENT_Init(void *cbDisconnect, uintptr_t dwUser)');
    if (!init(desconectado, 0)) throw new Error('CLIENT_Init devolvió false');
  } catch (error) {
    for (const callback of callbacks) {
      try {
        koffi.unregister(callback);
      } catch {
        // El puente ya cerró el callback: no hay nada que deshacer.
      }
    }
    throw new Error(`CLIENT_Init falló: ${mensajeDeError(error)}`);
  }

  const sdk: SdkNet = {
    lib,
    koffi,
    direccion: buffer => koffi.address(buffer),
    callbacks,
    callbackAudio: null
  };
  cache.__dahuaSdkFacial = sdk;
  return sdk;
}

export async function libreriaNet(): Promise<LibreriaNet> {
  return (await cargarSdkNet()).lib;
}

/** Callback de audio de `CLIENT_StartTalkEx`, registrado una sola vez. */
export async function callbackDeAudio(): Promise<unknown> {
  const sdk = await cargarSdkNet();
  if (!sdk.callbackAudio) {
    prototiposRegistrados += 1;
    const proto = sdk.koffi.proto(
      `void AudioProbeNetSDK${prototiposRegistrados}(int64 h, void *data, int tamano, uint8_t flag, uintptr_t usuario)`
    );
    sdk.callbackAudio = sdk.koffi.register(() => {}, sdk.koffi.pointer(proto));
  }
  return sdk.callbackAudio;
}
