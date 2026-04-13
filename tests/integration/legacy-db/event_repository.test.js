/* eslint-disable no-console */
const mysql = require('mysql2/promise');
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

class EventRepository {
  static async getStats(userId) {
    const svcCountRes = await queryMock(
      'SELECT COUNT(*) as count FROM detalle_servicios WHERE usuario_id = ?',
      [userId]
    );
    const earningsRes = await queryMock(
      'SELECT SUM(comision) as total FROM detalle_comisiones WHERE usuario_id = ?',
      [userId]
    );
    return {
      svcCount: svcCountRes[0]?.count || 0,
      totalEarnings: Number(earningsRes[0]?.total || 0)
    };
  }

  static async getUserEvents(userId) {
    return await queryMock('SELECT * FROM anticipos WHERE usuario_id = ? LIMIT 10', [userId]);
  }
}

async function testEventRepository() {
  console.log('--- PRUEBAS UNITARIAS: EventRepository ---');

  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    if (users.length === 0) throw new Error('No hay usuarios para probar');
    const userId = users[0].id_usuario;

    console.log(`Probando getStats() para usuario ${userId}...`);
    const stats = await EventRepository.getStats(userId);
    if (!stats || typeof stats !== 'object') throw new Error('getStats() debe devolver un objeto');
    console.log('✅ getStats() OK');

    console.log(`Probando getUserEvents() para usuario ${userId}...`);
    const events = await EventRepository.getUserEvents(userId);
    if (!Array.isArray(events)) throw new Error('getUserEvents() debe devolver un array');
    console.log(`✅ getUserEvents() OK. Recuperados ${events.length} eventos.`);

    console.log('PRUEBAS UNITARIAS EventRepository COMPLETADAS CON ÉXITO');
  } catch (error) {
    console.error('ERROR EN PRUEBAS UNITARIAS:', error);
    process.exit(1);
  }
}

testEventRepository();
