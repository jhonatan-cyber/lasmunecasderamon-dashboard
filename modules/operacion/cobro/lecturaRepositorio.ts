import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { normalizeCuentaRow } from '@/modules/operacion/cuentas/historial';
import {
  buildFinancialSummary,
  type CuentaAnulacionRow
} from '@/modules/operacion/cuentas/resumen';
import type { CuentaGetByIdRow, DetalleCuentaRow, CuentaUsuarioRow } from '@/lib/database/rows';
export async function leerCuentaCobrada(id: string, contexto: ContextoOperacion) {
  const trx = resolverTransaccion(contexto);

  const cuentaRes = await trx<CuentaGetByIdRow[]>(
    `
        SELECT c.*,
               COALESCE(c.tiempo_actual, CASE WHEN c.estado = 1 THEN c.tiempo ELSE 0 END) as tiempo_activo,
               c.tiempo as tiempo_total,
               (CAST(cl.nombre AS text) || CAST(' ' AS text) || CAST(cl.apellido AS text)) as cliente_nombre, h.nombre as habitacion_numero,
               u.nick as nombre_cajero, u.foto as foto_cajero, uc.nick as nombre_cobrador, uc.foto as foto_cobrador
        FROM cuentas c
        LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
        LEFT JOIN usuarios u ON u.id_usuario = c.created_by
        LEFT JOIN usuarios uc ON uc.id_usuario = c.cobrado_por
        WHERE c.id_cuenta = ?
      `,
    [id]
  );

  if (cuentaRes.length === 0) return null;

  const detalles = await trx<DetalleCuentaRow[]>(
    `
        SELECT DC.*, H.nick as hostess_nick, H.foto as hostess_foto, U.nick as added_by, U.foto as added_by_foto,
               PR.nombre AS producto, C.nombre AS categoria
        FROM detalle_cuentas DC
        LEFT JOIN productos PR ON PR.id_producto = DC.producto_id
        LEFT JOIN categorias C ON C.id_categoria = PR.categoria_id
        LEFT JOIN usuarios H ON H.id_usuario = DC.hostess_id
        LEFT JOIN usuarios U ON U.id_usuario = DC.created_by
        WHERE DC.cuenta_id = ?
      `,
    [id]
  );

  const usuarios = await trx<CuentaUsuarioRow[]>(
    `
        SELECT cu.*, u.nick as usuario_nombre, u.foto as usuario_foto
        FROM cuentas_usuarios cu
        LEFT JOIN usuarios u ON u.id_usuario = cu.usuario_id
        WHERE cu.cuenta_id = ?
      `,
    [id]
  );

  const solicitudesAnulacion = await trx<CuentaAnulacionRow[]>(
    `
        SELECT sac.id,
               sac.monto,
               sac.motivo,
               sac.estado,
               sac.fecha_crea,
               sac.fecha_mod,
               req.nick as requested_by_nombre,
               app.nick as approved_by_nombre
        FROM solicitudes_anulacion_cuentas sac
        LEFT JOIN usuarios req ON req.id_usuario = sac.requested_by
        LEFT JOIN usuarios app ON app.id_usuario = sac.approved_by
        WHERE sac.cuenta_id = ?
        ORDER BY sac.fecha_crea DESC
      `,
    [id]
  );

  const cuentaNormalizada = normalizeCuentaRow({ ...cuentaRes[0], detalles, usuarios });
  if (!cuentaNormalizada) return null;

  return {
    ...cuentaNormalizada,
    solicitudes_anulacion: solicitudesAnulacion,
    resumen_financiero: buildFinancialSummary(cuentaNormalizada, solicitudesAnulacion)
  };
}
