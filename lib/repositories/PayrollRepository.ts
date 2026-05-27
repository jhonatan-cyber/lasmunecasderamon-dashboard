import { query, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

const PAYROLL_SQL = `
SELECT U.id_usuario, R.nombre AS rol, CONCAT(U.nombre, ' ', U.apellido) AS usuario, U.foto AS usuario_foto,
       IFNULL(ASIS.asistencias * U.sueldo, 0) AS sueldos, IFNULL(ASIS.asistencias * U.aporte, 0) AS aportes,
       IFNULL(VEN.total_venta, 0) AS ventas, IFNULL(SERV.total_servicios, 0) AS servicios,
       IFNULL(ANT.total_anticipos, 0) AS anticipos, IFNULL(PROP.total_propinas, 0) AS propinas,
       IFNULL(HR.total_monto_horas, 0) AS total_monto_horas, IFNULL(GRAT.total_gratificaciones, 0) AS gratificaciones,
       IFNULL(SEM.semanas * U.descuento, 0) AS descuentos,
       (IFNULL(ASIS.asistencias * U.sueldo, 0) + IFNULL(VEN.total_venta, 0) + IFNULL(SERV.total_servicios, 0) + IFNULL(PROP.total_propinas, 0) + IFNULL(HR.total_monto_horas, 0) + IFNULL(GRAT.total_gratificaciones, 0) - IFNULL(ANT.total_anticipos, 0) - IFNULL(ASIS.asistencias * U.aporte, 0) - IFNULL(SEM.semanas * U.descuento, 0)) AS total
FROM usuarios U
INNER JOIN roles R ON R.id_rol = U.rol_id
LEFT JOIN (SELECT usuario_id, COUNT(*) AS asistencias FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS ASIS ON ASIS.usuario_id = U.id_usuario
LEFT JOIN (SELECT DC.usuario_id, SUM(DC.comision) AS total_venta FROM detalle_comisiones DC INNER JOIN comisiones C ON C.id_comision = DC.comision_id WHERE C.venta_id <> 0 AND C.estado = 1 AND DC.estado = 1 GROUP BY DC.usuario_id) AS VEN ON VEN.usuario_id = U.id_usuario
LEFT JOIN (SELECT DC.usuario_id, SUM(DC.comision) AS total_servicios FROM detalle_comisiones DC INNER JOIN comisiones C ON C.id_comision = DC.comision_id WHERE C.servicio_id <> 0 AND C.estado = 1 AND DC.estado = 1 GROUP BY DC.usuario_id) AS SERV ON SERV.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_anticipos FROM anticipos WHERE estado IN (0, 1) GROUP BY usuario_id) AS ANT ON ANT.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_propinas FROM detalle_propinas WHERE estado = 1 GROUP BY usuario_id) AS PROP ON PROP.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(total) AS total_monto_horas FROM horas_extras WHERE estado = 1 GROUP BY usuario_id) AS HR ON HR.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_gratificaciones FROM gratificaciones WHERE estado = 1 GROUP BY usuario_id) AS GRAT ON GRAT.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, COUNT(DISTINCT YEARWEEK(fecha, 1)) AS semanas FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS SEM ON SEM.usuario_id = U.id_usuario
GROUP BY U.id_usuario, R.nombre, U.nombre, U.apellido, U.foto HAVING total > 0`;

export class PayrollRepository {
  static async getSummary() {
    return await query(PAYROLL_SQL, []);
  }

  static async pay(userId: string, entregadoPor?: string) {
    const now = getNowInBusinessTimezone();
    await withTransaction(async trx => {
      // Actualizar asistencias
      await trx(
        'UPDATE asistencias SET estado = 0, fecha_pago = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );

      // Actualizar detalle de comisiones (por usuario)
      await trx(
        'UPDATE detalle_comisiones SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );

      // Actualizar tabla principal de comisiones (solo si todos los detalles ya fueron pagados)
      await trx(
        `UPDATE comisiones c
         SET c.estado = 2, c.fecha_mod = ?
         WHERE c.estado = 1
           AND NOT EXISTS (
             SELECT 1 FROM detalle_comisiones dc 
             WHERE dc.comision_id = c.id_comision AND dc.estado = 1
           )`,
        [now]
      );

      // Actualizar detalle de propinas (por usuario)
      await trx(
        'UPDATE detalle_propinas SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );

      // Actualizar tabla principal de propinas (solo si todos los detalles ya fueron pagados)
      await trx(
        `UPDATE propinas p
         SET p.estado = 0, p.fecha_mod = ?
         WHERE p.estado = 1
           AND NOT EXISTS (
             SELECT 1 FROM detalle_propinas dp 
             WHERE dp.propina_id = p.id_propina AND dp.estado = 1
           )`,
        [now]
      );

      // Actualizar anticipos
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

      // Actualizar horas extras
      await trx(
        'UPDATE horas_extras SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );

      // Actualizar gratificaciones - ESTE ES EL QUE FALTABA
      await trx(
        'UPDATE gratificaciones SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );
    });
  }
}
