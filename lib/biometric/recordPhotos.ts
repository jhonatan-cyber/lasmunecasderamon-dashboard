import { query } from '@/lib/database/db';
import { libreriaNet, type LibreriaNet } from './audioSdk';
import { credencialesDeFila, type CredencialesEquipo } from './deviceClient';
import { encolarIdentificacionDeRecord } from './identificacionFacial';
import logger from '@/lib/utils/logger';

const ESPERA_MS = 8_000;
const MAX_ACTIVOS = 2;
const MAX_INTENTOS = 3;
/** Tamaño del buffer de salida (~24 KB reales; holgado por si trae varias caras). */
const TAMANO_BUFFER = 512 * 1024;

type FnDescargar = (h: number, entrada: Buffer, salida: Buffer, espera: number) => boolean;
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
type FnLogout = (h: number) => void;
type Koffi = { address(buffer: Buffer): number };

function intentarFunc<T>(lib: LibreriaNet, prototipo: string): T | null {
  try {
    return lib.func(prototipo) as T;
  } catch {
    return null;
  }
}

let koffiModulo: Koffi | null = null;
async function direccionDe(buffer: Buffer): Promise<bigint> {
  if (!koffiModulo) {
    const modulo = (await import('koffi')) as unknown as { default?: Koffi } & Koffi;
    koffiModulo = modulo.default ?? modulo;
  }
  return BigInt(koffiModulo.address(buffer));
}

export async function descargarFoto(
  ruta: string,
  credenciales: CredencialesEquipo
): Promise<Buffer | null> {
  let lib: LibreriaNet;
  try {
    lib = await libreriaNet();
  } catch (error) {
    logger.warn('[biometric-fotos] NetSDK no disponible para bajar la foto', { error });
    return null;
  }

  const descargar = intentarFunc<FnDescargar>(
    lib,
    'bool CLIENT_DownloadRemoteFile(int64 h, void *in, void *out, int espera)'
  );
  const login = intentarFunc<FnLogin>(
    lib,
    'int64 CLIENT_LoginEx2(const char *ip, uint16_t puerto, const char *usuario, const char *clave, int emSpecCap, void *capParam, void *deviceInfo, void *nError)'
  );
  const logout = intentarFunc<FnLogout>(lib, 'void CLIENT_Logout(int64 h)');
  if (!descargar || !login || !logout) {
    logger.warn('[biometric-fotos] La dhnetsdk.dll no expone CLIENT_DownloadRemoteFile', {
      ip: credenciales.ip
    });
    return null;
  }

  try {
    const rutaBuf = Buffer.from(`${ruta}` + '\0', 'utf8');
    const entrada = Buffer.alloc(24);
    entrada.writeUInt32LE(24, 0);
    entrada.writeBigUInt64LE(await direccionDe(rutaBuf), 8);
    const contenido = Buffer.alloc(TAMANO_BUFFER);
    const salida = Buffer.alloc(24);
    salida.writeUInt32LE(24, 0);
    salida.writeUInt32LE(contenido.length, 4);
    salida.writeBigUInt64LE(await direccionDe(contenido), 8);

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
    if (!h) {
      logger.warn('[biometric-fotos] NetSDK rechazó el login para bajar la foto', {
        ip: credenciales.ip
      });
      return null;
    }
    try {
      const ok = descargar(h, entrada, salida, ESPERA_MS);
      const leidos = salida.readUInt32LE(16);
      if (!ok || leidos <= 0 || leidos > contenido.length) {
        logger.warn('[biometric-fotos] El equipo no entregó la foto', {
          ip: credenciales.ip,
          ruta,
          ok,
          leidos
        });
        return null;
      }
      const foto = contenido.subarray(0, leidos);
      if (foto[0] !== 0xff || foto[1] !== 0xd8) {
        logger.warn('[biometric-fotos] La descarga no es un JPEG', {
          ip: credenciales.ip,
          ruta,
          leidos
        });
        return null;
      }
      return Buffer.from(foto);
    } finally {
      logout(h);
    }
  } catch (error) {
    logger.warn('[biometric-fotos] Error descargando la foto del equipo', { ruta, error });
    return null;
  }
}

interface Pendiente {
  recordId: string;
  dispositivoId: string;
  ruta: string;
}

const enVuelo = new Set<string>();
const cola: Pendiente[] = [];
const intentos = new Map<string, number>();
let activos = 0;

async function descargarYGuardar(pendiente: Pendiente): Promise<void> {
  try {
    const filas = await query<
      { ip: string | null; usuario_equipo: string | null; clave_cifrada: string | null }[]
    >(
      `SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices
        WHERE id = ? AND revocado_en IS NULL`,
      [pendiente.dispositivoId]
    );
    const credenciales = filas[0] ? credencialesDeFila(filas[0]) : null;
    if (!credenciales) {
      registrarFallo(pendiente, 'sin credenciales del equipo');
      return;
    }

    const foto = await descargarFoto(pendiente.ruta, credenciales);
    if (!foto) {
      registrarFallo(pendiente);
      return;
    }

    await query('UPDATE biometric_device_records SET foto = ? WHERE id = ?', [
      foto,
      pendiente.recordId
    ]);
    intentos.delete(pendiente.recordId);
    encolarIdentificacionDeRecord({
      recordId: pendiente.recordId,
      dispositivoId: pendiente.dispositivoId
    });
  } catch (error) {
    registrarFallo(pendiente, error);
  }
}

function registrarFallo(pendiente: Pendiente, error?: unknown): void {
  const total = (intentos.get(pendiente.recordId) ?? 0) + 1;
  intentos.set(pendiente.recordId, total);
  if (total >= MAX_INTENTOS) intentos.set(pendiente.recordId, MAX_INTENTOS);
  if (total <= 2) {
    logger.warn('[biometric-fotos] No se pudo guardar la foto del record', {
      recordId: pendiente.recordId,
      intento: total,
      error
    });
  }
}

function bombear(): void {
  while (activos < MAX_ACTIVOS && cola.length > 0) {
    const pendiente = cola.shift()!;
    activos += 1;
    void descargarYGuardar(pendiente).finally(() => {
      enVuelo.delete(pendiente.recordId);
      activos -= 1;
      bombear();
    });
  }
}

export function encolarFotoDeRecord(pendiente: Pendiente): void {
  if (enVuelo.has(pendiente.recordId)) return;
  if ((intentos.get(pendiente.recordId) ?? 0) >= MAX_INTENTOS) return;
  enVuelo.add(pendiente.recordId);
  cola.push(pendiente);
  bombear();
}

export async function recuperarFotosPendientes(limite = 3): Promise<number> {
  const pendientes = await query<{ id: string; dispositivo_id: string; foto_url: string }[]>(
    `SELECT id, dispositivo_id, foto_url
       FROM biometric_device_records
      WHERE foto IS NULL AND foto_url IS NOT NULL
        AND fecha_dispositivo > CURRENT_TIMESTAMP - interval '3 days'
      ORDER BY fecha_dispositivo DESC
      LIMIT ?`,
    [limite]
  );
  for (const fila of pendientes) {
    if (!fila.id || !fila.foto_url) continue;
    encolarFotoDeRecord({
      recordId: fila.id,
      dispositivoId: fila.dispositivo_id,
      ruta: fila.foto_url
    });
  }
  return pendientes.length;
}
