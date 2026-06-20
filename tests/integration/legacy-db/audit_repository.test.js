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

class AuditRepository {
  static async log(data) {
    const id = generateUUID();
    const now = new Date();
    const sql = `
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      data.user_id || null,
      data.action,
      data.resource_type || null,
      data.resource_id || null,
      data.details ? JSON.stringify(data.details) : null,
      data.ip_address || null,
      now
    ];

    await queryMock(sql, params);
    return id;
  }

  static async getLatest(limit = 100) {
    return await queryMock(
      `
      SELECT a.*, u.nick as usuario_nick, u.nombre as usuario_nombre
      FROM audit_logs a
      LEFT JOIN usuarios u ON a.user_id COLLATE utf8mb4_unicode_ci = u.id_usuario
      ORDER BY a.created_at DESC
      LIMIT ?
    `,
      [limit]
    );
  }

  static async delete(id) {
    await queryMock('DELETE FROM audit_logs WHERE id = ?', [id]);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: AuditRepository ---');
  const logsCreated = [];
  try {
    
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;

    console.log('\n[1] Probando log()...');
    const testAction = 'TEST_ACTION_' + Math.random().toString(36).substring(2, 7);
    const testDetails = { key: 'value', random: Math.random() };

    const logId = await AuditRepository.log({
      user_id: userId,
      action: testAction,
      resource_type: 'test_resource',
      resource_id: '123',
      details: testDetails,
      ip_address: '127.0.0.1'
    });
    logsCreated.push(logId);
    console.log(`Log creado con ID: ${logId}`);
    if (logId) console.log('✅ log() OK');

    console.log('\n[2] Probando getLatest()...');
    const latestLogs = await AuditRepository.getLatest(10);
    const myLog = latestLogs.find(l => l.id === logId);

    if (myLog && myLog.action === testAction) {
      console.log('✅ getLatest() encontró el log creado');
      
      const detailsRecuperados =
        typeof myLog.details === 'string' ? JSON.parse(myLog.details) : myLog.details;
      if (detailsRecuperados.key === 'value') {
        console.log('✅ Detalles JSON verificados');
      } else {
        throw new Error('Los detalles del log no coinciden');
      }
    } else {
      throw new Error('No se pudo recuperar el log de auditoría recién creado');
    }

    console.log('\n--- LIMPIANDO DATOS DE PRUEBA ---');
    for (const id of logsCreated) {
      await AuditRepository.delete(id);
    }
    console.log('✅ Limpieza completada');

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR EN PRUEBAS:', error);
    
    for (const id of logsCreated) {
      try {
        await AuditRepository.delete(id);
      } catch (e) {}
    }
    process.exit(1);
  }
}

runTests();
