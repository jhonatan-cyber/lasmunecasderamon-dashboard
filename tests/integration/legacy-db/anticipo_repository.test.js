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
  }
};

class AnticipoRepository {
  static async getAll() {
    return await queryMock('SELECT * FROM anticipos ORDER BY fecha_crea DESC');
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM anticipos WHERE id_anticipo = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'anticipos', {
      id_anticipo: id,
      usuario_id: data.usuario_id,
      monto: data.monto,
      motivo: data.motivo || '',
      estado: data.estado || 2,
      fecha_crea: new Date()
    });
    return id;
  }

  static async updateStatus(id, estado) {
    await BaseRepository.update(null, 'anticipos', 'id_anticipo', id, {
      estado,
      fecha_mod: new Date()
    });
  }

  static async hardDelete(id) {
    const connection = await postgres.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute('DELETE FROM anticipos WHERE id_anticipo = ?', [id]);
    } finally {
      await connection.end();
    }
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: AnticipoRepository ---');
  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;
    if (!userId) throw new Error('No hay usuarios en la DB para probar AnticipoRepository');

    console.log('\n[1] Probando getAll()...');
    const listado = await AnticipoRepository.getAll();
    console.log(`Anticipos encontrados: ${listado.length}`);
    if (Array.isArray(listado)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/updateStatus/hardDelete)...');
    const testId = await AnticipoRepository.create({
      usuario_id: userId,
      monto: 25000,
      motivo: 'Test Anticipo'
    });
    console.log(`Anticipo creado: ${testId}`);

    const anticipo = await AnticipoRepository.getById(testId);
    if (anticipo && Number(anticipo.monto) === 25000) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar el anticipo creado');
    }

    await AnticipoRepository.updateStatus(testId, 1);
    const anticipoAprobado = await AnticipoRepository.getById(testId);
    if (anticipoAprobado && anticipoAprobado.estado === 1) {
      console.log('✅ updateStatus() OK');
    } else {
      throw new Error('No se pudo actualizar el estado del anticipo');
    }

    await AnticipoRepository.hardDelete(testId);
    const anticipoEliminado = await AnticipoRepository.getById(testId);
    if (!anticipoEliminado) {
      console.log('✅ hardDelete() OK');
    } else {
      throw new Error('El anticipo no fue eliminado');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
