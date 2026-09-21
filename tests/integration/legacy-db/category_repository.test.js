/* eslint-disable no-console */
require('../../../scripts/guard-local-db')();
const postgres = require('../../../scripts/postgres-test-client.cjs');
const crypto = require('crypto');
require('dotenv').config();

const queryMock = async (sql, params = []) => {
  const connection = await postgres.createConnection({
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
    const connection = await postgres.createConnection({
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
    const connection = await postgres.createConnection({
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
    const connection = await postgres.createConnection({
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

class CategoryRepository {
  static async getAll() {
    return await queryMock('SELECT * FROM categorias ORDER BY display_order ASC, nombre ASC');
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM categorias WHERE id_categoria = ?', [id]);
    return res[0] || null;
  }

  static async create(name, description) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'categorias', {
      id_categoria: id,
      nombre: name,
      descripcion: description || '',
      estado: 1,
      fecha_crea: new Date(),
      display_order: 0
    });
    return id;
  }

  static async update(id, data) {
    await BaseRepository.update(null, 'categorias', 'id_categoria', id, {
      ...data,
      fecha_mod: new Date()
    });
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'categorias', 'id_categoria', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: CategoryRepository ---');
  try {
    console.log('\n[1] Probando getAll()...');
    const listado = await CategoryRepository.getAll();
    console.log(`Categorías encontradas: ${listado.length}`);
    if (Array.isArray(listado)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/update/delete)...');
    const testName = 'Test Cat ' + Math.random().toString(36).substring(2, 7);
    const testId = await CategoryRepository.create(testName, 'Test Description');
    console.log(`Categoría creada: ${testId}`);

    const cat = await CategoryRepository.getById(testId);
    if (cat && cat.nombre === testName) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar la categoría creada');
    }

    await CategoryRepository.update(testId, { nombre: testName + ' UPDATED' });
    const catUpdated = await CategoryRepository.getById(testId);
    if (catUpdated && catUpdated.nombre === testName + ' UPDATED') {
      console.log('✅ update() OK');
    } else {
      throw new Error('No se pudo actualizar la categoría');
    }

    await CategoryRepository.delete(testId);
    const catDeleted = await CategoryRepository.getById(testId);
    if (!catDeleted) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('La categoría no fue eliminada');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
