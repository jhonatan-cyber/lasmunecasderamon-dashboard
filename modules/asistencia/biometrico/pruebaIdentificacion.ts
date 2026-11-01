import { query } from '@/lib/database/db';
import {
  ErrorFacial,
  extraerVectorFacial,
  similitudCoseno,
  umbralCoincidenciaFacial
} from './faceSdk';

/**
 * Identificación 1:N para la prueba física: toma una foto (la que ve la cámara
 * ahora) y la compara contra las plantillas faciales guardadas, devolviendo a
 * quién se parece y con qué similitud. No escribe asistencias ni toca el
 * lector: es una herramienta de diagnóstico.
 *
 * Usa el motor por software (ONNX) aunque haya lector configurado, para que la
 * prueba funcione con la webcam de cualquier equipo.
 */

export interface CandidatoPrueba {
  usuarioId: string;
  nombre: string;
  run: string | null;
  codigo: string | null;
  similitud: number;
}

export interface ResultadoPruebaIdentificacion {
  ok: boolean;
  mensaje: string;
  motivo?: string;
  umbral: number;
  evaluados: number;
  mejor: CandidatoPrueba | null;
  candidatos: CandidatoPrueba[];
}

interface FilaPlantilla {
  id: string;
  datos: string;
  fecha_captura: Date | string | null;
  id_usuario: string;
  nombre: string | null;
  apellido: string | null;
  run: string | null;
  biometrico_codigo: string | null;
}

// El vector de la foto de referencia no cambia hasta que se re-enrola, así que
// se cachea por plantilla + fecha de captura para no reextraerlo en cada frame.
const cacheVectores = new Map<string, Float32Array>();

function bufferDesdeBase64(datos: string): Buffer {
  const limpio = datos.includes(',') ? datos.slice(datos.indexOf(',') + 1) : datos;
  return Buffer.from(limpio.replace(/\s+/g, ''), 'base64');
}

function claveCache(fila: FilaPlantilla): string {
  const fecha =
    fila.fecha_captura instanceof Date
      ? fila.fecha_captura.toISOString()
      : String(fila.fecha_captura ?? '');
  return `${fila.id}:${fecha}`;
}

export async function identificarPersonaEnPlantillas(
  foto: Buffer
): Promise<ResultadoPruebaIdentificacion> {
  const umbral = umbralCoincidenciaFacial();

  if (!foto || foto.length === 0) {
    return {
      ok: false,
      mensaje: 'La captura llegó vacía.',
      motivo: 'foto_invalida',
      umbral,
      evaluados: 0,
      mejor: null,
      candidatos: []
    };
  }

  const filas = await query<FilaPlantilla[]>(
    `SELECT DISTINCT ON (p.usuario_id)
            p.id, p.datos, p.fecha_captura,
            u.id_usuario, u.nombre, u.apellido, u.run, u.biometrico_codigo
       FROM biometric_plantillas p
       JOIN usuarios u ON u.id_usuario = p.usuario_id
      WHERE p.tipo = 'cara' AND u.estado = 1 AND u.biometrico_facial = 1
      ORDER BY p.usuario_id, p.fecha_captura DESC NULLS LAST`
  );

  if (filas.length === 0) {
    return {
      ok: false,
      mensaje: 'No hay personas enroladas con plantilla facial guardada.',
      motivo: 'sin_plantillas',
      umbral,
      evaluados: 0,
      mejor: null,
      candidatos: []
    };
  }

  let vectorCaptura: Float32Array;
  try {
    // Sin credenciales: fuerza el motor por software (no depende del lector).
    vectorCaptura = await extraerVectorFacial(null, foto);
  } catch (error) {
    const motivo = error instanceof ErrorFacial ? error.motivo : 'error';
    const mensaje =
      error instanceof ErrorFacial && error.motivo === 'sin_cara'
        ? 'La cámara no ve ninguna cara: poné a la persona de frente y con buena luz.'
        : error instanceof Error
          ? error.message
          : String(error);
    return { ok: false, mensaje, motivo, umbral, evaluados: 0, mejor: null, candidatos: [] };
  }

  const candidatos: CandidatoPrueba[] = [];
  for (const fila of filas) {
    const clave = claveCache(fila);
    let vector = cacheVectores.get(clave);
    if (!vector) {
      try {
        vector = await extraerVectorFacial(null, bufferDesdeBase64(String(fila.datos || '')));
        cacheVectores.set(clave, vector);
      } catch {
        // Una plantilla ilegible no invalida la prueba: se salta.
        continue;
      }
    }
    candidatos.push({
      usuarioId: fila.id_usuario,
      nombre: `${fila.nombre ?? ''} ${fila.apellido ?? ''}`.trim() || 'Sin nombre',
      run: fila.run,
      codigo: fila.biometrico_codigo,
      similitud: similitudCoseno(vector, vectorCaptura)
    });
  }

  if (candidatos.length === 0) {
    return {
      ok: false,
      mensaje: 'Ninguna plantilla facial guardada se pudo leer.',
      motivo: 'sin_plantillas',
      umbral,
      evaluados: filas.length,
      mejor: null,
      candidatos: []
    };
  }

  candidatos.sort((a, b) => b.similitud - a.similitud);
  const mejor = candidatos[0];

  return {
    ok: true,
    mensaje:
      mejor.similitud >= umbral
        ? `Coincide con ${mejor.nombre} (${Math.round(mejor.similitud * 100)}%).`
        : `No coincide con nadie: el mejor candidato es ${mejor.nombre} con ${Math.round(
            mejor.similitud * 100
          )}% (mínimo ${Math.round(umbral * 100)}%).`,
    umbral,
    evaluados: candidatos.length,
    mejor,
    candidatos: candidatos.slice(0, 5)
  };
}
