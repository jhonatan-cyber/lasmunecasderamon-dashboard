import { query } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';

const PAYROLL_SQL = `
SELECT * FROM (SELECT U.id_usuario, R.nombre AS rol, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS usuario, U.foto AS usuario_foto,
       COALESCE(ASIS.asistencias * U.sueldo, 0) AS sueldos, COALESCE(ASIS.asistencias * U.aporte, 0) AS aportes,
       COALESCE(VEN.total_venta, 0) AS ventas, COALESCE(SERV.total_servicios, 0) AS servicios,
       COALESCE(ANT.total_anticipos, 0) AS anticipos, COALESCE(PROP.total_propinas, 0) AS propinas,
       COALESCE(HR.total_monto_horas, 0) AS total_monto_horas, COALESCE(GRAT.total_gratificaciones, 0) AS gratificaciones,
       COALESCE(SEM.semanas * U.descuento, 0) AS descuentos,
       (COALESCE(ASIS.asistencias * U.sueldo, 0) + COALESCE(VEN.total_venta, 0) + COALESCE(SERV.total_servicios, 0) + COALESCE(PROP.total_propinas, 0) + COALESCE(HR.total_monto_horas, 0) + COALESCE(GRAT.total_gratificaciones, 0) - COALESCE(ANT.total_anticipos, 0) - COALESCE(ASIS.asistencias * U.aporte, 0) - COALESCE(SEM.semanas * U.descuento, 0)) AS total
FROM usuarios U
INNER JOIN roles R ON R.id_rol = U.rol_id
LEFT JOIN (SELECT usuario_id, COUNT(*) AS asistencias FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS ASIS ON ASIS.usuario_id = U.id_usuario
LEFT JOIN (SELECT DC.usuario_id, SUM(DC.comision) AS total_venta FROM detalle_comisiones DC INNER JOIN comisiones C ON C.id_comision = DC.comision_id WHERE C.venta_id IS NOT NULL AND C.estado = 1 AND DC.estado = 1 GROUP BY DC.usuario_id) AS VEN ON VEN.usuario_id = U.id_usuario
LEFT JOIN (SELECT DC.usuario_id, SUM(DC.comision) AS total_servicios FROM detalle_comisiones DC INNER JOIN comisiones C ON C.id_comision = DC.comision_id WHERE C.servicio_id IS NOT NULL AND C.estado = 1 AND DC.estado = 1 GROUP BY DC.usuario_id) AS SERV ON SERV.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_anticipos FROM anticipos WHERE estado IN (0, 1) GROUP BY usuario_id) AS ANT ON ANT.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_propinas FROM detalle_propinas WHERE estado = 1 GROUP BY usuario_id) AS PROP ON PROP.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(total) AS total_monto_horas FROM horas_extras WHERE estado = 1 GROUP BY usuario_id) AS HR ON HR.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_gratificaciones FROM gratificaciones WHERE estado = 1 GROUP BY usuario_id) AS GRAT ON GRAT.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, COUNT(DISTINCT TO_CHAR(fecha, 'IYYY-IW')) AS semanas FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS SEM ON SEM.usuario_id = U.id_usuario
) payroll WHERE total > 0`;

export class PayrollRepository {
  static async getSummary() {
    return await query(PAYROLL_SQL, []);
  }

  static async pay(
    userId: string,
    entregadoPor: string | undefined,
    now: string,
    contexto: ContextoOperacion
  ) {
    const trx = resolverTransaccion(contexto);

    await trx(
      'UPDATE detalle_comisiones SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
      [now, userId]
    );

    await trx(
      `UPDATE comisiones c
         SET estado = 2, fecha_mod = ?
         WHERE c.estado = 1
           AND NOT EXISTS (
             SELECT 1 FROM detalle_comisiones dc
             WHERE dc.comision_id = c.id_comision AND dc.estado = 1
           )`,
      [now]
    );

    await trx(
      'UPDATE detalle_propinas SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
      [now, userId]
    );

    await trx(
      `UPDATE propinas p
         SET estado = 0, fecha_mod = ?
         WHERE p.estado = 1
           AND NOT EXISTS (
             SELECT 1 FROM detalle_propinas dp
             WHERE dp.propina_id = p.id_propina AND dp.estado = 1
           )`,
      [now]
    );

    if (entregadoPor) {
      await trx(
        'UPDATE anticipos SET estado = 4, fecha_cobro = ?, fecha_mod = ?, entregado_por = ? WHERE usuario_id = ? AND estado = 1',
        [now, now, String(entregadoPor), userId]
      );
    } else {
      await trx(
        'UPDATE anticipos SET estado = 4, fecha_cobro = ?, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, now, userId]
      );
    }

    await trx(
      'UPDATE horas_extras SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
      [now, userId]
    );

    await trx(
      'UPDATE gratificaciones SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
      [now, userId]
    );
  }
}
