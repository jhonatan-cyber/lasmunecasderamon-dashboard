import { query } from './lib/db';

async function checkPhotos() {
  try {
    const users = await query('SELECT id_usuario, nick, foto FROM usuarios WHERE foto IS NOT NULL AND foto != ""');
    console.log('Users with photos:', JSON.stringify(users, null, 2));
    
    const salesUsers = await query(`
      SELECT vu.venta_id, u.nick, u.foto 
      FROM ventas_usuarios vu 
      JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      LIMIT 5
    `);
    console.log('Sales users samples:', JSON.stringify(salesUsers, null, 2));

  } catch (err) {
    console.error(err);
  }
}

checkPhotos();
