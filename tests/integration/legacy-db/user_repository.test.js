/* eslint-disable no-console */
require('../../../scripts/guard-local-db')();
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

class UserRepository {
  static async getAll(params) {
    let where = 'WHERE 1=1';
    let sqlParams = [];
    if (params?.status !== undefined) {
      where += ' AND u.estado = ?';
      sqlParams.push(params.status === 'active' ? 1 : 0);
    }
    const sql = `
            SELECT u.*, r.nombre as rol_nombre 
            FROM usuarios u 
            LEFT JOIN roles r ON u.rol_id = r.id_rol
            ${where}
            LIMIT ? OFFSET ?
        `;
    const data = await queryMock(sql, [...sqlParams, parseInt(params?.limit || '10'), 0]);
    return { data, total: data.length };
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM usuarios WHERE id_usuario = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = data.id_usuario || generateUUID();
    await BaseRepository.insert(null, 'usuarios', {
      ...data,
      id_usuario: id,
      fecha_crea: new Date()
    });
    return id;
  }

  static async update(id, data) {
    await BaseRepository.update(null, 'usuarios', 'id_usuario', id, {
      ...data,
      fecha_mod: new Date()
    });
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'usuarios', 'id_usuario', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: UserRepository ---');
  try {
    const roles = await queryMock('SELECT id_rol FROM roles LIMIT 1');
    const roleId = roles[0]?.id_rol;
    if (!roleId) throw new Error('No hay roles en la DB para probar UserRepository');

    console.log('\n[1] Probando getAll()...');
    const listado = await UserRepository.getAll({ limit: 5 });
    console.log(`Usuarios encontrados: ${listado.data.length}`);
    if (Array.isArray(listado.data)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/update/delete)...');
    const testUserId = generateUUID();
    const testNick = 'testuser_' + Math.random().toString(36).substring(2, 7);

    await UserRepository.create({
      id_usuario: testUserId,
      nick: testNick,
      nombre: 'Test',
      apellido: 'User',
      rol_id: roleId,
      estado: 1
    });
    console.log(`Usuario creado: ${testUserId}`);

    const user = await UserRepository.getById(testUserId);
    if (user && user.nick === testNick) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar el usuario creado');
    }

    await UserRepository.update(testUserId, { nombre: 'Updated' });
    const userUpdated = await UserRepository.getById(testUserId);
    if (userUpdated && userUpdated.nombre === 'Updated') {
      console.log('✅ update() OK');
    } else {
      throw new Error('No se pudo actualizar el usuario');
    }

    await UserRepository.delete(testUserId);
    const userDeleted = await UserRepository.getById(testUserId);
    if (!userDeleted) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('El usuario no fue eliminado');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
