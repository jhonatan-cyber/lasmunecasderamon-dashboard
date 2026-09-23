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

class RoleRepository {
  static async getAll() {
    return await queryMock('SELECT * FROM roles ORDER BY nombre ASC');
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM roles WHERE id_rol = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'roles', {
      id_rol: id,
      nombre: data.nombre,
      descripcion: data.descripcion || '',
      fecha_crea: new Date()
    });
    return id;
  }

  static async update(id, data) {
    await BaseRepository.update(null, 'roles', 'id_rol', id, {
      ...data,
      fecha_mod: new Date()
    });
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'roles', 'id_rol', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: RoleRepository ---');
  try {
    console.log('\n[1] Probando getAll()...');
    const listado = await RoleRepository.getAll();
    console.log(`Roles encontrados: ${listado.length}`);
    if (Array.isArray(listado)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/update/delete)...');
    const testRoleName = 'TEST_ROLE_' + Math.random().toString(36).substring(2, 7);

    const testRoleId = await RoleRepository.create({
      nombre: testRoleName,
      descripcion: 'Test Description'
    });
    console.log(`Rol creado: ${testRoleId}`);

    const role = await RoleRepository.getById(testRoleId);
    if (role && role.nombre === testRoleName) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar el rol creado');
    }

    await RoleRepository.update(testRoleId, { nombre: testRoleName + '_UPDATED' });
    const roleUpdated = await RoleRepository.getById(testRoleId);
    if (roleUpdated && roleUpdated.nombre === testRoleName + '_UPDATED') {
      console.log('✅ update() OK');
    } else {
      throw new Error('No se pudo actualizar el rol');
    }

    await RoleRepository.delete(testRoleId);
    const roleDeleted = await RoleRepository.getById(testRoleId);
    if (!roleDeleted) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('El rol no fue eliminado');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
