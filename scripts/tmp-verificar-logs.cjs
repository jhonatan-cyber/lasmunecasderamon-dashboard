// Verificación temporal: confirmar el error de /api/products/expired y probar el endpoint.
const { Client } = require('pg');

const c = new Client({
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  password: 'Ancasi96nuwe+',
  database: 'lasmunecasderamon'
});

(async () => {
  await c.connect();
  const errores = await c.query(
    `SELECT endpoint, error_message, fecha_crea FROM error_logs
      WHERE endpoint ILIKE '%expired%' OR error_message ILIKE '%fecha_vencimiento%'
      ORDER BY fecha_crea DESC LIMIT 8`
  );
  console.log('ERRORES RELACIONADOS:');
  for (const fila of errores.rows) console.log('  ', JSON.stringify(fila));

  const usuarios = await c.query(
    `SELECT u.id_usuario, u.nick, u.nombre, r.nombre AS rol, u.activo
       FROM usuarios u LEFT JOIN roles r ON r.id_rol = u.id_rol
      ORDER BY u.nick LIMIT 12`
  );
  console.log('USUARIOS:');
  for (const fila of usuarios.rows) console.log('  ', JSON.stringify(fila));

  await c.end();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
