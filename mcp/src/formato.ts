import { z } from 'zod';
import { ApiError } from './api-client.js';
import { siguientePaso } from './pasos.js';

const MAX_CARACTERES = 20_000;

function serializarTexto(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  return JSON.stringify(valor, null, 2) ?? 'null';
}

/**
 * Recorte que sigue siendo JSON parseable: el prefijo viaja como cadena dentro
 * de un sobre, en vez de cortar el JSON por la mitad y dejarlo ilegible.
 */
function sobre(texto: string, max: number): string {
  return JSON.stringify(
    {
      truncado: true,
      caracteresOriginales: texto.length,
      limite: max,
      aviso:
        'Resultado mayor al límite: "parcial" trae sólo el prefijo. Usa paginación (limit/offset) para el resto.',
      parcial: texto.slice(0, max)
    },
    null,
    2
  );
}

export function acotar(valor: unknown, max = MAX_CARACTERES): string {
  const texto = serializarTexto(valor);
  return texto.length <= max ? texto : sobre(texto, max);
}

/**
 * Envoltorio de una herramienta: `content` es JSON siempre parseable y
 * Ambos canales contienen el mismo sobre limitado. Nunca presentar un prefijo
 * de JSON como si fuera un resultado completo.
 */
export function envolver(datos: unknown, max = MAX_CARACTERES) {
  const resultado = datos ?? null;
  const completo = JSON.stringify({ resultado }, null, 2) ?? 'null';
  const excede = completo.length > max;
  const structuredContent = excede
    ? {
        resultado: null,
        truncado: { caracteresOriginales: completo.length, limite: max },
        aviso: 'Resultado demasiado grande. Reduce limit, pagina con offset/page o utiliza filtros y consultas de detalle. No se devolvieron datos parciales.'
      }
    : { resultado };
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent
  };
}

export function ok(texto: string) {
  return { content: [{ type: 'text' as const, text: texto }] };
}

type DetalleError = {
  codigo: string;
  estado: number | null;
  mensaje: string;
  siguientePaso: string;
  codigoNegocio?: string;
};

function describirError(error: unknown): DetalleError {
  if (error instanceof ApiError) {
    const negocio =
      error.cuerpo && typeof error.cuerpo === 'object' && 'code' in error.cuerpo
        ? String((error.cuerpo as { code: unknown }).code)
        : undefined;
    return {
      codigo: error.codigo,
      estado: error.estado,
      mensaje: error.message,
      siguientePaso: siguientePaso(error.codigo, negocio),
      ...(negocio ? { codigoNegocio: negocio } : {})
    };
  }
  if (error instanceof z.ZodError) {
    const primerError = error.issues?.[0];
    return {
      codigo: 'ENTRADA_INVALIDA',
      estado: null,
      mensaje: primerError
        ? `${primerError.path.join('.') || 'argumentos'}: ${primerError.message}`
        : 'Argumentos inválidos',
      siguientePaso: siguientePaso('ENTRADA_INVALIDA')
    };
  }
  return {
    codigo: 'ERROR_HERRAMIENTA',
    estado: null,
    mensaje: error instanceof Error ? error.message : String(error),
    siguientePaso: siguientePaso('ERROR_HERRAMIENTA')
  };
}

/** Error de herramienta: JSON parseable en el texto y el mismo detalle en structuredContent. */
export function fallo(error: unknown) {
  const detalle = describirError(error);
  const texto = JSON.stringify({ error: detalle }, null, 2);
  return {
    content: [{ type: 'text' as const, text: texto }],
    // Con isError el SDK no valida contra el outputSchema: el sobre de error es
    // distinto del sobre de éxito y eso es intencional.
    structuredContent: { error: detalle },
    isError: true as const
  };
}

const esquemaTruncado = z.object({
  caracteresOriginales: z.number(),
  limite: z.number()
});

/** Detalle de error: el mismo objeto que viaja en el texto y en structuredContent. */
const esquemaError = z.object({
  codigo: z.string(),
  estado: z.number().nullable(),
  mensaje: z.string(),
  siguientePaso: z.string(),
  codigoNegocio: z.string().optional()
});

/**
 * Sobre común a las herramientas cuyo dato viene del backend y su forma cambia
 * con el dominio: el envoltorio es estricto, el payload es deliberadamente
 * laxo (`z.any()`) para que un cambio de forma en la API no convierta la
 * llamada en un error de validación.
 *
 * `resultado` y `error` son excluyentes en la práctica (éxito y fallo), pero
 * ambos opcionales porque el cliente valida el structuredContent de los
 * errores también: sin `error` en el esquema, un fallo reventaría la llamada
 * con -32602 en el lado del cliente.
 */
export const esquemaSalida = z.object({
  resultado: z.any().optional(),
  truncado: esquemaTruncado.optional(),
  aviso: z.string().optional(),
  error: esquemaError.optional()
});

/** `verificar_conexion` devuelve su diagnóstico en crudo, sin el sobre `resultado`. */
export const esquemaDiagnostico = z.object({
  destino: z.string(),
  ok: z.boolean(),
  ping: z.any(),
  autenticacion: z.any()
});
