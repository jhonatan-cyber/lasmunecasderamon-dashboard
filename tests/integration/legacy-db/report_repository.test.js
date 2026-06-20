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

const ReportRepository = {
  getSales: async (startDate, endDate) => {
    return await queryMock(
      `
          SELECT v.*, c.nombre as cliente_nombre, h.nombre as habitacion_nombre
          FROM ventas v
          LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
          LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
          WHERE DATE(v.fecha_crea) BETWEEN ? AND ?
          ORDER BY v.fecha_crea DESC
        `,
      [startDate, endDate]
    );
  },
  getCommissions: async (startDate, endDate, userId = null) => {
    let sql = `
          SELECT ds.comision, s.codigo, s.fecha_crea as date, u.nick, CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre
          FROM detalle_servicios ds
          INNER JOIN servicios s ON ds.servicio_id = s.id_servicio
          INNER JOIN usuarios u ON ds.usuario_id = u.id_usuario
          WHERE DATE(s.fecha_crea) BETWEEN ? AND ?
        `;
    const params = [startDate, endDate];
    if (userId) {
      sql += ' AND ds.usuario_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY s.fecha_crea DESC';
    return await queryMock(sql, params);
  },
  getCashRegister: async cajaId => {
    const [caja, sales, services] = await Promise.all([
      queryMock('SELECT * FROM cajas WHERE id_caja = ?', [cajaId]),
      queryMock('SELECT * FROM ventas WHERE caja_id = ? AND estado IN (1, 2)', [cajaId]),
      queryMock('SELECT * FROM servicios WHERE caja_id = ? AND estado IN (1, 2)', [cajaId])
    ]);
    return { caja: caja[0], sales, services };
  }
};

async function testReportRepository() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: ReportRepository ---');

  try {
    const today = new Date().toISOString().split('T')[0];

    
    console.log('1. Probando getSales...');
    const sales = await ReportRepository.getSales(today, today);
    console.log(`   - Ventas encontradas hoy: ${sales.length}`);
    if (!Array.isArray(sales)) throw new Error('getSales no retornó un array');

    
    console.log('2. Probando getCommissions...');
    const commissions = await ReportRepository.getCommissions(today, today);
    console.log(`   - Comisiones encontradas hoy: ${commissions.length}`);
    if (!Array.isArray(commissions)) throw new Error('getCommissions no retornó un array');

    
    console.log('3. Probando getCashRegister...');
    const activeCaja = await queryMock('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
    if (activeCaja.length > 0) {
      const report = await ReportRepository.getCashRegister(activeCaja[0].id_caja);
      console.log(`   - Reporte de caja obtenido: ${activeCaja[0].id_caja}`);
      if (!report.caja) throw new Error('No se obtuvo la info de la caja');
    } else {
      console.log('   - No hay cajas abiertas para probar getCashRegister, saltando...');
    }

    console.log('\nPRUEBAS UNITARIAS COMPLETADAS CON ÉXITO');
  } catch (error) {
    console.error('\nERROR EN LAS PRUEBAS:', error.message);
    process.exit(1);
  }
}

testReportRepository();
