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

class RoomRepository {
  static async getAll() {
    return await queryMock('SELECT * FROM habitaciones ORDER BY display_order ASC, nombre ASC');
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM habitaciones WHERE id_habitacion = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'habitaciones', {
      id_habitacion: id,
      nombre: data.nombre,
      precio: data.precio || 0,
      tiempo: data.tiempo || 0,
      comision_anfitriona: data.comision_anfitriona || 0,
      estado: 1,
      fecha_crea: new Date(),
      display_order: 0
    });
    return id;
  }

  static async update(id, data) {
    await BaseRepository.update(null, 'habitaciones', 'id_habitacion', id, {
      ...data,
      fecha_mod: new Date()
    });
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'habitaciones', 'id_habitacion', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: RoomRepository ---');
  try {
    console.log('\n[1] Probando getAll()...');
    const listado = await RoomRepository.getAll();
    console.log(`Habitaciones encontradas: ${listado.length}`);
    if (Array.isArray(listado)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/update/delete)...');
    const testName = 'Room ' + Math.random().toString(36).substring(2, 7);
    const testId = await RoomRepository.create({
      nombre: testName,
      precio: 35000,
      tiempo: 60,
      comision_anfitriona: 5000
    });
    console.log(`Habitación creada: ${testId}`);

    const room = await RoomRepository.getById(testId);
    if (room && room.nombre === testName) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar la habitación creada');
    }

    await RoomRepository.update(testId, { nombre: testName + ' UPDATED' });
    const roomUpdated = await RoomRepository.getById(testId);
    if (roomUpdated && roomUpdated.nombre === testName + ' UPDATED') {
      console.log('✅ update() OK');
    } else {
      throw new Error('No se pudo actualizar la habitación');
    }

    await RoomRepository.delete(testId);
    const roomDeleted = await RoomRepository.getById(testId);
    if (!roomDeleted) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('La habitación no fue eliminada');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
