/**
 * Colaciones servidas hoy desde el bar. Se leen de los movimientos de
 * inventario (`tipo = 'colacion'`), no de la tabla del módulo Colaciones: el
 * resumen del bar cuenta los ml que realmente salieron de una botella, y con
 * esta fuente el listado cuadra siempre con `mlColacionHoy`.
 *
 * La fuente son los movimientos y no la tabla del módulo a propósito: una
 * colación que no saca bebida del bar (0 ml y sin Acompañamiento) no genera
 * movimiento, y eso es correcto: el resumen cuenta lo que salió del bar, no
 * lo que se registró. El registro de quién recibió qué lo lleva la tabla.
 */
import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type { ColacionServidaHoy } from '../contracts';

function inicioDelDia(): string {
  return `${getNowInBusinessTimezone().slice(0, 10)} 00:00:00`;
}

/** Colaciones del día, de la más reciente a la más antigua. */
export async function listarColacionesServidasHoy(): Promise<ColacionServidaHoy[]> {
  const rows = await query<any[]>(
    `SELECT m.id, m.ml, m.fecha_crea,
            pr.nombre AS producto_nombre,
            COALESCE(p.foto, pr.foto) AS producto_foto,
            p.nombre AS presentacion_nombre,
            u.nick AS registrado_por
       FROM inventario_movimientos m
       LEFT JOIN productos pr ON pr.id_producto = m.producto_id
       LEFT JOIN inventario_presentaciones p ON p.id = m.presentacion_id
       LEFT JOIN usuarios u ON u.id_usuario = m.usuario_id
      WHERE m.tipo = 'colacion' AND m.ml IS NOT NULL AND m.fecha_crea >= ?
      ORDER BY m.fecha_crea DESC, m.id DESC`,
    [inicioDelDia()]
  );

  return rows.map(row => ({
    id: String(row.id),
    producto_nombre: String(row.producto_nombre ?? 'Bebida sin nombre'),
    producto_foto: row.producto_foto ?? null,
    presentacion_nombre: row.presentacion_nombre ?? null,
    ml: Number(row.ml ?? 0),
    registrado_por: row.registrado_por ?? null,
    fecha: String(row.fecha_crea ?? '')
  }));
}
