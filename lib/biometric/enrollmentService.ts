import { query, generateUUID } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import logger from '@/lib/utils/logger';
import {
  DeviceConnectionError,
  capturarHuellaEnEquipo,
  credencialesDeFila,
  eliminarUsuarioDelEquipo,
  leerCara,
  leerHuella,
  subirCara,
  subirHuella,
  verificarConexion,
  type CredencialesEquipo
} from '@/lib/biometric/deviceClient';
import { cifrarSecreto } from '@/lib/biometric/credencialesCrypto';

/**
 * Enrolamiento gestionado desde el sistema.
 *
 * Flujo pedido: al crear/editar una persona, desde su ficha se enrola cara
 * y/o huella. La captura es la persona frente al lector; el SERVIDOR es quien
 * se conecta al equipo por IP (CGI Dahua, Digest) y:
 *
 *   1. le pide al equipo la plantilla recién capturada (equipo → DB),
 *   2. la guarda como MAESTRA en `biometric_plantillas` (nuestra DB),
 *   3. se asegura de que la copia en el equipo esté actualizada (DB → equipo).
 *
 * La verificación en la puerta la hace el equipo con su copia local: si la red
 * se cae, la puerta sigue funcionando. La DB maestra permite restaurar el
 * equipo, migrar a otro y auditar qué tenía cargada cada persona.
 *
 * Nota de seguridad: el usuario/clave CGI del equipo se guardan cifrados
 * (AES-256-GCM, `BIOMETRIC_ENCRYPTION_KEY`).
 */

export interface EquipoEnrolable {
  id: string;
  nombre: string;
  marca: string;
  serial: string;
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
}

export interface ResultadoSincronizacion {
  ok: boolean;
  mensaje: string;
  detalles: {
    cara: 'sincronizada' | 'no_soportada' | 'sin_datos' | 'error';
    huella: 'sincronizada' | 'no_soportada' | 'sin_datos' | 'error';
  };
}

async function obtenerEquipo(dispositivoId: string): Promise<EquipoEnrolable | null> {
  const rows = await query<EquipoEnrolable[]>(
    `SELECT id, nombre, marca, serial, ip, usuario_equipo, clave_cifrada
       FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  return rows[0] ?? null;
}

export interface PruebaConexion {
  ok: boolean;
  mensaje: string;
  modelo?: string;
  serial?: string;
  version?: string;
}

/** Prueba la conexión por IP y devuelve la identidad del equipo. */
export async function probarConexion(
  dispositivoId: string,
  credencialesNuevas?: { ip: string; usuario: string; clave: string }
): Promise<PruebaConexion> {
  try {
    let credenciales: CredencialesEquipo | null;
    if (credencialesNuevas) {
      credenciales = credencialesNuevas;
    } else {
      const equipo = await obtenerEquipo(dispositivoId);
      if (!equipo) return { ok: false, mensaje: 'Equipo no encontrado o revocado' };
      credenciales = credencialesDeFila(equipo);
    }
    if (!credenciales) {
      return {
        ok: false,
        mensaje: 'El equipo no tiene IP/credenciales cargadas: cargalas para poder enrolar.'
      };
    }
    const info = await verificarConexion(credenciales);
    return {
      ok: true,
      mensaje: 'Conexión OK',
      modelo: info.modelo,
      serial: info.serial,
      version: info.version
    };
  } catch (error) {
    logger.warn('[biometric-enrol] Prueba de conexión fallida', { dispositivoId, error });
    return {
      ok: false,
      mensaje:
        error instanceof DeviceConnectionError ? error.message : 'No se pudo conectar al equipo'
    };
  }
}

/**
 * Guarda (y cifra) las credenciales de red de un equipo. El serial se valida
 * contra lo que reporta el propio equipo para evitar cargar la IP de otro
 * terminal: si difiere del serial vinculado, se rechaza.
 */
export async function guardarCredenciales(
  dispositivoId: string,
  credenciales: { ip: string; usuario: string; clave: string }
): Promise<PruebaConexion> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');

  const prueba = await probarConexion(dispositivoId, credenciales);
  if (!prueba.ok) return prueba;
  if (prueba.serial && prueba.serial.toUpperCase() !== equipo.serial.toUpperCase()) {
    return {
      ok: false,
      mensaje: `El equipo en esa IP reporta el serial ${prueba.serial}, no ${equipo.serial}. Verificá la IP.`
    };
  }

  await query(
    `UPDATE biometric_devices
        SET ip = ?, usuario_equipo = ?, clave_cifrada = ?
      WHERE id = ?`,
    [credenciales.ip, credenciales.usuario, cifrarSecreto(credenciales.clave), dispositivoId]
  );
  return prueba;
}

export interface DatosPersona {
  usuarioId: string;
  nombre: string;
  /** Código que el equipo reporta (usuarios.biometrico_codigo). */
  codigo: string;
}

function credencialesDe(equipo: EquipoEnrolable): CredencialesEquipo {
  const c = credencialesDeFila(equipo);
  if (!c) {
    throw new DeviceConnectionError(
      'El equipo no tiene IP/credenciales: cargalas en Configuraciones → Asistencia.'
    );
  }
  return c;
}

/**
 * Sincroniza UNA persona con UN equipo.
 *
 * `huellaCapturadaEnEquipo`: dispara la captura de huella en el terminal y trae
 * la plantilla (si el firmware lo soporta). Si no, se espera que la plantilla ya
 * esté en el equipo (cargada en su menú) y el pull la trae igual.
 */
export async function sincronizarPersona(
  dispositivoId: string,
  persona: DatosPersona,
  opciones: { capturarHuella?: boolean } = {}
): Promise<ResultadoSincronizacion> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');
  const credenciales = credencialesDe(equipo);

  const detalles: ResultadoSincronizacion['detalles'] = { cara: 'sin_datos', huella: 'sin_datos' };
  const partes: string[] = [];

  // ── Cara: pull desde el equipo (la persona se puso frente al lector) ──
  try {
    const cara = await leerCara(credenciales, persona.codigo);
    if (cara) {
      await guardarPlantilla(persona.usuarioId, dispositivoId, 'cara', cara.fotoBase64);
      detalles.cara = 'sincronizada';
      partes.push('cara sincronizada');
    } else {
      detalles.cara = 'sin_datos';
    }
  } catch (error) {
    if (esNoSoportado(error)) {
      detalles.cara = 'no_soportada';
    } else {
      logger.error('[biometric-enrol] Error sincronizando cara', { dispositivoId, error });
      detalles.cara = 'error';
      partes.push('error con la cara');
    }
  }

  // ── Huella: captura en equipo (si se pidió) y pull de la plantilla ──
  try {
    if (opciones.capturarHuella) {
      await capturarHuellaEnEquipo(credenciales, persona.codigo);
    }
    const huella = await leerHuella(credenciales, persona.codigo);
    if (huella) {
      await guardarPlantilla(persona.usuarioId, dispositivoId, 'huella', huella.plantillaHex);
      detalles.huella = 'sincronizada';
      partes.push('huella sincronizada');
    } else {
      detalles.huella = 'sin_datos';
    }
  } catch (error) {
    if (esNoSoportado(error)) {
      detalles.huella = 'no_soportada';
    } else {
      logger.error('[biometric-enrol] Error sincronizando huella', { dispositivoId, error });
      detalles.huella = 'error';
      partes.push('error con la huella');
    }
  }

  const ok =
    detalles.cara !== 'error' &&
    detalles.huella !== 'error' &&
    (detalles.cara === 'sincronizada' || detalles.huella === 'sincronizada');

  let mensaje: string;
  if (ok) {
    mensaje = `Enrolamiento guardado: ${partes.join(' y ')}.`;
  } else if (partes.length > 0) {
    mensaje = `Se detectaron problemas: ${partes.join('; ')}.`;
  } else {
    mensaje =
      'No se encontraron datos nuevos en el equipo. Asegurate de que la persona se haya ' +
      'verificado frente al lector y de que el código en el equipo sea ' +
      persona.codigo +
      '.';
  }

  return { ok, mensaje, detalles };
}

/**
 * Restaura en el equipo la plantilla maestra de la DB (DB → equipo).
 * Se usa al reemplazar/Reiniciar un terminal o cuando `sincronizada=0`.
 */
export async function restaurarEnEquipo(
  dispositivoId: string,
  persona: DatosPersona
): Promise<ResultadoSincronizacion> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');
  const credenciales = credencialesDe(equipo);

  const detalles: ResultadoSincronizacion['detalles'] = { cara: 'sin_datos', huella: 'sin_datos' };
  const partes: string[] = [];

  const plantillas = await query<{ tipo: string; datos: string }[]>(
    `SELECT tipo, datos FROM biometric_plantillas
      WHERE usuario_id = ? AND dispositivo_id = ?`,
    [persona.usuarioId, dispositivoId]
  );

  for (const plantilla of plantillas) {
    try {
      if (plantilla.tipo === 'cara') {
        await subirCara(credenciales, persona.codigo, persona.nombre, plantilla.datos);
      } else {
        await subirHuella(credenciales, persona.codigo, plantilla.datos);
      }
      await query(
        `UPDATE biometric_plantillas
            SET fecha_sincronizacion = ?, sincronizada = 1
          WHERE usuario_id = ? AND dispositivo_id = ? AND tipo = ?`,
        [getNowInBusinessTimezone(), persona.usuarioId, dispositivoId, plantilla.tipo]
      );
      detalles[plantilla.tipo as 'cara' | 'huella'] = 'sincronizada';
      partes.push(plantilla.tipo);
    } catch (error) {
      if (esNoSoportado(error)) {
        detalles[plantilla.tipo as 'cara' | 'huella'] = 'no_soportada';
      } else {
        logger.error('[biometric-enrol] Error restaurando plantilla', {
          dispositivoId,
          tipo: plantilla.tipo,
          error
        });
        detalles[plantilla.tipo as 'cara' | 'huella'] = 'error';
      }
    }
  }

  const ok = detalles.cara !== 'error' && detalles.huella !== 'error';
  const mensaje = ok
    ? partes.length > 0
      ? `Restaurado en el equipo: ${partes.join(' y ')}.`
      : 'No hay plantillas guardadas para restaurar.'
    : 'Hubo errores restaurando el equipo. Revisá la conexión y volvé a intentar.';

  return { ok, mensaje, detalles };
}

/** Quita a la persona del equipo y marca sus plantillas como fuera de sincronía. */
export async function quitarDelEquipo(dispositivoId: string, persona: DatosPersona): Promise<void> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) return;
  const credenciales = credencialesDeFila(equipo);
  if (!credenciales) return;
  await eliminarUsuarioDelEquipo(credenciales, persona.codigo);
  await query(
    `UPDATE biometric_plantillas
        SET sincronizada = 0, fecha_sincronizacion = NULL
      WHERE usuario_id = ? AND dispositivo_id = ?`,
    [persona.usuarioId, dispositivoId]
  );
}

function esNoSoportado(error: unknown): boolean {
  const texto = error instanceof Error ? `${error.name} ${error.message}`.toLowerCase() : '';
  return texto.includes('404') || texto.includes('not found') || texto.includes('no soportada');
}

async function guardarPlantilla(
  usuarioId: string,
  dispositivoId: string,
  tipo: 'huella' | 'cara',
  datos: string
): Promise<void> {
  const existente = await query<{ id: string; datos: string }[]>(
    `SELECT id, datos FROM biometric_plantillas
      WHERE usuario_id = ? AND dispositivo_id = ? AND tipo = ?`,
    [usuarioId, dispositivoId, tipo]
  );

  const ahora = getNowInBusinessTimezone();
  if (existente.length > 0 && existente[0].datos === datos) {
    // Sin cambios: solo refrescamos la marca de sincronía.
    await query(
      `UPDATE biometric_plantillas
          SET fecha_sincronizacion = ?, sincronizada = 1
        WHERE id = ?`,
      [ahora, existente[0].id]
    );
    return;
  }

  if (existente.length > 0) {
    await query(
      'UPDATE biometric_plantillas SET datos = ?, fecha_captura = ?, sincronizada = 1, fecha_sincronizacion = ? WHERE id = ?',
      [datos, ahora, ahora, existente[0].id]
    );
  } else {
    await BaseRepository.insert(query, 'biometric_plantillas', {
      id: generateUUID(),
      usuario_id: usuarioId,
      dispositivo_id: dispositivoId,
      tipo,
      datos,
      sincronizada: 1,
      fecha_sincronizacion: ahora
    });
  }
  // La copia del equipo es la fuente de este pull y queda como está; la
  // restauración DB → equipo es responsabilidad de `restaurarEnEquipo`.
}
