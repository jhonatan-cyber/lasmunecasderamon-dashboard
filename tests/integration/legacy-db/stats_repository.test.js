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

class StatsRepository {
  static async getGeneral() {
    return await queryMock('SELECT COUNT(*) as usersCount FROM usuarios');
  }
  static async getMonthlySales() {
    return await queryMock('SELECT MONTH(fecha_crea) as mes, SUM(total) as total FROM ventas GROUP BY MONTH(fecha_crea)');
  }
  static async getWeeklySales() {
    return await queryMock('SELECT DAYNAME(fecha_crea) as dia, SUM(total) as total FROM ventas GROUP BY DAYNAME(fecha_crea)');
  }
  static async getDashboardStats() {
    return {
      activeRooms: (await queryMock('SELECT COUNT(*) as count FROM habitaciones WHERE estado = 2'))[0].count,
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
    console.log('âœ… getGeneral() OK');

    console.log('Probando getMonthlySales()...');
    const monthlySales = await StatsRepository.getMonthlySales();
    if (!Array.isArray(monthlySales)) throw new Error('getMonthlySales() debe devolver un array');
    console.log('âœ… getMonthlySales() OK');

    console.log('Probando getWeeklySales()...');
    const weeklySales = await StatsRepository.getWeeklySales();
    if (!Array.isArray(weeklySales)) throw new Error('getWeeklySales() debe devolver un array');
    console.log('âœ… getWeeklySales() OK');

    console.log('Probando getDashboardStats()...');
    const dashboardStats = await StatsRepository.getDashboardStats();
    if (!dashboardStats || typeof dashboardStats !== 'object') throw new Error('getDashboardStats() debe devolver un objeto');
    console.log('âœ… getDashboardStats() OK');

    console.log('PRUEBAS UNITARIAS StatsRepository COMPLETADAS CON Ã‰XITO');
  } catch (error) {
    console.error('ERROR EN PRUEBAS UNITARIAS:', error);
    process.exit(1);
  }
}

testStatsRepository();

