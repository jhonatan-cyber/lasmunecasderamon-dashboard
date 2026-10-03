/**
 * Medición de consultas a PostgreSQL, solo en desarrollo.
 *
 * Antes no había forma de saber cuántas consultas hace realmente un endpoint: la única
 * señal era el tiempo total de la respuesta, que mezcla base de datos, caché, serialización
 * y red. La auditoría de rendimiento necesitaba el desglose, así que aquí se lleva la cuenta
 * de cada `pool.query()` agrupada por su huella (el SQL con los valores concretos
 * substituidos por `?`), con cuántas veces se ejecutó y cuánto tardó en total.
 *
 * Se lee desde la respuesta de cualquier endpoint con la cabecera `x-lmr-consultas`
 * (`?perfil=1` añade el detalle por SQL). En producción no se registra nada: el único costo
 * es una comparación de booleano por consulta.
 */

const ACTIVO = process.env.NODE_ENV !== 'production';

export interface MuestraConsulta {
  /** SQL normalizado: espacios colapsados y literales sustituidos por `?`. */
  sql: string;
  /** Cuántas veces se ejecutó desde el último `reiniciarPerfil()`. */
  n: number;
  /** Milisegundos acumulados dentro de PostgreSQL. */
  ms: number;
  /** La ejecución más lenta. */
  maxMs: number;
}

export interface ResumenConsultas {
  /** Total de consultas. */
  n: number;
  /** Milisegundos acumulados dentro de PostgreSQL, sin el establecimiento de conexión. */
  ms: number;
  /**
   * Milisegundos que se tardó en abrir conexiones nuevas contra el servidor.
   * Van aparte a propósito: en la primera consulta tras arrancar el proceso
   * PostgreSQL mide ~0,05 ms y la conexión unos 65 ms, y atribuirlos a la misma
   * bolsa hacía que un `SELECT` trivial apareciera como la consulta lenta del
   * flujo.
   */
  conexionMs: number;
  /** Consultas distintas. */
  distintas: number;
  detalle: MuestraConsulta[];
}

const porSql = new Map<string, MuestraConsulta>();
let conexionMs = 0;

/** Suma el costo de abrir una conexión, que no es trabajo de PostgreSQL. */
export function registrarConexion(ms: number): void {
  if (!ACTIVO) return;
  conexionMs += ms;
}

/** Sustituye literales y listas `IN (…)` por `?` para que el mismo SQL sea una sola huella. */
function huella(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/'[^']*'/g, '?')
    .replace(/\b\d+\b/g, '?')
    .trim()
    .slice(0, 300);
}

export function perfilActivo(): boolean {
  return ACTIVO;
}

/** Registra una consulta terminada. `sql` es el SQL original, con sus parámetros. */
export function registrarConsulta(sql: string, ms: number): void {
  if (!ACTIVO) return;
  const clave = huella(sql);
  const previa = porSql.get(clave);
  if (previa) {
    previa.n += 1;
    previa.ms += ms;
    previa.maxMs = Math.max(previa.maxMs, ms);
  } else {
    porSql.set(clave, { sql: clave, n: 1, ms, maxMs: ms });
  }
}

/** Instantánea de lo registrado. `detalle: false` devuelve sólo los totales. */
export function instantaneaPerfil(detalle = false): ResumenConsultas {
  const muestras = [...porSql.values()].sort((a, b) => b.ms - a.ms);
  const n = muestras.reduce((s, m) => s + m.n, 0);
  const ms = muestras.reduce((s, m) => s + m.ms, 0);
  return {
    n,
    ms: Math.round(ms),
    conexionMs: Math.round(conexionMs),
    distintas: muestras.length,
    detalle: detalle
      ? muestras.slice(0, 15).map(m => ({ ...m, ms: Math.round(m.ms), maxMs: Math.round(m.maxMs) }))
      : []
  };
}

export function reiniciarPerfil(): void {
  porSql.clear();
  conexionMs = 0;
}
