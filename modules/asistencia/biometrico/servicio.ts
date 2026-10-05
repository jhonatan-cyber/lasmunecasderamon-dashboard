/**
 * Casos de uso del recolector biométrico y de las fotos — aplicación del módulo
 * Asistencia.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * El efecto —encender o apagar el listener en vivo— se dispara después de
 * confirmar el estado en la base, como antes.
 */
import { apagarListener, encenderListener } from './eventListener';
import { credencialesDeFila, verificarConexion } from './deviceClient';
import type { FilaEquipo } from './repositorio';
import * as repositorio from './repositorio';

export type { FilaEquipo } from './repositorio';

/** Resultado de apagar el recolector de un equipo. */
export interface RecolectorApagado {
  success: true;
  message: string;
}

/** Resultado de encenderlo. */
export type RecolectorEncendido =
  { success: true; message: string } | { success: false; message: string; status: number };

/**
 * Interruptor del recolector de registros de un equipo.
 *
 * Encenderlo exige credenciales completas y una conexión exitosa: no tiene sentido
 * dejar "encendido" un equipo al que el servidor no puede llegar. Al encender
 * también abre el LISTENER EN VIVO (tiempo real); el poller de 1 minuto queda como
 * red de seguridad.
 */
export async function setRecolector(
  id: string,
  encender: boolean
): Promise<RecolectorApagado | RecolectorEncendido> {
  if (!encender) {
    await repositorio.setRecogerRegistros(id, false);
    apagarListener(id);
    return { success: true, message: 'Recolector apagado.' };
  }

  const [fila] = await repositorio.obtenerEquipoVigente(id);
  if (!fila) {
    return { success: false, message: 'Equipo no encontrado o revocado', status: 404 };
  }

  const credenciales = credencialesDeFila(fila);
  if (!credenciales) {
    return {
      success: false,
      message: 'Cargá IP y credenciales del equipo antes de encender el recolector.',
      status: 400
    };
  }

  try {
    await verificarConexion(credenciales);
  } catch (error) {
    return {
      success: false,
      message: `No se pudo conectar al equipo: ${
        error instanceof Error ? error.message : 'error de conexión'
      }`,
      status: 502
    };
  }

  await repositorio.setRecogerRegistros(id, true);
  const vivo = await encenderListener(id);
  return {
    success: true,
    message: vivo
      ? 'Recolector encendido: tiempo real activo + red de seguridad cada minuto.'
      : 'Recolector encendido (sin listener en vivo en este proceso; queda el ciclo de 1 minuto).'
  };
}

/**
 * Bytes del JPEG que el lector capturó en la puerta. `null` cuando el registro no
 * tiene foto o no existe.
 */
export async function obtenerBytesDeFoto(id: string): Promise<ArrayBuffer | null> {
  const [fila] = await repositorio.obtenerFotoDeRecord(id);
  const foto = fila?.foto;
  if (!foto || foto.length === 0) return null;
  const bytes = Buffer.from(foto);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export type { FilaEquipo as EquipoBiometrico } from './repositorio';
