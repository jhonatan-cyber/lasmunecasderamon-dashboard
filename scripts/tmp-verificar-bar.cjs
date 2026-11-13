// Verificación temporal: el filtro de vencimiento no puede vaciar el bar.
require('dotenv/config');
const { Client } = require('pg');

const password = process.env.DB_PASSWORD;
if (!password) {
  throw new Error(
    'Falta DB_PASSWORD: cargala en .env o exportala antes de correr este script.'
  );
}

// Misma conexión que usa el panel: DB_HOST, DB_PORT, DB_USER y DB_NAME.
const c = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password,
  database: process.env.DB_NAME || 'lasmunecasderamon'
});

const HOY = '2026-11-01';

(async () => {
  await c.connect();

  const unidades = await c.query(
    `SELECT u.ubicacion, COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE u.fecha_vencimiento IS NOT NULL)::int AS con_fecha,
       COUNT(*) FILTER (WHERE COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NOT NULL)::int AS con_fecha_efectiva,
       COUNT(*) FILTER (WHERE COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) < $1)::int AS vencidas
     FROM inventario_unidades u
     LEFT JOIN inventario_presentaciones p ON p.id = u.presentacion_id
     WHERE u.estado = 'almacen'
     GROUP BY u.ubicacion`,
    [HOY]
  );
  console.log('UNIDADES ACTIVAS:', JSON.stringify(unidades.rows));

  const pres = await c.query(
    `SELECT COUNT(*)::int AS presentaciones_activas
     FROM inventario_presentaciones p JOIN productos pr ON pr.id_producto = p.producto_id AND pr.estado = 1`
  );
  console.log('PRESENTACIONES DE PRODUCTO ACTIVO:', JSON.stringify(pres.rows));

  const conBar = await c.query(
    `SELECT COUNT(DISTINCT u.presentacion_id)::int AS presentaciones_con_bar
     FROM inventario_unidades u
     WHERE u.estado = 'almacen' AND u.ubicacion = 'bar'`
  );
  console.log('PRESENTACIONES CON STOCK EN BAR:', JSON.stringify(conBar.rows));

  const detalle = await c.query(
    `SELECT pr.nombre AS producto, p.nombre AS presentacion,
       u.fecha_vencimiento AS fecha_lote, p.fecha_vencimiento AS fecha_presentacion,
       COALESCE(u.fecha_vencimiento, p.fecha_vencimiento)::text AS efectiva,
       COUNT(*)::int AS botellas
     FROM inventario_unidades u
     JOIN inventario_presentaciones p ON p.id = u.presentacion_id
     JOIN productos pr ON pr.id_producto = p.producto_id
     WHERE u.estado = 'almacen' AND u.ubicacion = 'bar'
     GROUP BY pr.nombre, p.nombre, u.fecha_vencimiento, p.fecha_vencimiento
     ORDER BY pr.nombre LIMIT 12`,
    []
  );
  console.log('STOCK EN BAR (muestra):');
  for (const fila of detalle.rows) console.log('  ', JSON.stringify(fila));

  await c.end();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
