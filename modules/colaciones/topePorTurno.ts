/**
 * Regla de colaciones por rol y turno de caja.
 *
 * La configuración guarda un mapa `rol_id → tope de colaciones por turno de
 * caja`: cada trabajador del rol puede recibir hasta ese número de colaciones
 * dentro de la cola abierta del turno. Sin entrada en el mapa queda la regla
 * vigente (1 por trabajador por turno) y 0 significa que el rol no recibe
 * colación. Esas decisiones son puro negocio, sin dependencias de
 * infraestructura, para poder probarlas en aislamiento.
 */

/** Tope de colaciones por turno de caja, con el `rol_id` como texto. */
export type TopesColacionesPorRol = Record<string, number>;

const CLAVE_TOPE = 'colaciones_por_rol_y_turno';

/** Regla vigente cuando el rol no tiene tope configurado. */
const TOPE_VIGENTE_POR_TRABAJADOR = 1;

/** Clave de configuración que guarda la regla. */
export function claveColacionesPorRol(): string {
  return CLAVE_TOPE;
}

/**
 * Interpreta el valor guardado (`'{"10": 2}'`) y devuelve el mapa de topes.
 * Ignora entradas inválidas en lugar de descartar todo el mapa: una fila rota
 * de un rol viejo no tenía por qué destruir la regla del resto.
 */
export function interpretarColacionesPorRol(valor: unknown): TopesColacionesPorRol {
  let crudo: unknown = valor;
  if (typeof crudo !== 'string') return {};
  try {
    crudo = JSON.parse(crudo);
  } catch {
    return {};
  }
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return {};
  const topes: TopesColacionesPorRol = {};
  for (const [rolId, tope] of Object.entries(crudo as Record<string, unknown>)) {
    if (typeof tope !== 'number' || !Number.isInteger(tope) || tope < 0) continue;
    topes[rolId] = tope;
  }
  return topes;
}

/**
 * Tope del rol en el turno: el configurado para su `rol_id` o, si su rol no
 * está en el mapa (o el usuario no tiene rol), la regla vigente de 1 por
 * trabajador que existía antes de esta clave.
 */
export function topeColacionesPorTurno(
  topes: TopesColacionesPorRol,
  rolId: string | number | null | undefined
): number {
  if (rolId === null || rolId === undefined || rolId === '') return TOPE_VIGENTE_POR_TRABAJADOR;
  const tope = topes[String(rolId)];
  return typeof tope === 'number' && Number.isInteger(tope) && tope >= 0
    ? tope
    : TOPE_VIGENTE_POR_TRABAJADOR;
}

/**
 * Devuelve el mensaje de rechazo si el trabajador ya alcanzó el tope de su rol
 * en el turno, o `null` si la colación está permitida.
 */
export function excesoColacionesPorRol(
  topes: TopesColacionesPorRol,
  rolId: string | number | null | undefined,
  yaRecibidas: number
): string | null {
  const tope = topeColacionesPorTurno(topes, rolId);
  if (tope === 0) return 'Este rol no recibe colación';
  if (yaRecibidas < tope) return null;
  // El mensaje del rol sin configurar es el que la regla vigente venía usando.
  if (tope === TOPE_VIGENTE_POR_TRABAJADOR)
    return 'Este trabajador ya recibió su colación durante este turno de caja';
  return `Este trabajador ya recibió sus ${tope} colaciones durante este turno de caja`;
}
