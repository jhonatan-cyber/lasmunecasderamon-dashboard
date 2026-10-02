import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import logger from '@/lib/utils/logger';
import { libreriaNet, type LibreriaNet } from './audioSdk';
import { credencialesDeFila, type CredencialesEquipo } from './deviceClient';

const UMBRAL_SEGUNDOS = 300;

const COOLDOWN_MS = 6 * 60 * 60 * 1000;

const ESPERA_MS = 5_000;

const CONTROL_DEV_TIME = 121;

const cooldowns = new Map<string, number>();

interface FilaReloj {
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
}

type FnLogin = (
  ip: string,
  puerto: number,
  usuario: string,
  clave: string,
  emSpecCap: number,
  capParam: unknown,
  deviceInfo: Buffer,
  nError: Buffer
) => number;
type FnQueryTime = (h: number, pTime: Buffer, espera: number) => boolean;
type FnSetupTime = (h: number, pTime: Buffer) => boolean;
type FnControl = (h: number, tipo: number, pParam: Buffer, espera: number) => boolean;
type FnLogout = (h: number) => void;

function intentarFunc<T>(lib: LibreriaNet, prototipo: string): T | null {
  try {
    return lib.func(prototipo) as T;
  } catch {
    return null;
  }
}

export function netTimeDesdeFecha(fechaHoraNegocio: string): Buffer {
  const partes = fechaHoraNegocio.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!partes) throw new Error(`Fecha de negocio inválida: ${fechaHoraNegocio}`);
  const [, anio, mes, dia, hora, minuto, segundo] = partes;
  const b = Buffer.alloc(24);
  b.writeUInt32LE(Number(anio), 0);
  b.writeUInt32LE(Number(mes), 4);
  b.writeUInt32LE(Number(dia), 8);
  b.writeUInt32LE(Number(hora), 12);
  b.writeUInt32LE(Number(minuto), 16);
  b.writeUInt32LE(Number(segundo), 20);
  return b;
}

function formatearNetTime(b: Buffer): string {
  const p = (offset: number) => String(b.readUInt32LE(offset)).padStart(2, '0');
  return `${b.readUInt32LE(0)}-${p(4)}-${p(8)} ${p(12)}:${p(16)}:${p(20)}`;
}

function horaDeNegocio(): string {
  return getNowInBusinessTimezone();
}

async function conSesion<T>(
  lib: LibreriaNet,
  credenciales: CredencialesEquipo,
  accion: (h: number) => T
): Promise<T> {
  const login = intentarFunc<FnLogin>(
    lib,
    'int64 CLIENT_LoginEx2(const char *ip, uint16_t puerto, const char *usuario, const char *clave, int emSpecCap, void *capParam, void *deviceInfo, void *nError)'
  );
  if (!login) throw new Error('La librería NetSDK instalada no expone CLIENT_LoginEx2');

  const logout = intentarFunc<FnLogout>(lib, 'void CLIENT_Logout(int64 h)');
  if (!logout) throw new Error('La librería NetSDK instalada no expone CLIENT_Logout');

  const h = login(
    credenciales.ip,
    37777,
    credenciales.usuario,
    credenciales.clave,
    0,
    null,
    Buffer.alloc(8192),
    Buffer.alloc(4)
  );
  if (!h) throw new Error(`CLIENT_LoginEx2 rechazó la conexión a ${credenciales.ip}:37777`);

  try {
    return accion(h);
  } finally {
    logout(h);
  }
}

export async function sincronizarRelojEquipo(credenciales: CredencialesEquipo): Promise<void> {
  const lib = await libreriaNet();
  const setup = intentarFunc<FnSetupTime>(lib, 'bool CLIENT_SetupDeviceTime(int64 h, void *pTime)');
  const control = intentarFunc<FnControl>(
    lib,
    'bool CLIENT_ControlDevice(int64 h, int emControlType, void *pParam, int nWaitTime)'
  );
  if (!setup && !control) {
    throw new Error(
      'La librería NetSDK instalada no expone CLIENT_SetupDeviceTime ni CLIENT_ControlDevice'
    );
  }

  const netTime = netTimeDesdeFecha(horaDeNegocio());
  await conSesion(lib, credenciales, h => {
    const ok = setup ? setup(h, netTime) : control!(h, CONTROL_DEV_TIME, netTime, ESPERA_MS);
    if (!ok) {
      throw new Error(
        setup
          ? `CLIENT_SetupDeviceTime falló en ${credenciales.ip}`
          : `CLIENT_ControlDevice(DEV_TIME) falló en ${credenciales.ip}`
      );
    }
  });
}

export async function leerHoraEquipo(credenciales: CredencialesEquipo): Promise<string> {
  const lib = await libreriaNet();
  const queryTime = intentarFunc<FnQueryTime>(
    lib,
    'bool CLIENT_QueryDeviceTime(int64 h, void *pTime, int nWaitTime)'
  );
  if (!queryTime) throw new Error('La librería NetSDK instalada no expone CLIENT_QueryDeviceTime');

  return conSesion(lib, credenciales, h => {
    const buf = Buffer.alloc(24);
    if (!queryTime(h, buf, ESPERA_MS)) {
      throw new Error(`CLIENT_QueryDeviceTime falló en ${credenciales.ip}`);
    }
    return formatearNetTime(buf);
  });
}

export async function quizasSincronizarReloj(
  dispositivoId: string,
  serial: string,
  desfaseSegundos: number
): Promise<boolean> {
  if (!Number.isFinite(desfaseSegundos) || Math.abs(desfaseSegundos) < UMBRAL_SEGUNDOS) {
    return false;
  }
  const ultima = cooldowns.get(dispositivoId) ?? 0;
  if (Date.now() - ultima < COOLDOWN_MS) return false;

  cooldowns.set(dispositivoId, Date.now());
  try {
    const filas = await query<FilaReloj[]>(
      'SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE id = ? AND revocado_en IS NULL',
      [dispositivoId]
    );
    const credenciales = filas[0] ? credencialesDeFila(filas[0]) : null;
    if (!credenciales) {
      logger.warn('[biometric-clock] Equipo sin credenciales para sincronizar el reloj', {
        serial
      });
      return false;
    }

    await sincronizarRelojEquipo(credenciales);
    logger.warn('[biometric-clock] Reloj del lector corregido con la hora del servidor', {
      serial,
      desfaseSegundos: Math.round(desfaseSegundos)
    });
    return true;
  } catch (error) {
    logger.warn('[biometric-clock] No se pudo sincronizar el reloj del lector', {
      serial,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

export function reiniciarCooldowns(): void {
  cooldowns.clear();
}
