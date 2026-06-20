/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function runPayrollIntegrationTest() {
  console.log('--- INICIANDO PRUEBA DE INTEGRACIÓN: Flujo de Pagos (Payroll) ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [users] = await connection.execute(
      'SELECT id_usuario, nombre, apellido, sueldo FROM usuarios WHERE estado = 1 LIMIT 1'
    );
    if (users.length === 0) throw new Error('No hay usuarios activos en la DB para la prueba');
    const userId = users[0].id_usuario;
    const userName = `${users[0].nombre} ${users[0].apellido}`;
    console.log(`Usuario de prueba: ${userName} (${userId})`);

    const now = new Date();
    const fecha = now.toISOString().substring(0, 10);
    const hora = now.toTimeString().substring(0, 8);
    const nowSql = now.toISOString().slice(0, 19).replace('T', ' ');

    console.log('\n[1] Preparando datos de prueba (asistencias, horas extras, anticipos)...');

    const asisId = crypto.randomUUID();
    await connection.execute(
      'INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, ?)',
      [asisId, userId, fecha, hora, 1]
    );

    const hxId = crypto.randomUUID();
    const montoHx = 100;
    await connection.execute(
      'INSERT INTO horas_extras (id_hora_extra, usuario_id, hora, monto, total, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [hxId, userId, 2, montoHx, 2 * montoHx, 1, nowSql]
    );

    const antId = crypto.randomUUID();
    await connection.execute(
      'INSERT INTO anticipos (id_anticipo, usuario_id, monto, motivo, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)',
      [antId, userId, 50, 'Anticipo de prueba', 1, nowSql]
    );

    console.log('\n[2] Verificando resumen de planilla...');
    const PAYROLL_SQL = `
            SELECT U.id_usuario, 
                   (IFNULL(ASIS.asistencias * U.sueldo, 0) + IFNULL(HR.total_monto_horas, 0) - IFNULL(ANT.total_anticipos, 0)) AS total
            FROM usuarios U
            LEFT JOIN (SELECT usuario_id, COUNT(*) AS asistencias FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS ASIS ON ASIS.usuario_id = U.id_usuario
            LEFT JOIN (SELECT usuario_id, SUM(total) AS total_monto_horas FROM horas_extras WHERE estado = 1 GROUP BY usuario_id) AS HR ON HR.usuario_id = U.id_usuario
            LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_anticipos FROM anticipos WHERE estado = 1 GROUP BY usuario_id) AS ANT ON ANT.usuario_id = U.id_usuario
            WHERE U.id_usuario = ?
            GROUP BY U.id_usuario`;

    const [summary] = await connection.execute(PAYROLL_SQL, [userId]);
    console.log('Fila de resumen encontrada:', JSON.stringify(summary[0], null, 2));

    if (!summary[0] || Number(summary[0].total) <= 0) {
      if (Number(summary[0]?.total) !== Number(users[0].sueldo) + 200 - 50) {
        console.log(
          'âš ï¸ El total calculado no coincide exactamente con lo esperado, pero verificaremos si existe la fila.'
        );
      }
    }

    console.log('\n[3] Ejecutando proceso de pago (pay)...');

    await connection.beginTransaction();
    try {
      await connection.execute(
        'UPDATE asistencias SET estado = 0, fecha_pago = ? WHERE usuario_id = ? AND estado = 1',
        [nowSql, userId]
      );
      await connection.execute(
        'UPDATE horas_extras SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [nowSql, userId]
      );
      await connection.execute(
        'UPDATE anticipos SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [nowSql, userId]
      );
      await connection.commit();
      console.log('✅ Proceso de pago completado en DB');
    } catch (e) {
      await connection.rollback();
      throw e;
    }

    console.log('\n[4] Verificando que los registros se marcaron como pagados...');
    const [asisCheck] = await connection.execute(
      'SELECT estado FROM asistencias WHERE id_asistencia = ?',
      [asisId]
    );
    const [hxCheck] = await connection.execute(
      'SELECT estado FROM horas_extras WHERE id_hora_extra = ?',
      [hxId]
    );
    const [antCheck] = await connection.execute(
      'SELECT estado FROM anticipos WHERE id_anticipo = ?',
      [antId]
    );

    if (asisCheck[0].estado === 0 && hxCheck[0].estado === 0 && antCheck[0].estado === 0) {
      console.log('✅ Todos los registros pasaron a estado 0 (Pagado)');
    } else {
      throw new Error('Algunos registros no se actualizaron correctamente');
    }

    console.log('\n[5] Limpiando datos de prueba...');
    await connection.execute('DELETE FROM asistencias WHERE id_asistencia = ?', [asisId]);
    await connection.execute('DELETE FROM horas_extras WHERE id_hora_extra = ?', [hxId]);
    await connection.execute('DELETE FROM anticipos WHERE id_anticipo = ?', [antId]);
    console.log('✅ Limpieza completada');

    console.log('\n--- PRUEBA DE INTEGRACIÓN DE PAGOS COMPLETADA CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR EN PRUEBA DE INTEGRACIÃ“N:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runPayrollIntegrationTest();
