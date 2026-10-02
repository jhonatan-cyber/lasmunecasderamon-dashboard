import { envioTalk, salidaEnvioTalk, type ConexionNet, type NetSdk } from './audioLib';
import {
  callbackDeAudio,
  cargarSdkNet,
  libreriaNet,
  type FuncionSdk,
  type LibreriaNet
} from './netSdk';

export { libreriaNet };
export type { LibreriaNet };

type FuncionAsync = FuncionSdk & { async: (...args: unknown[]) => void };

export async function conectarSdk(): Promise<NetSdk> {
  const sdk = await cargarSdkNet();
  const callbackAudio = await callbackDeAudio();

  const llamadaAsync = (fn: FuncionSdk, ...args: unknown[]): Promise<number> =>
    new Promise((resolve, reject) => {
      (fn as FuncionAsync).async(...args, (error: Error | null, value: number) =>
        error ? reject(error) : resolve(Number(value))
      );
    });

  const login = sdk.lib.func(
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

  const setDeviceMode = sdk.lib.func(
    'int CLIENT_SetDeviceMode(int64 h, int modo, void *param)'
  ) as (h: number, modo: number, param: Buffer) => number;

  const startTalk = sdk.lib.func(
    'int64 CLIENT_StartTalkEx(int64 h, void *cbAudio, uintptr_t usuario)'
  ) as FuncionSdk;

  const sendData = sdk.lib.func(
    'int64 CLIENT_TalkSendDataByStream(int64 h, void *input, void *output)'
  ) as FuncionSdk;

  const stopTalk = sdk.lib.func('int CLIENT_StopTalkEx(int64 h)') as FuncionSdk;
  const logoutFn = sdk.lib.func('int CLIENT_Logout(int64 h)') as (h: number) => number;
  const lastError = sdk.lib.func('uint32_t CLIENT_GetLastError()') as () => number;

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
    startTalkEx: h => llamadaAsync(startTalk, h, callbackAudio, 0),
    talkSendData: (talk, datos, tamano) => {
      const frame = Buffer.alloc(Math.max(800, tamano));
      datos.copy(frame, 0, 0, tamano);
      return llamadaAsync(
        sendData,
        talk,
        envioTalk(sdk.koffi.address(frame), frame.length),
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
