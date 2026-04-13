/* eslint-disable no-console */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno si existe .env
dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function testCommissionDetails() {
  let connection;
  try {
    console.log('Conectando a la base de datos...', {
      host: config.host,
      database: config.database
    });
    connection = await mysql.createConnection(config);
    console.log('Conexión establecida.');

    // 1. Buscar un usuario que tenga comisiones
    const [usuarios] = await connection.execute(`
      SELECT DISTINCT u.id_usuario, u.nick 
      FROM usuarios u 
      JOIN detalle_comisiones dc ON u.id_usuario = dc.usuario_id 
      LIMIT 1
    `);

    if (usuarios.length === 0) {
      console.log('No se encontraron usuarios con comisiones para probar.');
      return;
    }

    const usuarioId = usuarios[0].id_usuario;
    const nick = usuarios[0].nick;
    console.log(`Probando con usuario: ${nick} (${usuarioId})`);

    // 2. Ejecutar la consulta de getDetails (replicada de CommissionRepository.ts)
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

    console.log('Ejecutando consulta de detalles...');
    const [results] = await connection.execute(sql, [usuarioId, usuarioId]);

    console.log(`Resultados encontrados: ${results.length}`);
    if (results.length > 0) {
      console.log('Primeros 3 resultados:');
      console.table(results.slice(0, 3));

      const tipos = results.reduce((acc, curr) => {
        acc[curr.tipo] = (acc[curr.tipo] || 0) + 1;
        return acc;
      }, {});
      console.log('Distribución por tipo:', tipos);
    } else {
      console.log('La consulta no devolvió resultados para este usuario.');

      // Verificación extra: ¿Existen comisiones para este usuario en la tabla comisiones?
      const [rawCom] = await connection.execute(
        `
        SELECT COUNT(*) as count 
        FROM comisiones c 
        JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id 
        WHERE dc.usuario_id = ?
      `,
        [usuarioId]
      );
      console.log(`Total comisiones crudas en DB para este usuario: ${rawCom[0].count}`);
    }

    // 3. Probar Summary
    console.log('\nProbando Summary...');
    const [summary] = await connection.execute(`
      SELECT 
        SUM(monto) as total_comisiones,
        COUNT(*) as cantidad_comisiones,
        SUM(CASE WHEN venta_id IS NOT NULL AND venta_id <> '' AND venta_id <> '0' THEN monto ELSE 0 END) as comision_ventas,
        SUM(CASE WHEN servicio_id IS NOT NULL AND servicio_id <> '' AND servicio_id <> '0' THEN monto ELSE 0 END) as comision_servicios
      FROM comisiones
      WHERE estado = 1
    `);
    console.table(summary);
  } catch (error) {
    console.error('Error durante la prueba:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

testCommissionDetails();
