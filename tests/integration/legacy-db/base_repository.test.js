require('../../../scripts/guard-local-db')();
const postgres = require('../../../scripts/postgres-test-client.cjs');
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

const BaseRepository = {
  insert: async (trx, table, data) => {
    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => data[k]);
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    await queryMock(sql, values);
  },
  update: async (trx, table, idColumn, idValue, data) => {
    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => data[k]).concat(idValue);
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = ?`;
    await queryMock(sql, values);
  },
  delete: async (trx, table, idColumn, idValue) => {
    const sql = `DELETE FROM ${table} WHERE ${idColumn} = ?`;
    await queryMock(sql, [idValue]);
  },
  findOne: async (trx, table, column, value) => {
    const sql = `SELECT * FROM ${table} WHERE ${column} = ? LIMIT 1`;
    const results = await queryMock(sql, [value]);
    return results && Array.isArray(results) && results.length > 0 ? results[0] : null;
  }
};

async function testBaseRepository() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: BaseRepository ---');
  const table = 'roles';
  const testData = {
    id_rol: 'TEST-BASE-' + Math.random().toString(36).substring(2, 7),
    nombre: 'ROL TEST BASE',
    descripcion: 'DESCRIPCION TEST BASE',
    fecha_crea: new Date(),
    estado: 1
  };

  try {
    console.log('1. Probando insert...');
    await BaseRepository.insert(null, table, testData);

    console.log('2. Probando findOne...');
    const found = await BaseRepository.findOne(null, table, 'id_rol', testData.id_rol);
    if (!found || found.nombre !== testData.nombre) {
      throw new Error('Error en findOne: Registro no encontrado o datos incorrectos');
    }
    console.log('   - Registro encontrado correctamente');

    console.log('3. Probando update...');
    const updateData = { nombre: 'ROL TEST BASE UPDATED' };
    await BaseRepository.update(null, table, 'id_rol', testData.id_rol, updateData);
    const updated = await BaseRepository.findOne(null, table, 'id_rol', testData.id_rol);
    if (!updated || updated.nombre !== updateData.nombre) {
      throw new Error('Error en update: Registro no actualizado correctamente');
    }
    console.log('   - Registro actualizado correctamente');

    console.log('4. Probando delete...');
    await BaseRepository.delete(null, table, 'id_rol', testData.id_rol);
    const deleted = await BaseRepository.findOne(null, table, 'id_rol', testData.id_rol);
    if (deleted) {
      throw new Error('Error en delete: El registro aún existe');
    }
    console.log('   - Registro eliminado correctamente');

    console.log('\nPRUEBAS UNITARIAS COMPLETADAS CON ÉXITO');
  } catch (error) {
    console.error('\nERROR EN LAS PRUEBAS:', error.message);
    await queryMock(`DELETE FROM ${table} WHERE id_rol = ?`, [testData.id_rol]).catch(() => {});
    process.exit(1);
  }
}

testBaseRepository();
