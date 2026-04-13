/* eslint-disable no-console */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function testFetchWithUUID() {
  let connection;
  try {
    console.log('--- Commission Details Fetch Test ---');
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected.');

    // 1. Get a user with commissions
    const [users] = await connection.execute(`
      SELECT DISTINCT u.id_usuario, u.nick 
      FROM usuarios u 
      JOIN detalle_comisiones dc ON u.id_usuario = dc.usuario_id 
      LIMIT 1
    `);

    if (users.length === 0) {
      console.log('No users with commissions found in the database. Test inconclusive.');
      return;
    }

    const testUser = users[0];
    console.log(`\nTesting with User: ${testUser.nick} (UUID: ${testUser.id_usuario})`);

    // 2. Replicate the SQL from CommissionRepository.getDetails
    const sql = `
      SELECT 
        c.id_comision AS id,
        c.fecha_crea AS fecha_hora,
        v.codigo AS codigo_venta,
        NULL AS codigo_servicio,
        'venta' AS tipo,
        c.monto AS monto,
        CASE 
          WHEN c.estado = 1 THEN 'Por pagar'
          WHEN c.estado = 2 THEN 'Pagado'
          ELSE 'Anulado'
        END AS estado,
        p.nombre AS producto,
        NULL AS fecha_pago,
        v.codigo AS descripcion
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
      LEFT JOIN ventas v ON c.venta_id = v.id_venta
      LEFT JOIN detalle_ventas dv ON (v.id_venta = dv.venta_id AND dc.usuario_id = dv.hostess_id AND (c.monto = dv.comision OR c.monto = (dv.comision * dv.cantidad)))
      LEFT JOIN productos p ON dv.producto_id = p.id_producto
      WHERE dc.usuario_id = ? AND c.venta_id IS NOT NULL AND c.venta_id <> '' AND c.venta_id <> '0'
      
      UNION ALL

      SELECT 
        c.id_comision AS id,
        c.fecha_crea AS fecha_hora,
        NULL AS codigo_venta,
        s.codigo AS codigo_servicio,
        'servicio' AS tipo,
        c.monto AS monto,
        CASE 
          WHEN c.estado = 1 THEN 'Por pagar'
          WHEN c.estado = 2 THEN 'Pagado'
          ELSE 'Anulado'
        END AS estado,
        'Servicio de Acompañante' AS producto,
        NULL AS fecha_pago,
        s.codigo AS descripcion
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
      LEFT JOIN servicios s ON c.servicio_id = s.id_servicio
      WHERE dc.usuario_id = ? AND c.servicio_id IS NOT NULL AND c.servicio_id <> '' AND c.servicio_id <> '0'
      
      ORDER BY fecha_hora DESC
    `;

    console.log('Executing getDetails query...');
    const [results] = await connection.execute(sql, [testUser.id_usuario, testUser.id_usuario]);

    console.log(`\nResults found: ${results.length}`);
    if (results.length > 0) {
      console.table(results);
      console.log('SUCCESS: Commission details fetched correctly using UUID.');
    } else {
      console.log('FAILURE: Query returned 0 results for a user who should have commissions.');
      process.exit(1);
    }

    // 3. Test with "NaN" to simulate the previous bug
    console.log('\n--- Simulating previous bug (using "NaN") ---');
    const [nanResults] = await connection.execute(sql, ['NaN', 'NaN']);
    console.log(`Results with "NaN": ${nanResults.length}`);
    if (nanResults.length === 0) {
      console.log(
        'SUCCESS: "NaN" correctly returns no results (prevents accidental data exposure or errors).'
      );
    }
  } catch (error) {
    console.error('\nERROR during test:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

testFetchWithUUID();
