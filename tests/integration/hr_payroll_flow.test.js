/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function runHRIntegrationTest() {
  console.log('--- INICIANDO PRUEBA DE INTEGRACIÓN: Flujo RRHH y Planillas ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 1. Obtener un usuario de prueba (usaremos uno existente para no romper integridad de roles)
    const [users] = await connection.execute(
      'SELECT id_usuario, sueldo FROM usuarios WHERE estado = 1 LIMIT 1'
    );
    if (users.length === 0) throw new Error('No hay usuarios activos en la DB');
    const userId = users[0].id_usuario;
    const sueldo = Number(users[0].sueldo || 0);

    const now = new Date();
    const fecha = now.toISOString().substring(0, 10);
    const hora = now.toTimeString().substring(0, 8);

    console.log(`\n[1] Registrando Asistencia para el usuario: ${userId}`);
    const asisId = crypto.randomUUID();
    await connection.execute(
      'INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, ?)',
      [asisId, userId, fecha, hora, 1]
    );

    console.log(`\n[2] Registrando Hora Extra`);
    const hxId = crypto.randomUUID();
    const montoHx = 5000;
    await connection.execute(
      'INSERT INTO horas_extras (id_hora_extra, usuario_id, hora, monto, total, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [hxId, userId, 2, montoHx, 2 * montoHx, 1, now]
    );

    console.log(`\n[3] Verificando Summary de Planilla (Simulado)`);
    // Simular cálculo de planilla
    const [payroll] = await connection.execute(
      `
            SELECT 
                (SELECT COUNT(*) FROM asistencias WHERE usuario_id = ? AND estado = 1) as asistencias,
                (SELECT SUM(total) FROM horas_extras WHERE usuario_id = ? AND estado = 1) as total_hx
            FROM usuarios WHERE id_usuario = ?
        `,
      [userId, userId, userId]
    );

    console.log(`Asistencias detectadas: ${payroll[0].asistencias}`);
    console.log(`Monto Horas Extras: ${payroll[0].total_hx}`);

    if (Number(payroll[0].asistencias) >= 1 && Number(payroll[0].total_hx) >= 10000) {
      console.log('✅ Cálculo de planilla correcto');
    } else {
      throw new Error('Fallo en el resumen de planilla');
    }

    console.log(`\n[4] Procesando Pago (Limpieza lógica)`);
    // En un flujo real esto marcaría los registros como estado 0 y pondría fecha de pago
    // Aquí los eliminaremos para dejar la DB limpia
    await connection.execute('DELETE FROM asistencias WHERE id_asistencia = ?', [asisId]);
    await connection.execute('DELETE FROM horas_extras WHERE id_hora_extra = ?', [hxId]);

    console.log('✅ Flujo de RRHH verificado y datos de prueba eliminados');
    console.log('\n--- PRUEBA DE INTEGRACIÓN DE RRHH EXITOSA ---');
  } catch (error) {
    console.error('\nâŒ ERROR EN PRUEBA DE INTEGRACIÃ“N:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runHRIntegrationTest();
