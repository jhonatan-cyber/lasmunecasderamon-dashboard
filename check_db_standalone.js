const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function check() {
  const conn = await mysql.createConnection(config);
  try {
    const [users] = await conn.query('SELECT id_usuario, nick, foto FROM usuarios WHERE foto IS NOT NULL AND foto != "" LIMIT 10');
    console.log('Users with photos:', JSON.stringify(users, null, 2));
    
    const [salesUsers] = await conn.query(`
      SELECT vu.venta_id, u.nick, u.foto 
      FROM ventas_usuarios vu 
      JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      LIMIT 10
    `);
    console.log('Sales users samples:', JSON.stringify(salesUsers, null, 2));

    const [venta] = await conn.query('SELECT id_venta FROM ventas ORDER BY fecha_crea DESC LIMIT 1');
    if (venta.length > 0) {
        const id = venta[0].id_venta;
        const [comms] = await conn.query(`
            SELECT u.nick, u.foto 
            FROM comisiones c 
            JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision 
            JOIN usuarios u ON u.id_usuario = dc.usuario_id 
            WHERE c.venta_id = ?
        `, [id]);
        console.log('Commissions for last sale:', JSON.stringify(comms, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

check();
