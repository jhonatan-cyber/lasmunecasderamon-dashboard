/* eslint-disable no-console */
const mysql = require('mysql2/promise');
require('dotenv').config();

const queryMock = async (sql, params = []) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  try {
    const [rows] = await connection.execute(sql.replace(/@/g, ''), params);
    return rows;
  } finally {
    await connection.end();
  }
};

const withTransactionMock = async callback => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  await connection.beginTransaction();
  try {
    const trx = async (sql, params = []) => {
      return await connection.execute(sql.replace(/@/g, ''), params);
    };
    const result = await callback(trx);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

const PAYROLL_SQL = `
SELECT U.id_usuario, R.nombre AS rol, CONCAT(U.nombre, ' ', U.apellido) AS usuario,
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
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_anticipos FROM anticipos WHERE estado = 1 GROUP BY usuario_id) AS ANT ON ANT.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_propinas FROM detalle_propinas WHERE estado = 1 GROUP BY usuario_id) AS PROP ON PROP.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(total) AS total_monto_horas FROM horas_extras WHERE estado = 1 GROUP BY usuario_id) AS HR ON HR.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_gratificaciones FROM gratificaciones WHERE estado = 1 GROUP BY usuario_id) AS GRAT ON GRAT.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, COUNT(DISTINCT YEARWEEK(fecha, 1)) AS semanas FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS SEM ON SEM.usuario_id = U.id_usuario
GROUP BY U.id_usuario HAVING total > 0`;

class PayrollRepository {
  static async getSummary() {
    return await queryMock(PAYROLL_SQL, []);
  }

  static async pay(userId) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await withTransactionMock(async trx => {
      await trx(
        'UPDATE asistencias SET estado = 0, fecha_pago = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );
      await trx(
        'UPDATE detalle_comisiones SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );
      await trx(
        'UPDATE ventas SET estado = 3, fecha_mod = ? WHERE estado = 1 AND id_venta IN (SELECT c.venta_id FROM comisiones c INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision WHERE dc.usuario_id = ? AND c.venta_id <> 0)',
        [now, userId]
      );
      await trx(
        'UPDATE servicios SET estado = 4, fecha_mod = ? WHERE estado = 1 AND id_servicio IN (SELECT ds.servicio_id FROM detalle_servicios ds WHERE ds.usuario_id = ?)',
        [now, userId]
      );
      await trx(
        'UPDATE detalle_propinas SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );
      await trx(
        'UPDATE propinas SET estado = 0, fecha_mod = ? WHERE estado = 1 AND id_propina IN (SELECT DISTINCT dp.propina_id FROM detalle_propinas dp WHERE dp.propina_id IN (SELECT DISTINCT propina_id FROM detalle_propinas WHERE usuario_id = ?) AND NOT EXISTS (SELECT 1 FROM detalle_propinas dp2 WHERE dp2.propina_id = dp.propina_id AND dp2.estado = 1))',
        [now, userId]
      );
      await trx(
        'UPDATE anticipos SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );
      await trx(
        'UPDATE horas_extras SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );
      await trx(
        'UPDATE gratificaciones SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, userId]
      );
    });
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: PayrollRepository ---');
  try {
    console.log('\n[1] Probando getSummary()...');
    const summary = await PayrollRepository.getSummary();
    console.log(`Summary rows count: ${summary.length}`);
    if (Array.isArray(summary)) console.log('✅ getSummary() OK');

    console.log('\n[2] Probando pay()...');
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;
    if (!userId) {
      console.log('âš ï¸ No hay usuarios en la DB para probar pay(). Saltando...');
    } else {
      await PayrollRepository.pay(userId);
      console.log(`✅ pay() ejecutado para usuario ${userId}`);
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
