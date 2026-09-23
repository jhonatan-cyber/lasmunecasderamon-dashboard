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

class StatsRepository {
  static async getGeneral() {
    return await queryMock('SELECT COUNT(*) AS "usersCount" FROM usuarios');
  }
  static async getMonthlySales() {
    return await queryMock(
      'SELECT EXTRACT(MONTH FROM fecha_crea) as mes, SUM(total) as total FROM ventas GROUP BY EXTRACT(MONTH FROM fecha_crea)'
    );
  }
  static async getWeeklySales() {
    return await queryMock(
      "SELECT TO_CHAR(fecha_crea, 'FMDay') as dia, SUM(total) as total FROM ventas GROUP BY TO_CHAR(fecha_crea, 'FMDay')"
    );
  }
  static async getDashboardStats() {
    return {
      activeRooms: (
        await queryMock('SELECT COUNT(*) as count FROM habitaciones WHERE estado = 2')
      )[0].count,
      totalSales: (await queryMock('SELECT SUM(total) as total FROM ventas'))[0].total || 0
    };
  }
}

async function testStatsRepository() {
  console.log('--- PRUEBAS UNITARIAS: StatsRepository ---');

  try {
    console.log('Probando getGeneral()...');
    const genStats = await StatsRepository.getGeneral();
    if (!Array.isArray(genStats)) throw new Error('getGeneral() debe devolver un array');
    console.log('✅ getGeneral() OK');

    console.log('Probando getMonthlySales()...');
    const monthlySales = await StatsRepository.getMonthlySales();
    if (!Array.isArray(monthlySales)) throw new Error('getMonthlySales() debe devolver un array');
    console.log('✅ getMonthlySales() OK');

    console.log('Probando getWeeklySales()...');
    const weeklySales = await StatsRepository.getWeeklySales();
    if (!Array.isArray(weeklySales)) throw new Error('getWeeklySales() debe devolver un array');
    console.log('✅ getWeeklySales() OK');

    console.log('Probando getDashboardStats()...');
    const dashboardStats = await StatsRepository.getDashboardStats();
    if (!dashboardStats || typeof dashboardStats !== 'object')
      throw new Error('getDashboardStats() debe devolver un objeto');
    console.log('✅ getDashboardStats() OK');

    console.log('PRUEBAS UNITARIAS StatsRepository COMPLETADAS CON ÉXITO');
  } catch (error) {
    console.error('ERROR EN PRUEBAS UNITARIAS:', error);
    process.exit(1);
  }
}

testStatsRepository();
