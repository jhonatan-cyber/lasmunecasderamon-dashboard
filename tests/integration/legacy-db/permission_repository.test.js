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
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
};

const generateUUID = () => crypto.randomUUID();

class PermissionRepository {
  static async getAll() {
    return await queryMock(
      'SELECT * FROM permissions WHERE deleted_at IS NULL ORDER BY module, action'
    );
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM permissions WHERE id = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = generateUUID();
    await queryMock(
      'INSERT INTO permissions (id, name, description, module, action) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, data.description || '', data.module, data.action]
    );
    return id;
  }

  static async delete(id) {
    await queryMock('UPDATE permissions SET deleted_at = ? WHERE id = ?', [new Date(), id]);
  }

  // FunciÃ³n auxiliar para limpieza real en tests
  static async hardDelete(id) {
    await queryMock('DELETE FROM permissions WHERE id = ?', [id]);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: PermissionRepository ---');
  try {
    console.log('\n[1] Probando getAll()...');
    const listado = await PermissionRepository.getAll();
    console.log(`Permisos encontrados: ${listado.length}`);
    if (Array.isArray(listado)) console.log('âœ… getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/delete)...');
    const testName = 'Test Permission ' + Math.random().toString(36).substring(2, 7);

    const testId = await PermissionRepository.create({
      name: testName,
      description: 'Test Description',
      module: 'test',
      action: 'read'
    });
    console.log(`Permiso creado: ${testId}`);

    const perm = await PermissionRepository.getById(testId);
    if (perm && perm.name === testName) {
      console.log('âœ… getById() OK');
    } else {
      throw new Error('No se pudo recuperar el permiso creado');
    }

    await PermissionRepository.delete(testId);
    const permDeleted = await PermissionRepository.getById(testId);
    if (permDeleted && permDeleted.deleted_at !== null) {
      console.log('âœ… delete() (soft delete) OK');
    } else {
      throw new Error('El permiso no fue marcado como eliminado');
    }

    await PermissionRepository.hardDelete(testId);
    const permHardDeleted = await PermissionRepository.getById(testId);
    if (!permHardDeleted) {
      console.log('âœ… hardDelete() OK');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON Ã‰XITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
