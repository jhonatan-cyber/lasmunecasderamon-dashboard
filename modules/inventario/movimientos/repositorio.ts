/**
 * Historial de entradas y salidas de inventario. Sólo lectura: los movimientos
 * se escriben desde los subdominios que originan la operación (bar,
 * transferencias, envases). Infraestructura privada del módulo (§5). SQL
 * movido 1:1 desde `lib/repositories/inventory/MovimientoQueries.ts`.
 */
import { query } from '@/lib/database/db';
import { getTopeSimple } from '../bar/configuracion';
import { completarOpciones } from '../helpers';

export async function listarMovimientos(presentacionId: string, limit = 20): Promise<any[]> {
  return await query<any[]>(
    `SELECT * FROM inventario_movimientos WHERE presentacion_id = ? ORDER BY fecha_crea DESC LIMIT ?`,
    [presentacionId, limit]
  );
}

/** Una botella que el movimiento tocó y cuántos ml le quitó. */
export interface UnidadConsumidaMovimiento {
  unidad_id: string;
  codigo: string;
  codigo_barras: string | null;
  ml_consumido: number;
}

/** Filtros del historial: fechas del negocio (día completo) y paginación. */
export interface FiltroHistorialMovimientos {
  /** Día inicial inclusive (AAAA-MM-DD). */
  desde?: string;
  /** Día final inclusive (AAAA-MM-DD). */
  hasta?: string;
  /** Tipo de movimiento (`inventario_movimientos.tipo`). */
  tipo?: string;
  /** Texto libre: producto, presentación, nick o código de botella. */
  q?: string;
  /** Página desde 1; el límite de filas va aparte. */
  page?: number;
  limit?: number;
}

export interface ResultadoHistorialMovimientos {
  movimientos: any[];
  total: number;
  /** Límite efectivo, para que el paginador calcule con el mismo valor. */
  limite: number;
  pagina: number;
}

/** Límite por página del historial: nunca más de 500 filas por consulta. */
export const LIMITE_HISTORIAL = 100;
const LIMITE_MAXIMO_HISTORIAL = 500;

export function normalizarPagina(page?: number): number {
  const valor = Math.floor(Number(page));
  return Number.isFinite(valor) && valor >= 1 ? valor : 1;
}

export function normalizarLimite(limit?: number): number {
  const valor = Math.floor(Number(limit));
  if (!Number.isFinite(valor) || valor < 1) return LIMITE_HISTORIAL;
  return Math.min(valor, LIMITE_MAXIMO_HISTORIAL);
}

/** FROM compartido por el conteo y el detalle, con los joins que filtran. */
const FROM_HISTORIAL = `
       FROM inventario_movimientos m
       LEFT JOIN productos pr ON pr.id_producto = m.producto_id
       LEFT JOIN inventario_presentaciones p ON p.id = m.presentacion_id
       LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
       LEFT JOIN usuarios u ON u.id_usuario = m.usuario_id
       LEFT JOIN usuarios r ON r.id_usuario = m.aceptado_por`;

/**
 * WHERE del historial. Mismos campos que busca la tabla del bar (producto,
 * presentación, nick del usuario y código de las botellas que tocó), para que
 * el total por página coincida con lo que filtra la interfaz.
 */
function condicionesHistorial(filtro: FiltroHistorialMovimientos): {
  where: string;
  params: unknown[];
} {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtro.desde) {
    condiciones.push('m.fecha_crea >= CAST(? AS date)');
    params.push(filtro.desde);
  }
  if (filtro.hasta) {
    condiciones.push("m.fecha_crea < CAST(? AS date) + INTERVAL '1 day'");
    params.push(filtro.hasta);
  }
  if (filtro.tipo) {
    condiciones.push('m.tipo = ?');
    params.push(filtro.tipo);
  }
  if (filtro.q) {
    condiciones.push(`(
        pr.nombre ILIKE ?
     OR p.nombre ILIKE ?
     OR u.nick ILIKE ?
     OR EXISTS (
          SELECT 1 FROM inventario_movimiento_unidades mu
            INNER JOIN inventario_unidades uu ON uu.id = mu.unidad_id
           WHERE mu.movimiento_id = m.id AND uu.codigo ILIKE ?
        )
    )`);
    const patron = `%${filtro.q}%`;
    params.push(patron, patron, patron, patron);
  }

  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', params };
}

/**
 * Historial paginado con filtros de fecha, tipo y texto: además de las filas
 * devuelve el total del mismo filtro, que es lo que permite paginar más allá de
 * los últimos N movimientos.
 *
 * Sin filtros y con los valores por defecto devuelve exactamente lo que
 * entregaba `listarMovimientosRecientes`.
 */
export async function buscarMovimientosRecientes(
  filtro: FiltroHistorialMovimientos = {}
): Promise<ResultadoHistorialMovimientos> {
  const limite = normalizarLimite(filtro.limit);
  const pagina = normalizarPagina(filtro.page);
  const { where, params } = condicionesHistorial(filtro);

  const conteo = await query<{ total: number }[]>(
    `SELECT COUNT(*)::int AS total${FROM_HISTORIAL} ${where}`,
    params
  );
  const total = Number(conteo[0]?.total ?? 0);

  const rows = await query<any[]>(
    `SELECT m.*, pr.nombre AS producto_nombre, pr.foto AS producto_foto,
        pr.codigo AS producto_codigo, p.codigo_barras AS codigo_barras,
        p.nombre AS presentacion_nombre,
        u.nick AS usuario_nombre,
        r.nick AS aceptado_nombre,
        c.nombre AS categoria_nombre,
        p.precio_venta AS pres_precio, p.comision AS pres_comision,
        pr.precio AS producto_precio, pr.comision AS producto_comision, pr.ml_shot,
        pr.ml_shot_anfitriona,
        -- Detalle por botella de una colación: qué unidad se abrió o se llevó y
        -- cuántos ml salieron de ella (migración 058). Es lo que muestra el
        -- historial del bar para justificar los ml descontados.
        CASE WHEN m.tipo = 'colacion' THEN (
          SELECT COALESCE(json_agg(json_build_object(
                   'unidad_id', mu.unidad_id,
                   'codigo', uu.codigo,
                   'codigo_barras', uu.codigo_barras,
                   'ml_consumido', mu.ml_consumido
                 ) ORDER BY uu.fecha_crea, uu.codigo), '[]'::json)
            FROM inventario_movimiento_unidades mu
            INNER JOIN inventario_unidades uu ON uu.id = mu.unidad_id
           WHERE mu.movimiento_id = m.id
        ) ELSE '[]'::json END AS unidades_consumidas
       ${FROM_HISTORIAL}
       ${where}
       ORDER BY m.fecha_crea DESC
       LIMIT ? OFFSET ?`,
    [...params, limite, (pagina - 1) * limite]
  );

  const topeSimple = await getTopeSimple();
  return {
    movimientos: rows.map(row => ({
      ...row,
      unidades_consumidas: Array.isArray(row.unidades_consumidas)
        ? (row.unidades_consumidas as UnidadConsumidaMovimiento[]).map(unidad => ({
            unidad_id: String(unidad.unidad_id),
            codigo: String(unidad.codigo ?? ''),
            codigo_barras: unidad.codigo_barras ?? null,
            ml_consumido: Number(unidad.ml_consumido ?? 0)
          }))
        : [],
      opciones_venta:
        completarOpciones(
          row.opciones_venta,
          [
            { precio: Number(row.precio_venta ?? 0), comision: Number(row.comision ?? 0) },
            { precio: Number(row.pres_precio ?? 0), comision: Number(row.pres_comision ?? 0) },
            {
              precio: Number(row.producto_precio ?? 0),
              comision: Number(row.producto_comision ?? 0)
            }
          ],
          topeSimple
        ) ?? row.opciones_venta
    })),
    total,
    limite,
    pagina
  };
}

/** Últimos movimientos, del más reciente al más antiguo. */
export async function listarMovimientosRecientes(limit = LIMITE_HISTORIAL): Promise<any[]> {
  const resultado = await buscarMovimientosRecientes({ limit });
  return resultado.movimientos;
}
