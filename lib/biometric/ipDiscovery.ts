import { query } from '@/lib/database/db';
import {
  credencialesDeFila,
  leerMacsDelEquipo,
  verificarConexion,
  type CredencialesEquipo
} from '@/lib/biometric/deviceClient';
import { buscarEquipoPorMac, macDeTabla, macsDe, sondearPuerto } from '@/lib/biometric/discovery';
import { apagarListener, encenderListener } from '@/lib/biometric/eventListener';
import logger from '@/lib/utils/logger';

/**
 * La IP del lector no es un dato estable: el terminal está en DHCP, así que una
 * renovación de concesión, un reinicio del router o un cambio de WiFi la deja
 * apuntando a la nada (y se caen stream, poller, snapshot y enrolamiento).
 *
 * Acá se resuelve con lo único estable que hay: la identidad.
 *   - `capturarMacs` arma la huella del equipo (tabla ARP + config de red del
 *     propio terminal) y se guarda en `biometric_devices.mac`.
 *   - `descubrirIpDispositivo` re-encuentra el equipo por MAC y, antes de
 *     escribir la IP nueva, confirma con el SERIAL: nunca apunta a otro equipo.
 *
 * Lo usan el botón "Buscar por MAC" de la UI, `probarConexion` (captura sola de
 * MAC) y el vigilante de IP de `ipWatcher`.
 */

interface FilaEquipo {
  id: string;
  nombre: string;
  serial: string;
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
  mac: string | null;
  recoger_registros: number;
}

async function cargarEquipo(dispositivoId: string): Promise<FilaEquipo | null> {
  const rows = await query<FilaEquipo[]>(
    `SELECT id, nombre, serial, ip, usuario_equipo, clave_cifrada, mac, recoger_registros
       FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  return rows?.[0] ?? null;
}

/**
 * Huella MAC del equipo tal como está AHORA en la red.
 *
 * 1) Tabla ARP: basta con que el equipo haya respondido un pedido HTTP hace un
 *    momento (lo que acaba de pasar en la prueba de conexión) y su MAC está ahí.
 * 2) CGI de red del equipo: respaldo para cuando la ARP está limpia.
 *
 * Nunca lanza: si no se pudo leer, no hay huella y listo.
 */
export async function capturarMacs(credenciales: CredencialesEquipo): Promise<string[]> {
  const encontradas = new Set<string>();

  const arp = await macDeTabla(credenciales.ip).catch(() => null);
  if (arp) encontradas.add(arp);

  try {
    for (const mac of await leerMacsDelEquipo(credenciales)) encontradas.add(mac);
  } catch {
    /* equipo sin CGI de red: nos quedamos con la ARP */
  }

  return [...encontradas];
}

/** Guarda la huella MAC (unión con la que ya había: el equipo puede tener dos NICs). */
export async function guardarMac(dispositivoId: string, macs: string[]): Promise<boolean> {
  const llegadas = macsDe(macs.join(','));
  if (llegadas.length === 0) return false;
  const actual = await query<{ mac: string | null }[]>(
    'SELECT mac FROM biometric_devices WHERE id = ?',
    [dispositivoId]
  );
  const previas = macsDe(actual?.[0]?.mac ?? null);
  const unicas = [...new Set([...previas, ...llegadas])];
  if (unicas.length === previas.length) return false;
  await query('UPDATE biometric_devices SET mac = ? WHERE id = ?', [
    unicas.join(','),
    dispositivoId
  ]);
  return true;
}

export interface ResultadoDescubrimiento {
  ok: boolean;
  mensaje: string;
  /** Hubo que mover la IP (es lo que hace falta cuando el DHCP cambió). */
  cambio: boolean;
  ipAnterior?: string | null;
  ipNueva?: string;
  /** La IP candidata se confirmó con el serial del equipo. */
  verificada?: boolean;
  mac?: string | null;
  /** Categoría del fallo para que la ruta HTTP elija el status y la UI el texto. */
  codigo?: 'NO_ENCONTRADO' | 'SIN_CREDENCIALES' | 'SIN_MAC' | 'FUERA_DE_RED';
}

/**
 * Resuelve dónde está el equipo.
 *
 *  - `forzar: false` (por omisión): si responde en su IP actual, la deja como
 *    está y solo refresca la MAC. Sirve para chequeos periódicos.
 *  - `forzar: true`: barre la subred igual que el DHCP lo hizo, buscando la
 *    MAC registrada y confirmando por serial.
 */
export async function descubrirIpDispositivo(
  dispositivoId: string,
  opciones: { forzar?: boolean } = {}
): Promise<ResultadoDescubrimiento> {
  const fila = await cargarEquipo(dispositivoId);
  if (!fila) {
    return {
      ok: false,
      cambio: false,
      codigo: 'NO_ENCONTRADO',
      mensaje: 'Equipo no encontrado o revocado'
    };
  }

  const credenciales = credencialesDeFila(fila);
  if (!credenciales) {
    return {
      ok: false,
      cambio: false,
      codigo: 'SIN_CREDENCIALES',
      mensaje: 'El equipo no tiene IP/credenciales cargadas: cargalas para poder buscarlo.'
    };
  }

  const verificarEn = async (ip: string): Promise<string | null> => {
    try {
      const info = await verificarConexion({ ...credenciales, ip });
      return info.serial.toUpperCase() === fila.serial.toUpperCase() ? info.serial : null;
    } catch {
      return null;
    }
  };

  // 1) Sigue viva en su IP: nada que mover (salvo que nos pidan re-buscar).
  if (!opciones.forzar) {
    const enSuIp = await verificarEn(credenciales.ip);
    if (enSuIp) {
      const macs = await capturarMacs(credenciales);
      await guardarMac(dispositivoId, macs);
      return {
        ok: true,
        cambio: false,
        mensaje: 'El equipo responde en su IP actual.',
        ipAnterior: fila.ip,
        ipNueva: credenciales.ip,
        verificada: true,
        mac: macs[0] ?? fila.mac
      };
    }
  }

  const macs = macsDe(fila.mac);
  const hallado = await buscarEquipoPorMac({
    macs,
    ipActual: fila.ip,
    ops: { serial: verificarEn }
  }).catch(error => {
    logger.warn('[biometric-discovery] Falló el barrido de red', {
      dispositivoId,
      ip: fila.ip,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  });

  if (!hallado) {
    return {
      ok: false,
      cambio: false,
      ipAnterior: fila.ip,
      mac: fila.mac,
      codigo: macs.length ? 'FUERA_DE_RED' : 'SIN_MAC',
      mensaje: macs.length
        ? `No aparece en la red ninguna IP con la MAC ${macs.join(', ')} (¿equipo apagado o en otra red?).`
        : 'No hay MAC registrada y el equipo no responde en su IP: probá la conexión de nuevo para capturar la MAC.'
    };
  }

  if (hallado.ip === fila.ip) {
    return {
      ok: true,
      cambio: false,
      ipAnterior: fila.ip,
      ipNueva: hallado.ip,
      verificada: hallado.verificada,
      mac: macs[0] ?? null,
      mensaje: 'El equipo sigue en la misma IP.'
    };
  }

  await query('UPDATE biometric_devices SET ip = ? WHERE id = ?', [hallado.ip, dispositivoId]);
  logger.info('[biometric-discovery] IP del equipo actualizada', {
    dispositivoId,
    serial: fila.serial,
    ipAnterior: fila.ip,
    ipNueva: hallado.ip,
    verificada: hallado.verificada
  });

  // El listener viejo apuntaba a la IP anterior: se reinicia contra la nueva.
  apagarListener(dispositivoId);
  if (fila.recoger_registros === 1) {
    await encenderListener(dispositivoId).catch(error => {
      logger.warn('[biometric-discovery] No se pudo reencender el listener', {
        dispositivoId,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }

  return {
    ok: true,
    cambio: true,
    ipAnterior: fila.ip,
    ipNueva: hallado.ip,
    verificada: hallado.verificada,
    mac: macs[0] ?? null,
    mensaje: `Equipo encontrado en ${hallado.ip} (IP anterior: ${fila.ip}).`
  };
}

/** ¿Responde ese puerto en esa IP? Chequeo barato para el vigilante de IP. */
export async function equipoResponde(ip: string, puerto = 80, timeoutMs = 1500): Promise<boolean> {
  return sondearPuerto(ip, puerto, timeoutMs);
}
