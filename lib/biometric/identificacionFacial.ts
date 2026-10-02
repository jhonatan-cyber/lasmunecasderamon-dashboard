import { query } from '@/lib/database/db';
import logger from '@/lib/utils/logger';
import { atribuirAsistenciaIdentificada } from '@/lib/biometric/processBiometricEvent';
import { credencialesDeFila, type CredencialesEquipo } from './deviceClient';
import {
  ErrorFacial,
  extraerVectorFacial,
  similitudCoseno,
  umbralCoincidenciaFacial
} from './faceSdk';

const MAX_ACTIVOS = 1;
const MAX_INTENTOS = 3;
const LIMITE_BARRIDO = 3;
const VENTANA_DIAS = 3;

export type EstadoIdentificacion =
  | 'identificado'
  | 'conflicto'
  | 'sin_coincidencia'
  | 'sin_cara'
  | 'sin_plantillas'
  | 'error'
  | 'sin_foto';

export function serializarVector(vector: Float32Array): Buffer {
  const buffer = Buffer.allocUnsafe(vector.length * 4);
  for (let i = 0; i < vector.length; i++) buffer.writeFloatLE(vector[i], i * 4);
  return buffer;
}

export function deserializarVector(buffer: Buffer): Float32Array {
  const vector = new Float32Array(Math.floor(buffer.length / 4));
  for (let i = 0; i < vector.length; i++) vector[i] = buffer.readFloatLE(i * 4);
  return vector;
}

function bufferDesdeBase64(datos: string): Buffer {
  const limpio = datos.includes(',') ? datos.slice(datos.indexOf(',') + 1) : datos;
  return Buffer.from(limpio, 'base64');
}

interface FilaPlantilla {
  id: string;
  usuario_id: string;
  dispositivo_id: string;
  datos: string;
  vector: Buffer | null;
  vector_actualizado_en: Date | null;
  fecha_captura: Date | null;
}

async function ultimasPlantillas(): Promise<FilaPlantilla[]> {
  return query<FilaPlantilla[]>(
    `SELECT DISTINCT ON (usuario_id)
            id, usuario_id, dispositivo_id, datos, vector, vector_actualizado_en, fecha_captura
       FROM biometric_plantillas
      WHERE tipo = 'cara'
        AND usuario_id IN (SELECT id_usuario FROM usuarios WHERE estado = 1 AND biometrico_facial = 1)
      ORDER BY usuario_id, fecha_captura DESC NULLS LAST`
  );
}

function vectorDesactualizado(fila: FilaPlantilla): boolean {
  if (!fila.vector_actualizado_en) return true;
  return fila.fecha_captura != null && fila.vector_actualizado_en < fila.fecha_captura;
}

const FALLOS_DETERMINISTAS_PLANTILLA: readonly string[] = [
  'sin_cara',
  'foto_invalida',
  'no_soportado'
];

async function credencialesParaExtraer(dispositivoId: string): Promise<CredencialesEquipo | null> {
  const propias = await query<
    { ip: string | null; usuario_equipo: string | null; clave_cifrada: string | null }[]
  >(
    `SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices
      WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  if (propias[0]) return credencialesDeFila(propias[0]);

  const alguna = await query<
    { ip: string | null; usuario_equipo: string | null; clave_cifrada: string | null }[]
  >(
    `SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices
      WHERE revocado_en IS NULL AND ip IS NOT NULL
      LIMIT 1`
  );
  return alguna[0] ? credencialesDeFila(alguna[0]) : null;
}

export async function actualizarVectoresPlantillas(): Promise<number> {
  const pendientes = (await ultimasPlantillas()).filter(vectorDesactualizado);
  if (!pendientes.length) return 0;

  let listas = 0;
  for (const fila of pendientes) {
    try {
      const credenciales = await credencialesParaExtraer(fila.dispositivo_id);
      if (!credenciales) {
        logger.warn('[biometric-ident] Sin equipo activo para extraer el vector', {
          usuarioId: fila.usuario_id,
          dispositivoId: fila.dispositivo_id
        });
        continue;
      }

      const vector = await extraerVectorFacial(credenciales, bufferDesdeBase64(fila.datos));
      await query(
        `UPDATE biometric_plantillas
            SET vector = ?, vector_actualizado_en = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [serializarVector(vector), fila.id]
      );
      listas += 1;
    } catch (error) {
      const motivo = error instanceof ErrorFacial ? error.motivo : 'error';
      if (error instanceof ErrorFacial && FALLOS_DETERMINISTAS_PLANTILLA.includes(motivo)) {
        await query(
          `UPDATE biometric_plantillas SET vector_actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [fila.id]
        );
        logger.warn('[biometric-ident] La foto de referencia no sirve para extraer el vector', {
          usuarioId: fila.usuario_id,
          motivo
        });
        continue;
      }
      logger.warn('[biometric-ident] No se pudo extraer el vector de la plantilla', {
        usuarioId: fila.usuario_id,
        motivo,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return listas;
}

interface Candidato {
  usuarioId: string;
  vector: Float32Array;
}

async function candidatos(): Promise<Candidato[]> {
  const filas = await query<{ usuario_id: string; vector: Buffer }[]>(
    `SELECT DISTINCT ON (usuario_id) usuario_id, vector
       FROM biometric_plantillas
      WHERE tipo = 'cara' AND vector IS NOT NULL
        AND usuario_id IN (SELECT id_usuario FROM usuarios WHERE estado = 1 AND biometrico_facial = 1)
      ORDER BY usuario_id, fecha_captura DESC NULLS LAST`
  );
  return filas
    .filter(fila => fila.vector && fila.vector.length >= 4)
    .map(fila => ({ usuarioId: fila.usuario_id, vector: deserializarVector(fila.vector) }));
}

async function usuarioReclamado(codigo: string | null): Promise<string | null> {
  const limpio = (codigo ?? '').trim();
  if (!limpio) return null;
  const candidatos = [limpio];
  if (/^0\d+$/.test(limpio)) candidatos.push(String(parseInt(limpio, 10)));
  for (const candidato of candidatos) {
    const rows = await query<{ id_usuario: string }[]>(
      `SELECT id_usuario FROM usuarios
        WHERE biometrico_codigo IS NOT NULL AND TRIM(biometrico_codigo) <> ''
          AND LOWER(TRIM(biometrico_codigo)) = LOWER(?)`,
      [candidato]
    );
    if (rows.length > 0) return rows[0].id_usuario;
  }
  return null;
}

async function guardarResultado(
  recordId: string,
  estado: EstadoIdentificacion,
  usuarioId: string | null,
  similitud: number | null
): Promise<void> {
  await query(
    `UPDATE biometric_device_records
        SET identificado_usuario_id = ?, identificacion_similitud = ?, identificacion_estado = ?
      WHERE id = ?`,
    [usuarioId, similitud, estado, recordId]
  );
}

export async function identificarRecord(
  recordId: string,
  dispositivoId: string
): Promise<EstadoIdentificacion> {
  const filas = await query<
    {
      foto: Buffer | null;
      codigo_persona: string | null;
      rec_no: unknown;
      fecha_dispositivo: Date | null;
    }[]
  >(
    `SELECT foto, codigo_persona, rec_no, fecha_dispositivo
       FROM biometric_device_records WHERE id = ?`,
    [recordId]
  );
  const record = filas[0];
  if (!record) return 'sin_foto';
  if (!record.foto || record.foto.length === 0) {
    await guardarResultado(recordId, 'sin_foto', null, null);
    return 'sin_foto';
  }

  const pendientes = (await ultimasPlantillas()).filter(vectorDesactualizado);
  if (pendientes.length) await actualizarVectoresPlantillas();

  const candidatosLista = await candidatos();
  if (!candidatosLista.length) {
    const sigueFaltando = (await ultimasPlantillas()).some(vectorDesactualizado);
    if (sigueFaltando) throw new Error('Vectores de plantillas aún pendientes');
    await guardarResultado(recordId, 'sin_plantillas', null, null);
    return 'sin_plantillas';
  }

  const credencialesFilas = await query<
    { ip: string | null; usuario_equipo: string | null; clave_cifrada: string | null }[]
  >(
    `SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  const credenciales = credencialesFilas[0] ? credencialesDeFila(credencialesFilas[0]) : null;
  if (!credenciales) throw new Error(`Sin credenciales del equipo ${dispositivoId}`);

  let captura: Float32Array;
  try {
    captura = await extraerVectorFacial(credenciales, record.foto);
  } catch (error) {
    if (error instanceof ErrorFacial) {
      const deterministas: readonly string[] = ['sin_cara', 'foto_invalida', 'no_soportado'];
      if (deterministas.includes(error.motivo)) {
        const estado: EstadoIdentificacion = error.motivo === 'sin_cara' ? 'sin_cara' : 'error';
        await guardarResultado(recordId, estado, null, null);
        if (estado === 'error') {
          logger.warn('[biometric-ident] El equipo no pudo analizar la foto del record', {
            recordId,
            motivo: error.motivo
          });
        }
        return estado;
      }
    }
    throw error;
  }

  let mejor: Candidato | null = null;
  let mejorSimilitud = 0;
  for (const candidato of candidatosLista) {
    const similitud = similitudCoseno(captura, candidato.vector);
    if (!mejor || similitud > mejorSimilitud) {
      mejor = candidato;
      mejorSimilitud = similitud;
    }
  }

  const umbral = umbralCoincidenciaFacial();
  if (!mejor || mejorSimilitud < umbral) {
    await guardarResultado(recordId, 'sin_coincidencia', null, mejorSimilitud);
    return 'sin_coincidencia';
  }

  const reclamado = await usuarioReclamado(record.codigo_persona);
  const estado: EstadoIdentificacion =
    reclamado && reclamado !== mejor.usuarioId ? 'conflicto' : 'identificado';
  await guardarResultado(recordId, estado, mejor.usuarioId, mejorSimilitud);

  if (estado === 'identificado') {
    // Acredita la asistencia si la persona no tenía hoy: entra sin código y
    // el servidor igual sabe quién es. Un fallo acá no invalida la identificación.
    try {
      const atribucion = await atribuirAsistenciaIdentificada(
        mejor.usuarioId,
        recordId,
        dispositivoId,
        record.fecha_dispositivo
      );
      if (atribucion === 'registrado') {
        logger.info('[biometric-ident] Asistencia acreditada por la cara', {
          recordId,
          usuarioId: mejor.usuarioId,
          similitud: Number(mejorSimilitud.toFixed(3))
        });
      }
    } catch (error) {
      logger.warn('[biometric-ident] No se pudo acreditar la asistencia identificada', {
        recordId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (estado === 'conflicto') {
    logger.warn('[biometric-ident] El equipo y la foto no coinciden', {
      recordId,
      recNo: record.rec_no,
      reclamado,
      identificado: mejor.usuarioId,
      similitud: Number(mejorSimilitud.toFixed(3)),
      umbral
    });
  }
  return estado;
}

export interface IdentificacionImagen {
  usuarioId: string;
  similitud: number;
}

export async function identificarImagen(
  foto: Buffer,
  dispositivoId: string
): Promise<IdentificacionImagen | null> {
  if (!foto || foto.length === 0) return null;

  const pendientes = (await ultimasPlantillas()).filter(vectorDesactualizado);
  if (pendientes.length) await actualizarVectoresPlantillas();

  const candidatosLista = await candidatos();
  if (!candidatosLista.length) return null;

  const credencialesFilas = await query<
    { ip: string | null; usuario_equipo: string | null; clave_cifrada: string | null }[]
  >(
    `SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  const credenciales = credencialesFilas[0] ? credencialesDeFila(credencialesFilas[0]) : null;
  if (!credenciales) throw new Error(`Sin credenciales del equipo ${dispositivoId}`);

  const captura = await extraerVectorFacial(credenciales, foto);

  let mejor: Candidato | null = null;
  let mejorSimilitud = 0;
  for (const candidato of candidatosLista) {
    const similitud = similitudCoseno(captura, candidato.vector);
    if (!mejor || similitud > mejorSimilitud) {
      mejor = candidato;
      mejorSimilitud = similitud;
    }
  }
  if (!mejor || mejorSimilitud < umbralCoincidenciaFacial()) return null;
  return { usuarioId: mejor.usuarioId, similitud: mejorSimilitud };
}

interface Pendiente {
  recordId: string;
  dispositivoId: string;
}

const enVuelo = new Set<string>();
const cola: Pendiente[] = [];
const intentos = new Map<string, number>();
let activos = 0;

async function identificarEnCola(pendiente: Pendiente): Promise<void> {
  try {
    await identificarRecord(pendiente.recordId, pendiente.dispositivoId);
    intentos.delete(pendiente.recordId);
  } catch (error) {
    registrarFallo(pendiente, error);
  }
}

function registrarFallo(pendiente: Pendiente, error?: unknown): void {
  const total = (intentos.get(pendiente.recordId) ?? 0) + 1;
  intentos.set(pendiente.recordId, Math.min(total, MAX_INTENTOS));
  if (total <= 2) {
    logger.warn('[biometric-ident] No se pudo identificar la foto del record', {
      recordId: pendiente.recordId,
      intento: total,
      motivo: error instanceof ErrorFacial ? error.motivo : 'error',
      mensaje: error instanceof Error ? error.message : String(error),
      error
    });
  }
  if (total >= MAX_INTENTOS) {
    void guardarResultado(pendiente.recordId, 'error', null, null).catch(() => undefined);
  }
}

function bombear(): void {
  while (activos < MAX_ACTIVOS && cola.length > 0) {
    const pendiente = cola.shift()!;
    activos += 1;
    void identificarEnCola(pendiente)
      .catch(() => undefined)
      .finally(() => {
        enVuelo.delete(pendiente.recordId);
        activos -= 1;
        bombear();
      });
  }
}

export function encolarIdentificacionDeRecord(pendiente: Pendiente): void {
  if (enVuelo.has(pendiente.recordId)) return;
  if ((intentos.get(pendiente.recordId) ?? 0) >= MAX_INTENTOS) return;
  enVuelo.add(pendiente.recordId);
  cola.push(pendiente);
  bombear();
}

export async function recuperarIdentificacionesPendientes(
  limite: number = LIMITE_BARRIDO
): Promise<number> {
  // Los que ya gastaron sus intentos en ESTE proceso no vuelven a entrar:
  // si no, el barrido (siempre los más recientes) se atasca con los mismos y
  // nunca alcanza al resto. Tras un reinicio el mapa se vacía y prueban de nuevo.
  const agotados = [...intentos.entries()]
    .filter(([, n]) => n >= MAX_INTENTOS)
    .map(([id]) => id)
    .filter(id => /^[0-9a-f-]{36}$/i.test(id));
  const excluidos = agotados.length ? ` AND id NOT IN ('${agotados.join("','")}')` : '';

  const pendientes = await query<{ id: string; dispositivo_id: string }[]>(
    `SELECT id, dispositivo_id
       FROM biometric_device_records
      WHERE foto IS NOT NULL
        AND (identificacion_estado IS NULL OR identificacion_estado = 'error')
        AND fecha_dispositivo > CURRENT_TIMESTAMP - interval '${VENTANA_DIAS} days'${excluidos}
      ORDER BY fecha_dispositivo DESC
      LIMIT ?`,
    [limite]
  );
  for (const fila of pendientes) {
    if (!fila.id) continue;
    encolarIdentificacionDeRecord({ recordId: fila.id, dispositivoId: fila.dispositivo_id });
  }
  return pendientes.length;
}
