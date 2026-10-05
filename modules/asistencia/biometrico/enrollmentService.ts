import { query, generateUUID } from '@/lib/database/db';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { guardarPlantilla } from './plantillasRepositorio';
import { activarModalidadFacial, guardarFotoPerfil } from '@/modules/identidad';
import { BaseRepository } from '@/lib/database/base-repository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import logger from '@/lib/utils/logger';
import {
  DeviceAuthError,
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
} from '@/modules/asistencia/biometrico/deviceClient';
import { avisarEnrolamientoEnEquipo } from '@/modules/asistencia/biometrico/avisosAudio';
import { cifrarSecreto } from '@/modules/asistencia/biometrico/credencialesCrypto';
import {
  capturarMacs,
  descubrirIpDispositivo,
  guardarMac
} from '@/modules/asistencia/biometrico/ipDiscovery';
import { sondearPuerto } from '@/modules/asistencia/biometrico/discovery';
import { imagenGuardadaABase64Jpeg, processAndSaveImage } from '@/lib/utils/image-utils';
import {
  ErrorFacial,
  eliminarPersonaEnEquipo,
  extraerVectorFacial,
  guardarCaraEnEquipo,
  guardarPersonaEnEquipo,
  personaEnEquipo,
  similitudCoseno,
  umbralCoincidenciaFacial,
  type MotivoFalloFacial
} from '@/modules/asistencia/biometrico/faceSdk';

export interface EquipoEnrolable {
  id: string;
  nombre: string;
  marca: string;
  serial: string;
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
  mac: string | null;
}

export interface ResultadoSincronizacion {
  ok: boolean;
  mensaje: string;
  detalles: {
    cara: 'sincronizada' | 'no_soportada' | 'sin_datos' | 'error';
    huella: 'sincronizada' | 'no_soportada' | 'sin_datos' | 'error';
  };
  capturas: {
    cara: string | null;
    huella: string | null;
  };

  carasEnEquipo: number | null;
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

function datosDeError(error: unknown): Record<string, unknown> {
  if (error instanceof ErrorFacial) return { mensaje: error.message, motivo: error.motivo };
  if (error instanceof Error) return { mensaje: error.message };
  return { mensaje: String(error) };
}

export interface PruebaConexion {
  ok: boolean;
  mensaje: string;
  codigo?:
    | 'CREDENCIALES'
    | 'CONECTIVIDAD'
    | 'SIN_CREDENCIALES'
    | 'SERIAL_AJENO'
    | 'NO_ENCONTRADO'
    | 'SIN_MAC'
    | 'FUERA_DE_RED';
  modelo?: string;
  serial?: string;
  version?: string;
  macs?: string[];
}

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
        mensaje: 'El equipo no tiene IP/credenciales cargadas: cargalas para poder enrolar.',
        codigo: 'SIN_CREDENCIALES'
      };
    }
    const info = await verificarConexion(credenciales);
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
        error instanceof DeviceConnectionError ? error.message : 'No se pudo conectar al equipo',
      codigo: error instanceof DeviceAuthError ? 'CREDENCIALES' : 'CONECTIVIDAD'
    };
  }
}

export async function guardarCredenciales(
  dispositivoId: string,
  credenciales: { ip?: string; usuario: string; clave: string }
): Promise<PruebaConexion> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');

  const usuario = credenciales.usuario.trim();
  const clave = credenciales.clave;
  const ip = (credenciales.ip ?? '').trim() || (equipo.ip ?? '').trim();
  const avisos: string[] = [];
  let falloPrevio: PruebaConexion | null = null;

  const probarEn = async (ipObjetivo: string) => {
    const prueba = await probarConexion(dispositivoId, { ip: ipObjetivo, usuario, clave });
    const serialOk = Boolean(
      prueba.ok && (!prueba.serial || prueba.serial.toUpperCase() === equipo.serial.toUpperCase())
    );
    return { prueba, serialOk };
  };

  if (ip && (await sondearPuerto(ip, 80, 800))) {
    const intento = await probarEn(ip);
    if (intento.serialOk) {
      await guardarIpYCredenciales(dispositivoId, ip, usuario, clave);
      return intento.prueba;
    }
    if (intento.prueba.codigo === 'CREDENCIALES') {
      return intento.prueba;
    }
    if (intento.prueba.ok) {
      avisos.push(
        `El equipo en ${ip} reporta el serial ${intento.prueba.serial}, no ${equipo.serial}.`
      );
    } else {
      falloPrevio = intento.prueba;
    }
  }

  const antes = ip || 'sin cargar';
  const desc = await descubrirIpDispositivo(dispositivoId, {
    forzar: true,
    credenciales: { ip, usuario, clave }
  });
  if (!desc.ok) {
    const detalle =
      desc.codigo === 'FUERA_DE_RED'
        ? `${desc.mensaje} Sin usuario y clave correctos el sistema no puede confirmar el serial.`
        : desc.mensaje;
    return {
      ok: false,
      mensaje: [...avisos, falloPrevio?.mensaje, detalle].filter(Boolean).join(' '),
      codigo: desc.codigo
    };
  }

  let ipObjetivo = (desc.ipNueva ?? '').trim() || ip;
  if (ipObjetivo && ipObjetivo !== ip) {
    avisos.push(`IP actualizada de ${antes} a ${ipObjetivo}.`);
  }

  const reintentado = await probarEn(ipObjetivo);
  if (!reintentado.prueba.ok) {
    return {
      ...reintentado.prueba,
      mensaje: [...avisos, reintentado.prueba.mensaje].join(' ')
    };
  }
  if (!reintentado.serialOk) {
    return {
      ok: false,
      mensaje: [
        ...avisos,
        `El equipo en ${ipObjetivo} reporta el serial ${reintentado.prueba.serial}, no ${equipo.serial}.`
      ].join(' '),
      codigo: 'SERIAL_AJENO'
    };
  }

  await guardarIpYCredenciales(dispositivoId, ipObjetivo, usuario, clave);
  return {
    ...reintentado.prueba,
    mensaje: [...avisos, reintentado.prueba.mensaje || 'Conexión OK'].join(' ')
  };
}

async function guardarIpYCredenciales(
  dispositivoId: string,
  ip: string,
  usuario: string,
  clave: string
): Promise<void> {
  await query(
    `UPDATE biometric_devices
        SET ip = ?, usuario_equipo = ?, clave_cifrada = ?
      WHERE id = ?`,
    [ip, usuario, cifrarSecreto(clave), dispositivoId]
  );
}

export interface DatosPersona {
  usuarioId: string;
  nombre: string;
  codigo: string;
}

export async function fotoEnVivoDelEquipo(
  dispositivoId: string
): Promise<{ base64: string; contentType: string }> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');
  return capturarFotoDelEquipo(credencialesDe(equipo));
}

export async function guardarFotoCapturada(
  dispositivoId: string,
  persona: DatosPersona,
  fotoBase64: string
): Promise<ResultadoSincronizacion> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');

  await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      await guardarPlantilla(persona.usuarioId, dispositivoId, 'cara', fotoBase64, {
        sincronizada: false,
        contexto
      });
      await activarModalidadFacial(persona.usuarioId, contexto);
    })
  );
  return {
    ok: true,
    mensaje: `Foto de ${persona.nombre} guardada en la base de datos del sistema.`,
    detalles: { cara: 'sincronizada', huella: 'sin_datos' },
    capturas: { cara: fotoBase64, huella: null },
    carasEnEquipo: null
  };
}

export async function usarFotoDelLectorComoPerfil(
  usuarioId: string,
  fotoBase64: string
): Promise<string | null> {
  try {
    const filas = await query<{ foto: string | null }[]>(
      'SELECT foto FROM usuarios WHERE id_usuario = ?',
      [usuarioId]
    );
    const actual = (filas[0]?.foto || '').trim();
    if (actual && actual !== 'default.png') return null;

    const nombre = await processAndSaveImage(bufferDesdeBase64(fotoBase64), 'user', {
      width: 500,
      height: 500,
      fit: 'cover',
      position: 'center',
      quality: 80
    });
    await guardarFotoPerfil(usuarioId, nombre);
    logger.info('[biometric-enrol] Foto del lector usada como foto de perfil', {
      usuarioId,
      foto: nombre
    });
    return nombre;
  } catch (error) {
    logger.warn('[biometric-enrol] No se pudo usar la foto del lector como foto de perfil', {
      usuarioId,
      error: datosDeError(error)
    });
    return null;
  }
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
  let presenteEnEquipo: boolean | null = null;
  try {
    carasEnEquipo = await contarCarasEnEquipo(credenciales);
  } catch {
    carasEnEquipo = null;
  }

  try {
    const cara = await leerCara(credenciales, persona.codigo);
    if (cara) {
      await guardarPlantilla(persona.usuarioId, dispositivoId, 'cara', cara.fotoBase64);
      await usarFotoDelLectorComoPerfil(persona.usuarioId, cara.fotoBase64);
      capturas.cara = cara.fotoBase64;
      detalles.cara = 'sincronizada';
      partes.push('cara sincronizada');
    } else {
      detalles.cara = 'sin_datos';
    }
  } catch (error) {
    if (esNoSoportado(error)) {
      detalles.cara = 'no_soportada';
      try {
        presenteEnEquipo = await personaEnEquipo(credenciales, persona.codigo);
      } catch {
        presenteEnEquipo = null;
      }
    } else {
      logger.error('[biometric-enrol] Error sincronizando cara', {
        dispositivoId,
        error: datosDeError(error)
      });
      detalles.cara = 'error';
      partes.push('error con la cara');
    }
  }

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

  const caraConfirmada = detalles.cara === 'sincronizada' || presenteEnEquipo === true;
  const ok =
    detalles.cara !== 'error' &&
    detalles.huella !== 'error' &&
    (caraConfirmada || detalles.huella === 'sincronizada');

  let mensaje: string;
  if (ok && detalles.cara === 'no_soportada' && presenteEnEquipo) {
    mensaje =
      `${persona.nombre} ya está en el equipo con su cara cargada. Este firmware no deja leerla ` +
      `por CGI, así que la foto se conserva en el sistema.`;
  } else if (ok) {
    mensaje = `Enrolamiento guardado: ${partes.join(' y ')}.`;
  } else if (partes.length > 0) {
    mensaje = `Se detectaron problemas: ${partes.join('; ')}.`;
  } else if (detalles.cara === 'no_soportada' && presenteEnEquipo === false) {
    mensaje =
      `${persona.nombre} todavía no está en el equipo. Este firmware no deja leer la cara por ` +
      `CGI, así que usá «Dar de alta en el equipo» para crearla con su foto (es idempotente).`;
  } else if (detalles.cara === 'no_soportada') {
    mensaje =
      `No se pudo confirmar si ${persona.nombre} está en el equipo: este firmware no deja leer ` +
      `la cara por CGI y la consulta por NetSDK tampoco respondió. «Dar de alta en el equipo» ` +
      `se puede reintentar sin riesgo (el alta es idempotente).`;
  } else {
    const codigoEnEquipo =
      carasEnEquipo === 0 ? 'El equipo todavía no tiene ninguna cara guardada. ' : '';
    mensaje =
      codigoEnEquipo +
      `No encontramos a nadie con el código ${persona.codigo} en el equipo. Usá «Dar de alta en el equipo» ` +
      `para crear a ${persona.nombre} y cargarle la cara por red, sin tocar el menú del equipo.`;
  }
  if (ok) void avisarEnrolamientoEnEquipo(dispositivoId, { credenciales });

  return { ok, mensaje, detalles, capturas, carasEnEquipo };
}

interface EstadoAltaCara {
  persona: 'creada' | 'ya_existia' | 'desconocido';
  cara: 'cargada' | 'actualizada';
}

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
  if (maestra.length > 0) return [...propias, ...maestra];
  const ficha = await query<{ foto: string | null }[]>(
    'SELECT foto FROM usuarios WHERE id_usuario = ?',
    [usuarioId]
  );
  const foto = (ficha[0]?.foto || '').trim();
  if (!foto) return propias;
  const datos = await imagenGuardadaABase64Jpeg(foto).catch(() => null);
  if (!datos) return propias;
  return [...propias, { tipo: 'cara', datos }];
}

const REINTENTAR_POR_CGI = new Set<MotivoFalloFacial>([
  'sdk_no_disponible',
  'login_fallido',
  'no_soportado'
]);

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

export async function restaurarEnEquipo(
  dispositivoId: string,
  persona: DatosPersona,
  opciones: { avisar?: boolean } = {}
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

  if (ok && opciones.avisar !== false) {
    void avisarEnrolamientoEnEquipo(dispositivoId, { credenciales });
  }

  return { ok, mensaje, motivo, detalles, capturas: { cara: null, huella: null }, carasEnEquipo };
}

export interface ResumenResincronizacion {
  restauradas: string[];
  fallidas: { nombre: string; motivo: string }[];
  inactivosOmitidos: number;
  sinDatos: number;
}

export async function resincronizarPendientesEnEquipo(
  dispositivoId: string
): Promise<ResumenResincronizacion> {
  const equipo = await obtenerEquipo(dispositivoId);
  if (!equipo) throw new DeviceConnectionError('Equipo no encontrado o revocado');
  const credenciales = credencialesDe(equipo);
  const pendientes = await query<
    { usuario_id: string; nombre: string | null; apellido: string | null; estado: number | null }[]
  >(
    `SELECT DISTINCT ON (bp.usuario_id)
           bp.usuario_id, u.nombre, u.apellido, u.estado
       FROM biometric_plantillas bp
       LEFT JOIN usuarios u ON u.id_usuario = bp.usuario_id
      WHERE bp.dispositivo_id = ? AND bp.sincronizada = 0
      ORDER BY bp.usuario_id, bp.fecha_captura ASC`,
    [dispositivoId]
  );

  const resumen: ResumenResincronizacion = {
    restauradas: [],
    fallidas: [],
    inactivosOmitidos: 0,
    sinDatos: 0
  };

  for (const fila of pendientes) {
    const usuarioId = String(fila.usuario_id);
    const nombre = [fila.nombre, fila.apellido].filter(Boolean).join(' ').trim() || usuarioId;
    if (fila.estado === null || Number(fila.estado) !== 1) {
      resumen.inactivosOmitidos += 1;
      continue;
    }

    try {
      const resultado = await restaurarEnEquipo(
        dispositivoId,
        {
          usuarioId,
          nombre,
          codigo: await codigoDePersona(usuarioId)
        },
        { avisar: false }
      );
      if (resultado.ok) {
        resumen.restauradas.push(nombre);
      } else {
        resumen.fallidas.push({ nombre, motivo: resultado.motivo || 'error' });
      }
    } catch (error) {
      logger.error('[biometric-enrol] Error re-sincronizando a una persona', {
        dispositivoId,
        usuarioId,
        error: datosDeError(error)
      });
      resumen.fallidas.push({
        nombre,
        motivo: error instanceof Error ? error.message : 'error desconocido'
      });
    }
  }
  if (resumen.restauradas.length > 0) {
    void avisarEnrolamientoEnEquipo(dispositivoId, { credenciales });
  }

  return resumen;
}

async function codigoDePersona(usuarioId: string): Promise<string> {
  const filas = await query<{ biometrico_codigo: string | null }[]>(
    'SELECT biometrico_codigo FROM usuarios WHERE id_usuario = ?',
    [usuarioId]
  );
  return String(filas[0]?.biometrico_codigo || '').trim();
}

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

export interface PresenciaEnEquipo {
  dispositivoId: string;
  nombre: string;
  ip: string | null;
  presente: boolean | null;
  motivo?: 'sdk_no_disponible' | 'error' | 'sin_credenciales';
}

export async function estadoEnEquipos(persona: DatosPersona): Promise<PresenciaEnEquipo[]> {
  const equipos = await query<EquipoEnrolable[]>(
    `SELECT id, nombre, marca, serial, ip, usuario_equipo, clave_cifrada, mac
       FROM biometric_devices WHERE revocado_en IS NULL ORDER BY fecha_crea ASC`,
    []
  );

  const resultados: PresenciaEnEquipo[] = [];
  for (const equipo of equipos) {
    const credenciales = credencialesDeFila(equipo);
    if (!credenciales) {
      resultados.push({
        dispositivoId: equipo.id,
        nombre: equipo.nombre,
        ip: equipo.ip,
        presente: null,
        motivo: 'sin_credenciales'
      });
      continue;
    }
    try {
      const presente = await personaEnEquipo(credenciales, persona.codigo);
      resultados.push({
        dispositivoId: equipo.id,
        nombre: equipo.nombre,
        ip: equipo.ip,
        presente
      });
    } catch (error) {
      const sdkNoDisponible = error instanceof ErrorFacial && error.motivo === 'sdk_no_disponible';
      logger.warn('[biometric-enrol] No se pudo consultar la presencia de la persona', {
        dispositivoId: equipo.id,
        error: datosDeError(error)
      });
      resultados.push({
        dispositivoId: equipo.id,
        nombre: equipo.nombre,
        ip: equipo.ip,
        presente: null,
        motivo: sdkNoDisponible ? 'sdk_no_disponible' : 'error'
      });
    }
  }
  return resultados;
}

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
    texto.includes('no implementado') ||
    texto.includes('no implementada')
  );
}

export interface ResultadoVerificacionFacial {
  ok: boolean;
  mensaje: string;
  motivo?: MotivoFalloFacial | 'sin_plantilla';
  coincide?: boolean;
  similitud?: number;
  umbral?: number;
  captura?: string | null;
  plantilla?: string | null;
}

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
