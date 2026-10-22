/**
 * Presupuesto de duración por archivo, compartido por las suites que lo
 * vigilan (Vitest unitaria, Vitest de Postgres y Playwright).
 */

/**
 * Etiqueta estable del gate: la buscan los tests de los reporters y los logs
 * de CI. Vive aquí para que las tres suites no la repitan.
 */
export const ETIQUETA = 'file-budget';

export interface ArchivoExcedido {
  archivo: string;
  totalMs: number;
  /** Contexto opcional, p. ej. `diagnóstico 31.5 s, reloj 33.0 s`. */
  detalle?: string;
}

/** Segundos con un decimal, para que el informe sea comparable entre corridas. */
export function segundos(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * Mensaje único de fallo cuando al menos un archivo supera el presupuesto.
 * Devuelve `null` si la lista viene vacía, para que quien llama no tenga que
 * repetir la condición.
 */
export function formatearExcesoDePresupuesto(
  presupuestoMs: number,
  excedidos: readonly ArchivoExcedido[]
): string | null {
  if (!excedidos.length) return null;

  const detalle = excedidos
    .map(
      ({ archivo, totalMs, detalle: contexto }) =>
        `- ${archivo}: ${segundos(totalMs)}${contexto ? ` (${contexto})` : ''}`
    )
    .join('\n');

  return (
    `[${ETIQUETA}] ${excedidos.length} archivo(s) superaron el presupuesto de ` +
    `${segundos(presupuestoMs)} por archivo:\n${detalle}`
  );
}

/**
 * Lee el presupuesto de una variable de entorno para poder probar el fallo en
 * CI (o ajustar la máquina) sin editar la configuración. Un valor inválido o
 * no positivo cae al valor por defecto.
 */
export function presupuestoDesdeEnv(nombre: string, porDefecto: number): number {
  const valor = Number(process.env[nombre]);
  return Number.isFinite(valor) && valor > 0 ? valor : porDefecto;
}
