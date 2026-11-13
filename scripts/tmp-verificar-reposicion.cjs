// Verificación temporal: la reposición con el filtro de vencimiento.
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

(async () => {
  await c.connect();
  const hoy = '2026-11-01';
  const vigente = `COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NULL
             OR COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= $1`;
  const vencida = `COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NOT NULL
             AND COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) < $2`;

  const rows = await c.query(
    `SELECT p.id, p.stock_minimo, p.stock_maximo,
      p.precio_compra, p.producto_id, pr.nombre AS producto, p.nombre AS presentacion,
      COUNT(u.id) FILTER (WHERE u.ubicacion = 'almacen' AND ${vigente})::int AS stock_bodega,
      COUNT(u.id) FILTER (WHERE u.ubicacion = 'bar' AND ${vigente})::int AS stock_bar,
      COUNT(u.id) FILTER (WHERE ${vencida})::int AS unidades_vencidas
      FROM inventario_presentaciones p JOIN productos pr ON pr.id_producto = p.producto_id
      LEFT JOIN inventario_unidades u ON u.presentacion_id = p.id AND u.estado = 'almacen' AND u.ubicacion IN ('almacen', 'bar')
      WHERE pr.estado = 1 AND p.stock_minimo IS NOT NULL
      GROUP BY p.id, pr.nombre ORDER BY p.id LIMIT 8`,
    [hoy, hoy]
  );
  console.log('REPOSICICIÓN (muestra):');
  for (const fila of rows.rows) console.log('  ', JSON.stringify(fila));

  const conVencidas = await c.query(
    `SELECT p.nombre AS presentacion, pr.nombre AS producto,
       COUNT(*) FILTER (WHERE COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) < $1)::int AS vencidas
      FROM inventario_unidades u
      JOIN inventario_presentaciones p ON p.id = u.presentacion_id
      JOIN productos pr ON pr.id_producto = p.producto_id
      WHERE u.estado = 'almacen'
        AND COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NOT NULL
        AND COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) < $1
      GROUP BY p.id, pr.nombre`,
    [hoy]
  );
  console.log('STOCK VENCIDO DETECTADO:', JSON.stringify(conVencidas.rows));

  await c.end();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
