const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function testSaleDetail() {
  let connection;
  try {
    console.log('Conectando a la base de datos...', { host: config.host, database: config.database });
    connection = await mysql.createConnection(config);
    console.log('Conexión establecida.');

    // 1. Buscar una venta con un pedido asociado para probar el garzon_nombre
    const [sales] = await connection.execute('SELECT id_venta, pedido_id FROM ventas WHERE pedido_id IS NOT NULL LIMIT 1');
    
    let id;
    if (sales.length === 0) {
      console.log('No se encontraron ventas con pedido asociado para probar.');
      const [anySale] = await connection.execute('SELECT id_venta FROM ventas LIMIT 1');
      if (anySale.length === 0) {
        console.log('No hay ventas en la base de datos.');
        return;
      }
      id = anySale[0].id_venta;
    } else {
      id = sales[0].id_venta;
    }

    console.log(`Probando con venta ID: ${id}`);

    // Replicar la consulta SQL de SaleRepository.getById
    const sql = `
      SELECT v.*, c.nombre as cliente_nombre, h.nombre as habitacion_nombre,
             u.nick as cajero_nick, u.nombre as cajero_nombre,
             CONCAT(ug.nombre, ' ', ug.apellido) as garzon_nombre,
             GROUP_CONCAT(CONCAT(p.nombre, ' x', dv.cantidad) SEPARATOR ', ') as productos_detalle
      FROM ventas v
      LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN usuarios u ON u.id_usuario = v.created_by
      LEFT JOIN pedidos pe ON pe.id_pedido = v.pedido_id
      LEFT JOIN usuarios ug ON ug.id_usuario = pe.mesero_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id_venta
      LEFT JOIN productos p ON p.id_producto = dv.producto_id
      WHERE v.id_venta = ?
      GROUP BY v.id_venta
    `;

    const [results] = await connection.execute(sql, [id]);

    if (results.length === 0) {
      console.log('Venta no encontrada.');
    } else {
      const row = results[0];
      console.log('Datos principales de la venta:');
      console.log('- Código:', row.codigo);
      console.log('- Total:', row.total);
      console.log('- Método Pago:', row.metodo_pago);
      console.log('- Fecha Crea:', row.fecha_crea);
      console.log('- Cajero Nick:', row.cajero_nick);
      console.log('- Garzón Nombre:', row.garzon_nombre);
      console.log('- Productos Detalle:', row.productos_detalle);
      
      if (!row.garzon_nombre && row.pedido_id) {
        console.warn('¡ALERTA! La venta tiene pedido_id pero no se obtuvo garzon_nombre.');
      }
    }

  } catch (error) {
    console.error('Error durante la prueba:', error.message);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

testSaleDetail();
