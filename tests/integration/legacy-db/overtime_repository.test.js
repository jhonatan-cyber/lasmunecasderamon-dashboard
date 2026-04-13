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
  update: async (q, table, idCol, id, data) => {
    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    const values = keys.map(k => data[k]);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${idCol} = ?`;
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute(sql, [...values, id]);
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

class OvertimeRepository {
  static async getAll(userId) {
    let sql = 'SELECT * FROM horas_extras';
    let params = [];
    if (userId) {
      sql += ' WHERE usuario_id = ?';
      params.push(userId);
    }
    return await queryMock(sql, params);
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM horas_extras WHERE id_hora_extra = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'horas_extras', {
      id_hora_extra: id,
      usuario_id: data.usuario_id,
      hora: data.hora,
      monto: data.monto,
      total: data.hora * data.monto,
      fecha_crea: new Date(),
      estado: 1
    });
    return id;
  }

  static async update(id, data) {
    await BaseRepository.update(null, 'horas_extras', 'id_hora_extra', id, {
      ...data,
      fecha_mod: new Date()
    });
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'horas_extras', 'id_hora_extra', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: OvertimeRepository ---');
  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;
    if (!userId) throw new Error('No hay usuarios en la DB para probar OvertimeRepository');

    console.log('\n[1] Probando getAll()...');
    const listado = await OvertimeRepository.getAll();
    console.log(`Horas extras encontradas: ${listado.length}`);
    if (Array.isArray(listado)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/update/delete)...');
    const testId = await OvertimeRepository.create({
      usuario_id: userId,
      hora: 2,
      monto: 5000
    });
    console.log(`Hora extra creada: ${testId}`);

    const hx = await OvertimeRepository.getById(testId);
    if (hx && Number(hx.total) === 10000) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar la hora extra creada');
    }

    await OvertimeRepository.update(testId, { hora: 3, total: 15000 });
    const hxUpdated = await OvertimeRepository.getById(testId);
    if (hxUpdated && Number(hxUpdated.hora) === 3) {
      console.log('✅ update() OK');
    } else {
      throw new Error('No se pudo actualizar la hora extra');
    }

    await OvertimeRepository.delete(testId);
    const hxDeleted = await OvertimeRepository.getById(testId);
    if (!hxDeleted) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('La hora extra no fue eliminada');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
