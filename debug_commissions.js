
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function checkCommissions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  try {
    console.log('--- Checking comisiones table ---');
    const [comisiones] = await connection.query('SELECT * FROM comisiones LIMIT 5');
    console.log('Sample comisiones:', JSON.stringify(comisiones, null, 2));

    console.log('\n--- Checking detalle_comisiones table ---');
    const [detalle] = await connection.query('SELECT * FROM detalle_comisiones LIMIT 5');
    console.log('Sample detalle_comisiones:', JSON.stringify(detalle, null, 2));

    if (detalle.length > 0) {
      const userId = detalle[0].usuario_id;
      console.log(`\n--- Testing getDetails for user ID: ${userId} ---`);
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
      const [results] = await connection.query(sql, [userId, userId]);
      console.log('Query results:', JSON.stringify(results, null, 2));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

checkCommissions();
