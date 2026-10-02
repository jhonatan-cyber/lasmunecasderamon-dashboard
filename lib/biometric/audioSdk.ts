import path from 'path';
import fs from 'fs';
import { envioTalk, salidaEnvioTalk, type ConexionNet, type NetSdk } from './audioLib';

type FuncionSdk = (...args: unknown[]) => unknown;
export type LibreriaNet = { func: (prototipo: string) => FuncionSdk };
type FuncionAsync = FuncionSdk & { async: (...args: unknown[]) => void };
type ModuloKoffi = {
  load(ruta: string): unknown;
  proto(firma: string): unknown;
  register(cb: (...args: unknown[]) => void, tipo: unknown): unknown;
  unregister(cb: unknown): void;
  pointer(tipo: unknown): unknown;
  address(buffer: Buffer): number;
};

interface SdkNet {
  lib: LibreriaNet;
  callbacks: unknown[];
}

let intento = 0;

const CARPETA_SDK = (process.env.DAHUA_SDK_DIR || 'C:\\Program Files\\SmartPSSLite').trim();
const RUTA_DLL = path.join(CARPETA_SDK, 'dhnetsdk.dll');

const cache = globalThis as typeof globalThis & {
  __dahuaSdkFacial?: { lib?: LibreriaNet } | null;
  __dahuaNetSdk?: SdkNet | null;
};

async function obtenerKoffi(): Promise<ModuloKoffi> {
  const modulo = (await import('koffi')) as unknown as { default?: ModuloKoffi } & ModuloKoffi;
  return (modulo.default ?? modulo) as ModuloKoffi;
}

function prepararPath(): void {
  if (!process.env.PATH?.includes(CARPETA_SDK)) {
    process.env.PATH = `${process.env.PATH || ''};${CARPETA_SDK}`;
  }
}

async function inicializarSdk(): Promise<SdkNet> {
  if (!fs.existsSync(RUTA_DLL)) {
    throw new Error(
      `No se encontró dhnetsdk.dll en "${CARPETA_SDK}". Instalá SmartPSS Lite o configurá DAHUA_SDK_DIR con la carpeta del SDK.`
    );
  }

  const koffi = await obtenerKoffi();
  prepararPath();

  let lib: LibreriaNet;
  try {
    lib = koffi.load(RUTA_DLL) as LibreriaNet;
  } catch (error) {
    throw new Error(
      `No se pudo cargar dhnetsdk.dll: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const callbacks: unknown[] = [];
  intento += 1;
  const sufijo = `Net${intento}`;
  try {
    const protoDesconexion = koffi.proto(
      `void Desconexion${sufijo}(int64 h, const char *ip, int puerto, uintptr_t usuario)`
    );
    const cbDesconexion = koffi.register(() => {}, koffi.pointer(protoDesconexion));
    callbacks.push(cbDesconexion);

    const init = lib.func('bool CLIENT_Init(void *cbDesconexion, uintptr_t usuario)') as (
      cb: unknown,
      usuario: number
    ) => boolean;
    if (!init(cbDesconexion, 0)) throw new Error('CLIENT_Init devolvió false');
  } catch (error) {
    for (const cb of callbacks) koffi.unregister(cb);
    throw new Error(`CLIENT_Init falló: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { lib, callbacks };
}

async function obtenerSdkNet(): Promise<SdkNet> {
  if (cache.__dahuaNetSdk) return cache.__dahuaNetSdk;
  if (cache.__dahuaSdkFacial?.lib) {
    cache.__dahuaNetSdk = { lib: cache.__dahuaSdkFacial.lib, callbacks: [] };
    return cache.__dahuaNetSdk;
  }
  const sdk = await inicializarSdk();
  cache.__dahuaNetSdk = sdk;
  return sdk;
}

export async function libreriaNet(): Promise<LibreriaNet> {
  const { lib } = await obtenerSdkNet();
  return lib;
}

export async function conectarSdk(): Promise<NetSdk> {
  const { lib, callbacks } = await obtenerSdkNet();
  const koffi = await obtenerKoffi();

  if (!callbacks[1]) {
    intento += 1;
    const protoAudio = koffi.proto(
      `void AudioProbe${intento}(int64 h, void *data, int size, uint8_t flag, uintptr_t user)`
    );
    callbacks[1] = koffi.register(() => {}, koffi.pointer(protoAudio));
  }

  const llamadaAsync = (fn: FuncionSdk, ...args: unknown[]): Promise<number> =>
    new Promise((resolve, reject) => {
      (fn as FuncionAsync).async(...args, (error: Error | null, value: number) =>
        error ? reject(error) : resolve(Number(value))
      );
    });

  const login = lib.func(
    'int64 CLIENT_LoginEx2(const char *ip, uint16_t puerto, const char *usuario, const char *clave, int emSpecCap, void *capParam, void *deviceInfo, void *nError)'
  ) as (
    ip: string,
    puerto: number,
    usuario: string,
    clave: string,
    emSpecCap: number,
    capParam: unknown,
    deviceInfo: Buffer,
    nError: Buffer
  ) => number;

  const setDeviceMode = lib.func('int CLIENT_SetDeviceMode(int64 h, int modo, void *param)') as (
    h: number,
    modo: number,
    param: Buffer
  ) => number;

  const startTalk = lib.func(
    'int64 CLIENT_StartTalkEx(int64 h, void *cbAudio, uintptr_t usuario)'
  ) as FuncionSdk;

  const sendData = lib.func(
    'int64 CLIENT_TalkSendDataByStream(int64 h, void *input, void *output)'
  ) as FuncionSdk;

  const stopTalk = lib.func('int CLIENT_StopTalkEx(int64 h)') as FuncionSdk;
  const logoutFn = lib.func('int CLIENT_Logout(int64 h)') as (h: number) => number;
  const lastError = lib.func('uint32_t CLIENT_GetLastError()') as () => number;

  return {
    login: (conexion: ConexionNet) =>
      login(
        conexion.ip,
        conexion.puerto ?? 37777,
        conexion.usuario,
        conexion.clave,
        0,
        null,
        Buffer.alloc(8192),
        Buffer.alloc(4)
      ),
    setDeviceMode,
    startTalkEx: h => llamadaAsync(startTalk, h, callbacks[1], 0),
    talkSendData: (talk, datos, tamano) => {
      const frame = Buffer.alloc(Math.max(800, tamano));
      datos.copy(frame, 0, 0, tamano);
      return llamadaAsync(
        sendData,
        talk,
        envioTalk(koffi.address(frame), frame.length),
        salidaEnvioTalk()
      );
    },
    stopTalkEx: talk => llamadaAsync(stopTalk, talk),
    logout: h => {
      logoutFn(h);
    },
    getLastError: () => Number(lastError())
  };
}
