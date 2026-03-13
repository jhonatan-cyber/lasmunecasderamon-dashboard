import { query } from './lib/db';

async function test() {
  try {
    const id_caja = 1;
    const res = await query(
      `SELECT 
        r.*,
        CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre
      FROM retiros_caja r
      LEFT JOIN usuarios u ON r.usuario_id = u.id_usuario
      WHERE r.id_caja = ?
      ORDER BY r.fecha_retiro DESC`,
      [id_caja]
    );
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error details:', err);
  }
}

test();
