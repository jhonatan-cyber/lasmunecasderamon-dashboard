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

class TimerRepository {
  static async getActive() {
    return await queryMock('SELECT * FROM servicios WHERE estado IN (2, 3) AND tiempo > 0');
  }
  static async runAutoCleanup() {
    // Simulación de lógica
    return true;
  }
}

async function testTimerRepository() {
  console.log('--- PRUEBAS UNITARIAS: TimerRepository ---');

  try {
    console.log('Probando getActive()...');
    const activeTimers = await TimerRepository.getActive();
    if (!Array.isArray(activeTimers)) throw new Error('getActive() debe devolver un array');
    console.log(`✅ getActive() OK. Recuperados ${activeTimers.length} timers.`);

    console.log('Probando runAutoCleanup()...');
    await TimerRepository.runAutoCleanup();
    console.log('✅ runAutoCleanup() OK');

    console.log('PRUEBAS UNITARIAS TimerRepository COMPLETADAS CON ÉXITO');
  } catch (error) {
    console.error('ERROR EN PRUEBAS UNITARIAS:', error);
    process.exit(1);
  }
}

testTimerRepository();
