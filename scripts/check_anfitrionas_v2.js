/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function checkAnfitrionas() {
  let connection;
  try {
    console.log('Conectando a la base de datos...', {
      host: config.host,
      database: config.database
    });
    connection = await mysql.createConnection(config);
    console.log('ConexiÃ³n establecida.');

    console.log('\n--- Roles ---');
    const [roles] = await connection.execute('SELECT * FROM roles');
    console.table(roles);

    console.log('\n--- Usuarios con rol anfitriona ---');
    const [anfitrionas] = await connection.execute(`
      SELECT u.id_usuario, u.nombre, u.apellido, u.nick, u.estado, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id_rol
      WHERE r.nombre = 'anfitriona'
    `);
    console.table(anfitrionas);

    console.log('\n--- Conteo por rol ---');
    const [counts] = await connection.execute(`
      SELECT r.nombre as rol, COUNT(u.id_usuario) as total
      FROM roles r
      LEFT JOIN usuarios u ON u.rol_id = r.id_rol
      GROUP BY r.nombre
    `);
    console.table(counts);
  } catch (error) {
    console.error('Error durante la prueba:', error.message);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

checkAnfitrionas();
