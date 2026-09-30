import { query, generateUUID } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import logger from '@/lib/utils/logger';
import {
  DeviceConnectionError,
  capturarFotoDelEquipo,
  capturarHuellaEnEquipo,
  contarCarasEnEquipo,
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
import { capturarMacs, guardarMac } from '@/lib/biometric/ipDiscovery';
import {
  ErrorFacial,
  eliminarPersonaEnEquipo,
  extraerVectorFacial,
  guardarCaraEnEquipo,
  guardarPersonaEnEquipo,
  similitudCoseno,
  umbralCoincidenciaFacial,
  type MotivoFalloFacial
} from '@/lib/biometric/faceSdk';

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
  /** Huella MAC del equipo (para re-encontrarlo si el DHCP le cambia la IP). */
  mac: string | null;
}

export interface ResultadoSincronizacion {
  ok: boolean;
  mensaje: string;
  detalles: {
    cara: 'sincronizada' | 'no_soportada' | 'sin_datos' | 'error';
    huella: 'sincronizada' | 'no_soportada' | 'sin_datos' | 'error';
  };
  /** Lo que el equipo devolvió en ESTA sincronización (para mostrarlo en la UI). */
  capturas: {
    cara: string | null; // foto JPEG en base64
    huella: string | null; // plantilla en hex
  };
  /**
   * Cuántas caras tiene guardadas el equipo (null si no se pudo consultar).
   * Sirve para distinguir "el equipo está vacío" de "este código no existe
   * todavía acá".
   */
  carasEnEquipo: number | null;
  /**
   * Por qué no se pudo completar (SDK ausente, sin foto de referencia, equipo
   * que no acepta cargas). La UI lo usa para decidir si muestra la guía manual.
   */
  motivo?: MotivoFalloFacial | 'sin_plantilla';
}

async function obtenerEquipo(dispositivoId: string): Promise<EquipoEnrolable | null> {
  const rows = await query<EquipoEnrolable[]>(
    `SELECT id, nombre, marca, serial, ip, usuario_equipo, clave_cifrada, mac
       FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  return rows[0] ?? null;
}

/**
 * Winston serializa los `Error` sin su `message` (propiedad no enumerable) y en
 * los ErrorFacial tampoco queda el motivo… sacamos los dos a mano para que el
 * log diga QUÉ falló (p. ej. "CLIENT_Init devolvió false" vs "0x8000004f").
 */
function datosDeError(error: unknown): Record<string, unknown> {
  if (error instanceof ErrorFacial) return { mensaje: error.message, motivo: error.motivo };
  if (error instanceof Error) return { mensaje: error.message };
  return { mensaje: String(error) };
}

export interface PruebaConexion {
  ok: boolean;
  mensaje: string;
  modelo?: string;
  serial?: string;
  version?: string;
  /** MAC(s) capturadas al conectar: se guardan para poder re-encontrar el equipo. */
  macs?: string[];
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
    // Huella MAC del equipo: queda guardada para poder re-encontrarlo si el
    // DHCP le cambia la IP (el vigilante de IP usa exactamente esto).
    const macs = await capturarMacs(credenciales);
    if (macs.length > 0) {
      await guardarMac(dispositivoId, macs).catch(error => {
        logger.debug('[biometric-enrol] No se pudo guardar la MAC', {
          dispositivoId,
          error: error instanceof Error ? error.message : String(error)
        });
        return false;
      });
    }
    return {
      ok: true,
      mensaje: 'Conexión OK',
      modelo: info.modelo,
      serial: info.serial,
      version: info.version,
      macs
    };
  } catch (error) {
    logger.warn('[biometric-enrol] Prueba de conexión fallida', {
      dispositivoId,
      error: datosDeError(error)
    });
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

/**
 * Foto en vivo de la cámara del lector (`snapshot.cgi`).
 *
 * Es lo ÚNICO que el equipo entrega de su cámara: no hay CGI para disparar una
 * captura de enrolamiento (`FaceInfoManager?action=capture` → Not Implemented)
 * ni para subir caras (`action=add` → Bad Request incluso con una cara real).
 * Sirve para que el operador vea y guarde desde el sistema quién está frente a
 * la puerta, sin tocar el equipo.
 */
export async function fotoEnVivoDelEquipo(
  dispositivoId: string
): Promise<{ base64: string; contentType: string }> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');
  return capturarFotoDelEquipo(credencialesDe(equipo));
}

/**
 * Guarda como imagen MAESTRA de la persona la foto que capturó la cámara del
 * lector. En los modelos que aceptan alta remota, `restaurarEnEquipo` empuja esa
 * foto y el equipo extrae su plantilla; en los que no (ASI3213A-W), queda como
 * la imagen de referencia de la persona para la ficha y el enrolamiento.
 */
export async function guardarFotoCapturada(
  dispositivoId: string,
  persona: DatosPersona,
  fotoBase64: string
): Promise<ResultadoSincronizacion> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');

  // El equipo todavía no tiene esta foto: queda pendiente de sincronizar.
  await guardarPlantilla(persona.usuarioId, dispositivoId, 'cara', fotoBase64, {
    sincronizada: false
  });
  const credenciales = credencialesDeFila(equipo);
  let carasEnEquipo: number | null = null;
  if (credenciales) {
    try {
      carasEnEquipo = await contarCarasEnEquipo(credenciales);
    } catch {
      carasEnEquipo = null;
    }
  }

  return {
    ok: true,
    mensaje: `Foto del lector guardada como imagen de ${persona.nombre}.`,
    detalles: { cara: 'sincronizada', huella: 'sin_datos' },
    capturas: { cara: fotoBase64, huella: null },
    carasEnEquipo
  };
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
  const capturas: ResultadoSincronizacion['capturas'] = { cara: null, huella: null };
  const partes: string[] = [];
  let carasEnEquipo: number | null = null;
  try {
    carasEnEquipo = await contarCarasEnEquipo(credenciales);
  } catch {
    carasEnEquipo = null;
  }

  // ── Cara: pull desde el equipo (la persona se puso frente al lector) ──
  try {
    const cara = await leerCara(credenciales, persona.codigo);
    if (cara) {
      await guardarPlantilla(persona.usuarioId, dispositivoId, 'cara', cara.fotoBase64);
      capturas.cara = cara.fotoBase64;
      detalles.cara = 'sincronizada';
      partes.push('cara sincronizada');
    } else {
      detalles.cara = 'sin_datos';
    }
  } catch (error) {
    if (esNoSoportado(error)) {
      detalles.cara = 'no_soportada';
    } else {
      logger.error('[biometric-enrol] Error sincronizando cara', {
        dispositivoId,
        error: datosDeError(error)
      });
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
      capturas.huella = huella.plantillaHex;
      detalles.huella = 'sincronizada';
      partes.push('huella sincronizada');
    } else {
      detalles.huella = 'sin_datos';
    }
  } catch (error) {
    if (esNoSoportado(error)) {
      detalles.huella = 'no_soportada';
    } else {
      logger.error('[biometric-enrol] Error sincronizando huella', {
        dispositivoId,
        error: datosDeError(error)
      });
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
    // La persona todavía no está en el equipo: el alta se hace desde acá mismo
    // (NetSDK), así que el mensaje apunta a esa acción en vez del menú del equipo.
    const codigoEnEquipo =
      carasEnEquipo === 0 ? 'El equipo todavía no tiene ninguna cara guardada. ' : '';
    mensaje =
      codigoEnEquipo +
      `No encontramos a nadie con el código ${persona.codigo} en el equipo. Usá «Dar de alta en el equipo» ` +
      `para crear a ${persona.nombre} y cargarle la cara por red, sin tocar el menú del equipo.`;
  }

  return { ok, mensaje, detalles, capturas, carasEnEquipo };
}

interface EstadoAltaCara {
  persona: 'creada' | 'ya_existia' | 'desconocido';
  cara: 'cargada' | 'actualizada';
}

/**
 * Plantillas a empujar al equipo: las propias de ESTE equipo y, si no hay cara
 * para este equipo, la última foto maestra de la persona (la cara es de la
 * persona, no del lector). La huella no se copia entre equipos: depende del
 * sensor que la capturó.
 */
async function leerPlantillasParaAlta(
  usuarioId: string,
  dispositivoId: string
): Promise<{ tipo: string; datos: string }[]> {
  const propias = await query<{ tipo: string; datos: string }[]>(
    `SELECT tipo, datos FROM biometric_plantillas
      WHERE usuario_id = ? AND dispositivo_id = ?`,
    [usuarioId, dispositivoId]
  );
  if (propias.some(plantilla => plantilla.tipo === 'cara')) return propias;

  const maestra = await query<{ tipo: string; datos: string }[]>(
    `SELECT 'cara' AS tipo, datos FROM biometric_plantillas
      WHERE usuario_id = ? AND tipo = 'cara'
      ORDER BY fecha_captura DESC NULLS LAST
      LIMIT 1`,
    [usuarioId]
  );
  return [...propias, ...maestra];
}

/** Motivos por los que conviene reintentar el alta por el CGI histórico. */
const REINTENTAR_POR_CGI = new Set<MotivoFalloFacial>([
  'sdk_no_disponible',
  'login_fallido',
  'no_soportado'
]);

/**
 * DB → equipo de UNA cara: el motor del equipo extrae el vector de la foto
 * maestra (`extraerVectorFacial`), se crea la persona y se carga/actualiza la
 * cara. Si el puente NetSDK no está disponible se cae al CGI histórico.
 */
async function empujarCaraAlEquipo(
  credenciales: CredencialesEquipo,
  persona: DatosPersona,
  fotoBase64: string
): Promise<EstadoAltaCara> {
  try {
    const vector = await extraerVectorFacial(credenciales, bufferDesdeBase64(fotoBase64));
    const estadoPersona = await guardarPersonaEnEquipo(credenciales, {
      codigo: persona.codigo,
      nombre: persona.nombre
    });
    const estadoCara = await guardarCaraEnEquipo(credenciales, persona.codigo, vector);
    return { persona: estadoPersona, cara: estadoCara };
  } catch (error) {
    if (!(error instanceof ErrorFacial) || !REINTENTAR_POR_CGI.has(error.motivo)) throw error;
    logger.warn('[biometric-enrol] NetSDK no disponible para el alta; se intenta por CGI', {
      motivo: error.motivo
    });
    await subirCara(credenciales, persona.codigo, persona.nombre, fotoBase64);
    return { persona: 'desconocido', cara: 'cargada' };
  }
}

/**
 * Restaura/da de alta en el equipo lo que hay en la DB (DB → equipo).
 *
 * La cara va por NetSDK (`CLIENT_OperateAccessUserService` +
 * `CLIENT_OperateAccessFaceService`), que es lo único que funciona en el
 * ASI3213A-W: sus CGI de alta responden Bad Request. La huella se intenta por
 * CGI porque no todos los modelos exponen FingerPrintManager. Con esto se da
 * de alta a la persona y su cara sin tocar el menú del equipo.
 */
export async function restaurarEnEquipo(
  dispositivoId: string,
  persona: DatosPersona
): Promise<ResultadoSincronizacion> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');
  const credenciales = credencialesDe(equipo);

  const detalles: ResultadoSincronizacion['detalles'] = { cara: 'sin_datos', huella: 'sin_datos' };
  const errores: string[] = [];
  let motivo: ResultadoSincronizacion['motivo'];
  let alta: EstadoAltaCara | null = null;

  const plantillas = await leerPlantillasParaAlta(persona.usuarioId, dispositivoId);

  for (const plantilla of plantillas) {
    const tipo = plantilla.tipo as 'cara' | 'huella';
    try {
      if (tipo === 'cara') {
        alta = await empujarCaraAlEquipo(credenciales, persona, plantilla.datos);
      } else {
        await subirHuella(credenciales, persona.codigo, plantilla.datos);
      }
      // La copia del equipo ya tiene esta versión: queda registrada para la
      // ficha y para que la próxima restauración la encuentre por equipo.
      await guardarPlantilla(persona.usuarioId, dispositivoId, tipo, plantilla.datos, {
        sincronizada: true
      });
      detalles[tipo] = 'sincronizada';
    } catch (error) {
      if (esNoSoportado(error)) {
        detalles[tipo] = 'no_soportada';
        motivo = 'no_soportado';
      } else {
        logger.error('[biometric-enrol] Error en el alta al equipo', {
          dispositivoId,
          tipo,
          error: datosDeError(error)
        });
        detalles[tipo] = 'error';
        if (error instanceof ErrorFacial) motivo = error.motivo;
        errores.push(error instanceof Error ? error.message : 'error desconocido');
      }
    }
  }

  const ok = detalles.cara === 'sincronizada' || detalles.huella === 'sincronizada';

  let mensaje: string;
  if (ok) {
    const partes: string[] = [];
    if (alta) {
      if (alta.persona !== 'desconocido') {
        partes.push(alta.persona === 'creada' ? 'persona creada' : 'la persona ya estaba');
      }
      partes.push(alta.cara === 'cargada' ? 'cara cargada' : 'cara actualizada');
    }
    if (detalles.huella === 'sincronizada') partes.push('huella cargada');
    mensaje = `Alta completada en «${equipo.nombre}»: ${partes.join(', ')}.`;
  } else if (errores.length > 0) {
    mensaje = `No se pudo dar de alta en «${equipo.nombre}»: ${errores.join('; ')}`;
  } else if (detalles.cara === 'no_soportada') {
    mensaje =
      'Este equipo no acepta que le carguen caras por red: cargala en su menú y después usá "Capturar desde el lector".';
  } else {
    motivo = 'sin_plantilla';
    mensaje = `No hay ninguna cara ni huella guardada para ${persona.nombre}: capturá una foto con "Capturar foto" y volvé a intentar.`;
  }

  let carasEnEquipo: number | null = null;
  try {
    carasEnEquipo = await contarCarasEnEquipo(credenciales);
  } catch {
    carasEnEquipo = null;
  }

  return { ok, mensaje, motivo, detalles, capturas: { cara: null, huella: null }, carasEnEquipo };
}

/**
 * Alta al equipo de una persona recién creada en el sistema (crear usuario →
 * registrado en el lector).
 *
 * Usa la foto que se le subió al crearla como plantilla maestra de la persona
 * (quedó pendiente de sincronizar) y después da de alta DB → equipo con
 * `restaurarEnEquipo`: NetSDK crea la persona con su código y le carga la cara.
 * El error de red/SDK se devuelve en el resultado, nunca lanza, para no atar el
 * alta en el lector a que el equipo responda.
 */
export async function darDeAltaConFoto(
  dispositivoId: string,
  persona: DatosPersona,
  fotoBase64: string
): Promise<ResultadoSincronizacion> {
  await guardarPlantilla(persona.usuarioId, dispositivoId, 'cara', fotoBase64, {
    sincronizada: false
  });
  return restaurarEnEquipo(dispositivoId, persona);
}

/**
 * Quita a la persona del equipo y marca sus plantillas como fuera de sincronía.
 *
 * El borrado principal va por NetSDK: el ASI3213A-W no borra personas por CGI
 * (y su cara se va con la persona). El CGI histórico se llama igual, como
 * complemento para tarjetas/huellas y para los modelos que sí lo soportan.
 */
export async function quitarDelEquipo(dispositivoId: string, persona: DatosPersona): Promise<void> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) return;
  const credenciales = credencialesDeFila(equipo);
  if (!credenciales) return;
  try {
    await eliminarPersonaEnEquipo(credenciales, persona.codigo);
  } catch (error) {
    logger.warn('[biometric-enrol] No se pudo quitar la persona por NetSDK', {
      dispositivoId,
      error: datosDeError(error)
    });
  }
  await eliminarUsuarioDelEquipo(credenciales, persona.codigo);
  await query(
    `UPDATE biometric_plantillas
        SET sincronizada = 0, fecha_sincronizacion = NULL
      WHERE usuario_id = ? AND dispositivo_id = ?`,
    [persona.usuarioId, dispositivoId]
  );
}

function esNoSoportado(error: unknown): boolean {
  if (error instanceof ErrorFacial && error.motivo === 'no_soportado') return true;
  const texto = error instanceof Error ? `${error.name} ${error.message}`.toLowerCase() : '';
  return (
    texto.includes('404') ||
    texto.includes('not found') ||
    texto.includes('not implemented') ||
    texto.includes('no soportada') ||
    texto.includes('no soportado') ||
    texto.includes('no acepta') ||
    texto.includes('no implementado')
  );
}

/**
 * Guarda la plantilla maestra de una persona.
 *
 * `sincronizada` dice si el equipo YA la tiene: en el pull equipo→DB es true
 * (la copia del equipo es el origen); en una foto capturada desde el sistema es
 * false, porque todavía hay que empujarla con `restaurarEnEquipo`.
 */
async function guardarPlantilla(
  usuarioId: string,
  dispositivoId: string,
  tipo: 'huella' | 'cara',
  datos: string,
  opciones: { sincronizada?: boolean } = {}
): Promise<void> {
  const sincronizada = opciones.sincronizada ?? true;
  const existente = await query<{ id: string; datos: string }[]>(
    `SELECT id, datos FROM biometric_plantillas
      WHERE usuario_id = ? AND dispositivo_id = ? AND tipo = ?`,
    [usuarioId, dispositivoId, tipo]
  );

  const ahora = getNowInBusinessTimezone();
  const marcaSync = sincronizada ? ahora : null;
  if (existente.length > 0 && existente[0].datos === datos) {
    // Sin cambios: solo refrescamos la marca de sincronía (si el equipo la tiene).
    await query(
      `UPDATE biometric_plantillas
          SET fecha_sincronizacion = ?, sincronizada = ?
        WHERE id = ?`,
      [marcaSync, sincronizada ? 1 : 0, existente[0].id]
    );
    return;
  }

  if (existente.length > 0) {
    await query(
      'UPDATE biometric_plantillas SET datos = ?, fecha_captura = ?, sincronizada = ?, fecha_sincronizacion = ? WHERE id = ?',
      [datos, ahora, sincronizada ? 1 : 0, marcaSync, existente[0].id]
    );
  } else {
    await BaseRepository.insert(query, 'biometric_plantillas', {
      id: generateUUID(),
      usuario_id: usuarioId,
      dispositivo_id: dispositivoId,
      tipo,
      datos,
      sincronizada: sincronizada ? 1 : 0,
      fecha_sincronizacion: marcaSync
    });
  }
  // La copia del equipo es la fuente de este pull y queda como está; la
  // restauración DB → equipo es responsabilidad de `restaurarEnEquipo`.
}

export interface ResultadoVerificacionFacial {
  /** El proceso corrió (no dice si coincidió). */
  ok: boolean;
  mensaje: string;
  motivo?: MotivoFalloFacial | 'sin_plantilla';
  coincide?: boolean;
  /** Similitud coseno 0..1 entre la foto guardada y la captura en vivo. */
  similitud?: number;
  umbral?: number;
  /** Foto en vivo que se usó para comparar (JPEG base64). */
  captura?: string | null;
  /** Foto de referencia guardada (JPEG base64). */
  plantilla?: string | null;
}

/**
 * Verifica que la cara que el lector ve AHORA sea la de la persona enrolada.
 *
 * Compara la captura en vivo (`snapshot.cgi`) contra la última foto guardada de
 * la persona en `biometric_plantillas` usando el motor facial del propio equipo
 * (`CLIENT_FaceInfoOpreate` → vector de 256 floats) y similitud coseno.
 *
 * Distinto de la verificación en la puerta: esto es una ayuda del operador al
 * enrolar (avisar si quien está frente al lector no parece ser esa persona),
 * no bloquea el acceso ni escribe nada en el equipo.
 */
export async function verificarCoincidenciaFacial(
  dispositivoId: string,
  persona: DatosPersona
): Promise<ResultadoVerificacionFacial> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');
  const credenciales = credencialesDe(equipo);

  const filas = await query<{ datos: string }[]>(
    `SELECT datos FROM biometric_plantillas
      WHERE usuario_id = ? AND tipo = 'cara'
      ORDER BY fecha_captura DESC NULLS LAST
      LIMIT 1`,
    [persona.usuarioId]
  );
  const plantilla = filas[0]?.datos?.trim();
  if (!plantilla) {
    return {
      ok: false,
      motivo: 'sin_plantilla',
      mensaje: `${persona.nombre} todavía no tiene una foto de referencia: capturá una con "Capturar foto" y volvé a verificar.`
    };
  }

  const captura = await capturarFotoDelEquipo(credenciales);

  let vectorPlantilla: Float32Array;
  try {
    vectorPlantilla = await extraerVectorFacial(credenciales, bufferDesdeBase64(plantilla));
  } catch (error) {
    if (error instanceof ErrorFacial) {
      return {
        ok: false,
        motivo: error.motivo,
        mensaje: `No pude leer la cara de la foto guardada de ${persona.nombre}: ${error.message}`
      };
    }
    throw error;
  }

  let vectorCaptura: Float32Array;
  try {
    vectorCaptura = await extraerVectorFacial(credenciales, bufferDesdeBase64(captura.base64));
  } catch (error) {
    if (error instanceof ErrorFacial) {
      const mensaje =
        error.motivo === 'sin_cara'
          ? 'El lector no ve ninguna cara enfrente: pedile a la persona que se ponga de frente a la cámara y volvé a verificar.'
          : `No pude analizar la foto del lector: ${error.message}`;
      return { ok: false, motivo: error.motivo, mensaje };
    }
    throw error;
  }

  const similitud = similitudCoseno(vectorPlantilla, vectorCaptura);
  const umbral = umbralCoincidenciaFacial();
  const coincide = similitud >= umbral;
  const porcentaje = Math.round(similitud * 100);
  const porcentajeUmbral = Math.round(umbral * 100);

  return {
    ok: true,
    coincide,
    similitud,
    umbral,
    captura: captura.base64,
    plantilla,
    mensaje: coincide
      ? `La cara frente al lector coincide con la foto de ${persona.nombre} (${porcentaje}% de similitud).`
      : `¡Atención! La cara frente al lector NO parece ser la de ${persona.nombre}: ${porcentaje}% de similitud (mínimo ${porcentajeUmbral}%). Revisá quién está frente al equipo antes de guardar.`
  };
}

/** Acepta base64 puro o data URL ("data:image/jpeg;base64,..."). */
function bufferDesdeBase64(datos: string): Buffer {
  const limpio = datos.includes(',') ? datos.slice(datos.indexOf(',') + 1) : datos;
  return Buffer.from(limpio.replace(/\s+/g, ''), 'base64');
}
