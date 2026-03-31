const { query } = require('./lib/database/db');

async function checkAnfitrionas() {
  try {
    console.log('--- Roles ---');
    const roles = await query('SELECT * FROM roles');
    console.table(roles);

    console.log('\n--- Usuarios con rol anfitriona ---');
    const anfitrionas = await query(`
      SELECT u.id_usuario, u.nombre, u.apellido, u.nick, u.estado, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id_rol
      WHERE r.nombre = 'anfitriona'
    `);
    console.table(anfitrionas);

    console.log('\n--- Conteo por rol ---');
    const counts = await query(`
      SELECT r.nombre as rol, COUNT(u.id_usuario) as total
      FROM roles r
      LEFT JOIN usuarios u ON u.rol_id = r.id_rol
      GROUP BY r.nombre
    `);
    console.table(counts);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkAnfitrionas();
