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

class ServiceRepository {
  static async getAll(params) {
    return await queryMock('SELECT * FROM servicios ORDER BY fecha_crea DESC LIMIT 10');
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM servicios WHERE id_servicio = ?', [id]);
    return res[0] || null;
  }

  static async create(data) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'servicios', {
      id_servicio: id,
      codigo: id.slice(0, 8),
      sub_total: data.total || 0,
      cliente_id: data.cliente_id || null,
      habitacion_id: data.habitacion_id,
      precio_habitacion: data.precio_habitacion || 0,
      precio_servicio: data.precio_servicio || 0,
      total: data.total || 0,
      tiempo: data.tiempo || 0,
      metodo_pago: data.metodo_pago || 'efectivo',
      estado: 1,
      created_by: data.created_by,
      fecha_crea: new Date()
    });
    return id;
  }

  static async updateStatus(id, estado) {
    await BaseRepository.update(null, 'servicios', 'id_servicio', id, {
      estado,
      fecha_mod: new Date()
    });
  }

  static async delete(id) {
    const connection = await postgres.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute('DELETE FROM detalle_servicios WHERE servicio_id = ?', [id]);
      await connection.execute('DELETE FROM servicios WHERE id_servicio = ?', [id]);
    } finally {
      await connection.end();
    }
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: ServiceRepository ---');
  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;
    const rooms = await queryMock('SELECT id_habitacion FROM habitaciones LIMIT 1');
    const roomId = rooms[0]?.id_habitacion;

    if (!userId || !roomId)
      throw new Error('Faltan usuarios o habitaciones en la DB para probar ServiceRepository');

    console.log('\n[1] Probando getAll()...');
    const listado = await ServiceRepository.getAll();
    console.log(`Servicios encontrados: ${listado.length}`);
    if (Array.isArray(listado)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (create/getById/updateStatus/delete)...');
    const testId = await ServiceRepository.create({
      habitacion_id: roomId,
      precio_habitacion: 35000,
      precio_servicio: 50000,
      total: 85000,
      tiempo: 60,
      created_by: userId
    });
    console.log(`Servicio creado: ${testId}`);

    const service = await ServiceRepository.getById(testId);
    if (service && Number(service.total) === 85000) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar el servicio creado');
    }

    await ServiceRepository.updateStatus(testId, 0);
    const serviceAnulado = await ServiceRepository.getById(testId);
    if (serviceAnulado && serviceAnulado.estado === 0) {
      console.log('✅ updateStatus() OK');
    } else {
      throw new Error('No se pudo anular el servicio');
    }

    await ServiceRepository.delete(testId);
    const serviceDeleted = await ServiceRepository.getById(testId);
    if (!serviceDeleted) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('El servicio no fue eliminado');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
