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

class ClientRepository {
  static async getAll() {
    return await queryMock('SELECT * FROM clientes ORDER BY nombre ASC');
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'clientes', {
      id_cliente: id,
      run: data.run || '',
      nombre: data.name,
      apellido: data.lastName,
      telefono: data.phone || '',
      fecha_crea: new Date(),
      estado: 1
    });
    return id;
  }

  static async update(id, data) {
    await BaseRepository.update(null, 'clientes', 'id_cliente', id, {
      nombre: data.name,
      apellido: data.lastName,
      telefono: data.phone,
      fecha_mod: new Date()
    });
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'clientes', 'id_cliente', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: ClientRepository ---');
  try {
    console.log('\n[1] Probando getAll()...');
    const listado = await ClientRepository.getAll();
    console.log(`Clientes encontrados: ${listado.length}`);
    if (Array.isArray(listado)) console.log('âœ… getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/update/delete)...');
    const testClientName = 'Test Client ' + Math.random().toString(36).substring(2, 7);

    const testClientId = await ClientRepository.create({
      name: testClientName,
      lastName: 'Integration',
      run: '12345678-9',
      phone: '+56900000000'
    });
    console.log(`Cliente creado: ${testClientId}`);

    const client = await ClientRepository.getById(testClientId);
    if (client && client.nombre === testClientName) {
      console.log('âœ… getById() OK');
    } else {
      throw new Error('No se pudo recuperar el cliente creado');
    }

    await ClientRepository.update(testClientId, { name: testClientName + ' Updated' });
    const clientUpdated = await ClientRepository.getById(testClientId);
    if (clientUpdated && clientUpdated.nombre === testClientName + ' Updated') {
      console.log('âœ… update() OK');
    } else {
      throw new Error('No se pudo actualizar el cliente');
    }

    await ClientRepository.delete(testClientId);
    const clientDeleted = await ClientRepository.getById(testClientId);
    if (!clientDeleted) {
      console.log('âœ… delete() OK');
    } else {
      throw new Error('El cliente no fue eliminado');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON Ã‰XITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
