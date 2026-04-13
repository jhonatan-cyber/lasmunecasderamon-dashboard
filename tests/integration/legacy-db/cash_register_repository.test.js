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
  }
};

class CashRegisterRepository {
  static async getAll() {
    return await queryMock('SELECT * FROM cajas ORDER BY fecha_apertura DESC');
  }

  static async getById(id) {
    const res = await queryMock('SELECT * FROM cajas WHERE id_caja = ?', [id]);
    return res[0] || null;
  }

  static async open(usuario_id, monto_apertura) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'cajas', {
      id_caja: id,
      fecha_apertura: new Date(),
      usuario_id_apertura: usuario_id,
      monto_apertura,
      estado: 1
    });
    return id;
  }

  static async close(id, usuario_id_cierre, monto_cierre) {
    await BaseRepository.update(null, 'cajas', 'id_caja', id, {
      usuario_id_cierre,
      fecha_cierre: new Date(),
      monto_cierre,
      estado: 0
    });
  }

  static async delete(id) {
    await BaseRepository.update(null, 'cajas', 'id_caja', id, { estado: -1 });
  }

  static async hardDelete(id) {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute('DELETE FROM cajas WHERE id_caja = ?', [id]);
    } finally {
      await connection.end();
    }
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: CashRegisterRepository ---');
  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;
    if (!userId) throw new Error('No hay usuarios en la DB para probar CashRegisterRepository');

    console.log('\n[1] Probando getAll()...');
    const listado = await CashRegisterRepository.getAll();
    console.log(`Cajas encontradas: ${listado.length}`);
    if (Array.isArray(listado)) console.log('✅ getAll() OK');

    console.log('\n[2] Probando ciclo de vida (open/getById/close/delete)...');
    const testCajaId = await CashRegisterRepository.open(userId, 50000);
    console.log(`Caja abierta: ${testCajaId}`);

    const caja = await CashRegisterRepository.getById(testCajaId);
    if (caja && Number(caja.monto_apertura) === 50000) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar la caja abierta');
    }

    await CashRegisterRepository.close(testCajaId, userId, 75000);
    const cajaCerrada = await CashRegisterRepository.getById(testCajaId);
    if (cajaCerrada && cajaCerrada.estado === 0) {
      console.log('✅ close() OK');
    } else {
      throw new Error('No se pudo cerrar la caja');
    }

    await CashRegisterRepository.delete(testCajaId);
    const cajaEliminada = await CashRegisterRepository.getById(testCajaId);
    if (cajaEliminada && cajaEliminada.estado === -1) {
      console.log('✅ delete() (soft delete) OK');
    } else {
      throw new Error('No se pudo marcar la caja como eliminada');
    }

    await CashRegisterRepository.hardDelete(testCajaId);
    console.log('✅ hardDelete() OK');

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
