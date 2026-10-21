/**
 * Cortos vendidos hoy: el detalle que abre el stat «Cortos servidos hoy» del
 * panel del bar. Sale de `detalle_ventas` (migración 039), la única tabla que
 * distingue un corto de una botella y guarda si se cobró a precio de anfitriona.
 *
 * Leer los cortos desde acá (y no dividiendo los ml del movimiento) evita contar
 * como corto los ml de acompañamiento de una botella o de un corto con bebida.
 */
import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import type { AcompanamientoCortoHoy, CortoVendidoHoy, OrigenCorto } from '../contracts';

/** Inicio del día del negocio, con el mismo formato que usa el resumen de shots. */
function inicioDelDia(): string {
  return `${getNowInBusinessTimezone().slice(0, 10)} 00:00:00`;
}

/**
 * Filtro del día. Las ventas anuladas quedan fuera: `ventas.estado` 1 es
 * completada y 2, servicio en curso.
 */
const CORTOS_DE_HOY = `dv.tipo_venta = 'shot' AND v.estado IN (1, 2) AND dv.fecha_crea >= ?`;

/** Cortos vendidos hoy con su producto, precio, anfitriona y venta de origen.
 *
 * `shotMl` es el volumen global por trago de Configuraciones: sirve para
 * calcular los ml de cada corto cuando el producto no tiene los suyos.
 */
export async function listarCortosServidosHoy(shotMl: number): Promise<CortoVendidoHoy[]> {
  const rows = await query<any[]>(
    `SELECT dv.id_detalle_venta AS id,
            dv.venta_id,
            v.codigo AS venta_codigo,
            dv.fecha_crea,
            dv.cantidad,
            dv.precio,
            dv.comision,
            dv.sub_total,
            dv.shot_anfitriona,
            dv.producto_id,
            pr.nombre AS producto_nombre,
            pr.ml_shot,
            pr.ml_shot_anfitriona,
            COALESCE(ip.foto, pr.foto) AS producto_foto,
            ip.nombre AS presentacion_nombre,
            an.nick AS anfitriona_nombre,
            CONCAT_WS(' ', cl.nombre, cl.apellido) AS cliente_nombre,
            h.nombre AS habitacion_nombre,
            uv.nick AS vendido_por,
            gm.nick AS mesero_nombre,
            v.metodo_pago,
            v.servicio_id,
            v.cuenta_id,
            v.habitacion_id,
            v.pedido_id,
            -- Acompañamiento por línea, con su nombre resuelto desde el catálogo
            -- (igual que el detalle de la venta). Sin catálogo manda el guardado.
            CASE WHEN dv.acompanamiento IS NOT NULL AND dv.acompanamiento <> 'null'::jsonb THEN
              dv.acompanamiento || jsonb_build_object(
                'nombre', COALESCE(NULLIF(CONCAT_WS(' ', mp.nombre, mi.nombre), ''),
                                   dv.acompanamiento->>'nombre')
              )
            END AS acompanamiento
       FROM detalle_ventas dv
       INNER JOIN ventas v ON v.id_venta = dv.venta_id
       LEFT JOIN productos pr ON pr.id_producto = dv.producto_id
       LEFT JOIN inventario_presentaciones ip ON ip.id = dv.presentacion_id
       LEFT JOIN inventario_presentaciones mi ON mi.id = dv.acompanamiento->>'presentacion_id'
       LEFT JOIN productos mp ON mp.id_producto = mi.producto_id
       LEFT JOIN usuarios an ON an.id_usuario = dv.hostess_id
       LEFT JOIN clientes cl ON cl.id_cliente = v.cliente_id
       LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
       LEFT JOIN usuarios uv ON uv.id_usuario = v.created_by
       LEFT JOIN pedidos pe ON pe.id_pedido = v.pedido_id
       LEFT JOIN usuarios gm ON gm.id_usuario = pe.mesero_id
      WHERE ${CORTOS_DE_HOY}
      ORDER BY dv.fecha_crea DESC, dv.id_detalle_venta DESC`,
    [inicioDelDia()]
  );

  return rows.map(row => {
    // El volumen del trago es el del producto; sin el suyo manda el global
    // (misma regla con la que el bar descuenta stock al vender).
    const mlCliente = resolveShotMl(row.ml_shot, shotMl);
    const mlUnitario =
      row.shot_anfitriona === true
        ? resolveShotMlAnfitriona(row.ml_shot_anfitriona, mlCliente)
        : mlCliente;
    const cantidad = Number(row.cantidad ?? 0);
    // El servicio manda sobre la habitación: un corto consumido en un servicio
    // se cobra a la habitación, pero su origen es el servicio.
    const origen: OrigenCorto = row.servicio_id
      ? 'servicio'
      : row.cuenta_id
        ? 'cuenta'
        : row.habitacion_id
          ? 'habitacion'
          : row.pedido_id
            ? 'pedido'
            : 'barra';
    return {
      id: String(row.id),
      venta_id: String(row.venta_id ?? ''),
      venta_codigo: String(row.venta_codigo ?? ''),
      fecha: String(row.fecha_crea ?? ''),
      cantidad,
      ml: mlUnitario * cantidad,
      precio: Number(row.precio ?? 0),
      comision: Number(row.comision ?? 0),
      subtotal: Number(row.sub_total ?? 0),
      anfitriona: row.shot_anfitriona === true,
      anfitriona_nombre: row.anfitriona_nombre ?? null,
      producto_id: String(row.producto_id ?? ''),
      producto_nombre: String(row.producto_nombre ?? 'Producto sin nombre'),
      producto_foto: row.producto_foto ?? null,
      presentacion_nombre: row.presentacion_nombre ?? null,
      origen,
      cliente_nombre: String(row.cliente_nombre ?? '').trim() || null,
      habitacion_nombre: row.habitacion_nombre ?? null,
      vendido_por: row.vendido_por ?? null,
      mesero_nombre: row.mesero_nombre ?? null,
      metodo_pago: row.metodo_pago ?? null,
      acompanamiento: mapAcompanamiento(row.acompanamiento)
    };
  });
}

/**
 * El acompañamiento viaja como jsonb (`'null'` cuando no lo hay). Cada línea
 * trae una sola medida: `ml_por_corto` o `unidades`, nunca ambas.
 */
function mapAcompanamiento(raw: unknown): AcompanamientoCortoHoy | null {
  let data: Record<string, unknown> | null = null;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      data = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      data = null;
    }
  } else if (raw && typeof raw === 'object') {
    data = raw as Record<string, unknown>;
  }
  if (!data) return null;

  const nombre = typeof data.nombre === 'string' && data.nombre.trim() ? data.nombre.trim() : null;
  const ml = Number(data.ml_por_corto);
  const unidades = Number(data.unidades);
  const resultado: AcompanamientoCortoHoy = {
    nombre,
    ml_por_corto: Number.isFinite(ml) && ml > 0 ? ml : null,
    unidades: Number.isFinite(unidades) && unidades > 0 ? unidades : null
  };
  // Un objeto vacío no dice nada: mejor tratarlo como «sin acompañamiento».
  return resultado.nombre === null && resultado.ml_por_corto === null && resultado.unidades === null
    ? null
    : resultado;
}
