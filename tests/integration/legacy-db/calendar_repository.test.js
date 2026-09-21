/* eslint-disable no-console */
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

class CalendarRepository {
  static async getData(startDate, endDate, type) {
    if (type === 'servicios') {
      return await queryMock(
        `
        SELECT S.*, H.nombre AS habitacion
        FROM servicios S
        LEFT JOIN habitaciones H ON S.habitacion_id = H.id_habitacion
        WHERE S.fecha_crea >= ? AND S.fecha_crea <= ?
      `,
        [startDate + ' 00:00:00', endDate + ' 23:59:59']
      );
    } else {
      return await queryMock(
        `
        SELECT V.*, H.nombre AS habitacion
        FROM ventas V
        LEFT JOIN habitaciones H ON V.habitacion_id = H.id_habitacion
        WHERE V.fecha_crea >= ? AND V.fecha_crea <= ?
      `,
        [startDate + ' 00:00:00', endDate + ' 23:59:59']
      );
    }
  }
}

async function testCalendarRepository() {
  console.log('--- PRUEBAS UNITARIAS: CalendarRepository ---');

  try {
    const today = new Date().toISOString().split('T')[0];

    console.log('Probando getData() tipo servicios...');
    const svcData = await CalendarRepository.getData(today, today, 'servicios');
    if (!Array.isArray(svcData)) throw new Error('getData() servicios debe devolver un array');
    console.log(`✅ getData(servicios) OK. Recuperados ${svcData.length} registros.`);

    console.log('Probando getData() tipo ventas...');
    const salesData = await CalendarRepository.getData(today, today, 'ventas');
    if (!Array.isArray(salesData)) throw new Error('getData() ventas debe devolver un array');
    console.log(`✅ getData(ventas) OK. Recuperados ${salesData.length} registros.`);

    console.log('PRUEBAS UNITARIAS CalendarRepository COMPLETADAS CON ÉXITO');
  } catch (error) {
    console.error('ERROR EN PRUEBAS UNITARIAS:', error);
    process.exit(1);
  }
}

testCalendarRepository();
