import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecas',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function check() {
  const connection = await mysql.createConnection(config);
  try {
    const [rows] = await connection.execute('SELECT id_usuario, run, nick, foto, fecha_mod, fecha_crea FROM usuarios ORDER BY fecha_mod DESC, fecha_crea DESC LIMIT 5');
    console.log('Ultimos usuarios actualizados:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
    process.exit();
  }
}

check();
