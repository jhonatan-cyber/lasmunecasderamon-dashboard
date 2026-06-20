/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
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

const generateUUID = () => crypto.randomUUID();

class WithdrawalRepository {
  static async getByCajaId(caja_id) {
    const results = await queryMock(
      `
      SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre
      FROM retiros_caja r
      LEFT JOIN usuarios u ON r.usuario_id = u.id_usuario
      WHERE r.caja_id = ?
      ORDER BY r.fecha_retiro DESC
    `,
      [caja_id]
    );

    return results.map(row => ({
      id_retiro: row.id_retiro,
      caja_id: row.caja_id,
      monto: Number(row.monto),
      motivo: row.motivo,
      usuario_id: row.usuario_id,
      fecha_retiro: row.fecha_retiro,
      usuario_nombre: row.usuario_nombre
    }));
  }

  static async create(data) {
    const id = generateUUID();
    await queryMock(
      `
      INSERT INTO retiros_caja (id_retiro, caja_id, monto, motivo, usuario_id, fecha_retiro)
      VALUES (?, ?, ?, ?, ?, NOW())
    `,
      [id, data.caja_id, data.monto, data.motivo, data.usuario_id]
    );
    return id;
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: WithdrawalRepository ---');
  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;
    const cajas = await queryMock('SELECT id_caja FROM cajas LIMIT 1');
    const cajaId = cajas[0]?.id_caja;

    if (!userId || !cajaId)
      throw new Error('Se requiere un usuario y una caja en la DB para las pruebas');

    console.log('\n[1] Probando create()...');
    const testData = {
      caja_id: cajaId,
      monto: 15000,
      motivo: 'Pago a proveedor test',
      usuario_id: userId
    };
    const withdrawalId = await WithdrawalRepository.create(testData);
    console.log(`Retiro creado con ID: ${withdrawalId}`);

    console.log('\n[2] Probando getByCajaId()...');
    const withdrawals = await WithdrawalRepository.getByCajaId(cajaId);
    const found = withdrawals.find(w => w.id_retiro === withdrawalId);
    if (found && Number(found.monto) === 15000) {
      console.log('✅ create() y getByCajaId() OK');
    } else {
      throw new Error('No se pudo encontrar el retiro recién creado');
    }

    
    console.log('\n[3] Limpiando datos de prueba...');
    await queryMock('DELETE FROM retiros_caja WHERE id_retiro = ?', [withdrawalId]);
    console.log('✅ Cleanup OK');

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
