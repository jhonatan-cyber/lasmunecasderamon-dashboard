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

const BaseRepository = {
  insert: async (q, table, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute(sql, values);
    } finally {
      await connection.end();
    }
  },
  delete: async (q, table, idCol, id) => {
    const sql = `DELETE FROM ${table} WHERE ${idCol} = ?`;
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute(sql, [id]);
    } finally {
      await connection.end();
    }
  }
};

class AttendanceRepository {
  static async getSummary() {
    return await queryMock('SELECT COUNT(*) as total FROM asistencias WHERE estado = 1');
  }

  static async getByUser(userId) {
    return await queryMock('SELECT * FROM asistencias WHERE usuario_id = ? AND estado = 1', [
      userId
    ]);
  }

  static async register(userId, fecha, hora) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'asistencias', {
      id_asistencia: id,
      usuario_id: userId,
      fecha: fecha || new Date().toISOString().substring(0, 10),
      hora: hora || new Date().toTimeString().substring(0, 8),
      estado: 1
    });
    return id;
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'asistencias', 'id_asistencia', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: AttendanceRepository ---');
  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;
    if (!userId) throw new Error('No hay usuarios en la DB para probar AttendanceRepository');

    console.log('\n[1] Probando getSummary()...');
    const summary = await AttendanceRepository.getSummary();
    console.log('Summary result:', summary);
    if (Array.isArray(summary)) console.log('✅ getSummary() OK');

    console.log('\n[2] Probando ciclo de vida (register/getByUser/delete)...');
    const testFecha = '2026-01-01';
    const testId = await AttendanceRepository.register(userId, testFecha, '20:00:00');
    console.log(`Asistencia registrada: ${testId}`);

    const list = await AttendanceRepository.getByUser(userId);
    console.log('List from getByUser:', JSON.stringify(list, null, 2));
    const found = list.find(a => a.id_asistencia === testId);
    if (
      found &&
      (found.fecha === testFecha || found.fecha?.toISOString()?.substring(0, 10) === testFecha)
    ) {
      console.log('✅ register() y getByUser() OK');
    } else {
      throw new Error('No se pudo recuperar la asistencia registrada');
    }

    await AttendanceRepository.delete(testId);
    const listAfterDelete = await AttendanceRepository.getByUser(userId);
    if (!listAfterDelete.find(a => a.id_asistencia === testId)) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('La asistencia no fue eliminada');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
