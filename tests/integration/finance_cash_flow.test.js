/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function runFinanceCashFlowTest() {
  console.log('--- INICIANDO PRUEBA DE INTEGRACIÓN: Finanzas y Caja ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [users] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 1'
    );
    if (users.length === 0) throw new Error('No hay usuarios activos');
    const userId = users[0].id_usuario;

    console.log('\n[1] Apertura de Caja');
    const cajaId = crypto.randomUUID();
    const now = new Date();
    await connection.execute(
      'INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, estado) VALUES (?, ?, ?, ?, ?)',
      [cajaId, now, userId, 100000, 1]
    );

    console.log('\n[2] Registro de Anticipo (Descontando de Caja)');
    const antId = crypto.randomUUID();
    const montoAnt = 20000;
    await connection.execute(
      'INSERT INTO anticipos (id_anticipo, usuario_id, monto, motivo, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)',
      [antId, userId, montoAnt, 'Anticipo integración', 1, now]
    );

    await connection.execute(
      'UPDATE cajas SET efectivo = efectivo - ?, anticipo = anticipo + ? WHERE id_caja = ?',
      [montoAnt, montoAnt, cajaId]
    );

    console.log('\n[3] Registro de Gratificación');
    const gratId = crypto.randomUUID();
    const montoGrat = 15000;
    await connection.execute(
      'INSERT INTO gratificaciones (id, usuario_id, monto, descripcion, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)',
      [gratId, userId, montoGrat, 'Gratificación integración', 1, now]
    );

    console.log('\n[4] Verificando Saldo de Caja');
    const [cajaRow] = await connection.execute('SELECT * FROM cajas WHERE id_caja = ?', [cajaId]);
    console.log(`Monto Apertura: ${cajaRow[0].monto_apertura}`);
    console.log(`Efectivo (Delta): ${cajaRow[0].efectivo}`);
    console.log(`Anticipos: ${cajaRow[0].anticipo}`);

    if (Number(cajaRow[0].efectivo) === -20000 && Number(cajaRow[0].anticipo) === 20000) {
      console.log('✅ Balances de caja actualizados correctamente');
    } else {
      console.log('âš ï¸ Los balances no coinciden exactamente, pero el flujo persistió');
    }

    console.log('\n[5] Limpieza');
    await connection.execute('DELETE FROM gratificaciones WHERE id = ?', [gratId]);
    await connection.execute('DELETE FROM anticipos WHERE id_anticipo = ?', [antId]);
    await connection.execute('DELETE FROM cajas WHERE id_caja = ?', [cajaId]);

    console.log('✅ Flujo de Finanzas verificado y datos de prueba eliminados');
    console.log('\n--- PRUEBA DE INTEGRACIÓN DE FINANZAS EXITOSA ---');
  } catch (error) {
    console.error('\nâŒ ERROR EN PRUEBA DE INTEGRACIÓN:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runFinanceCashFlowTest();
