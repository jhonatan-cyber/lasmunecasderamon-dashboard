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

class ProductRepository {
  static async getAll() {
    return await queryMock('SELECT * FROM productos ORDER BY nombre ASC');
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM productos WHERE id_producto = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'productos', {
      id_producto: id,
      codigo: data.codigo || '',
      nombre: data.nombre,
      categoria_id: data.categoria_id,
      precio: data.precio || 0,
      comision: data.comision || 0,
      descripcion: data.descripcion || '',
      estado: 1,
      foto: data.foto || 'default.png',
      fecha_crea: new Date()
    });
    return id;
  }

  static async update(id, data) {
    await BaseRepository.update(null, 'productos', 'id_producto', id, {
      ...data,
      fecha_mod: new Date()
    });
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'productos', 'id_producto', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: ProductRepository ---');
  try {
    const cats = await queryMock('SELECT id_categoria FROM categorias LIMIT 1');
    const catId = cats[0]?.id_categoria;
    if (!catId) throw new Error('No hay categorías en la DB para probar ProductRepository');

    console.log('\n[1] Probando getAll()...');
    const listado = await ProductRepository.getAll();
    console.log(`Productos encontrados: ${listado.length}`);
    if (Array.isArray(listado)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/update/delete)...');
    const testName = 'Test Prod ' + Math.random().toString(36).substring(2, 7);
    const testId = await ProductRepository.create({
      nombre: testName,
      categoria_id: catId,
      precio: 10000,
      comision: 1000
    });
    console.log(`Producto creado: ${testId}`);

    const prod = await ProductRepository.getById(testId);
    if (prod && prod.nombre === testName) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar el producto creado');
    }

    await ProductRepository.update(testId, { nombre: testName + ' UPDATED' });
    const prodUpdated = await ProductRepository.getById(testId);
    if (prodUpdated && prodUpdated.nombre === testName + ' UPDATED') {
      console.log('✅ update() OK');
    } else {
      throw new Error('No se pudo actualizar el producto');
    }

    await ProductRepository.delete(testId);
    const prodDeleted = await ProductRepository.getById(testId);
    if (!prodDeleted) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('El producto no fue eliminado');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
