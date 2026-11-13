// Verificación temporal del panel de lotes vencidos contra la base real.
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

const LOTE = `
    SELECT p.id AS presentacion_id, p.producto_id,
      pr.nombre AS producto, p.nombre AS presentacion,
      MIN(COALESCE(u.fecha_vencimiento, p.fecha_vencimiento))::text AS fecha_vencimiento,
      COUNT(*)::int AS unidades_vencidas,
      COUNT(*) FILTER (WHERE u.ubicacion = 'almacen')::int AS unidades_bodega,
      COUNT(*) FILTER (WHERE u.ubicacion = 'bar')::int AS unidades_bar,
      COALESCE(SUM(u.ml_restante), 0)::int AS ml_abiertos
     FROM inventario_unidades u
     JOIN inventario_presentaciones p ON p.id = u.presentacion_id
     JOIN productos pr ON pr.id_producto = p.producto_id
     WHERE u.estado = 'almacen'
       AND COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NOT NULL
       AND COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) < $1
     GROUP BY p.id, pr.nombre
     ORDER BY MIN(COALESCE(u.fecha_vencimiento, p.fecha_vencimiento)) ASC, p.nombre ASC`;

const CATALOGO = `
    SELECT p.id, p.nombre, pr.nombre AS producto,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = 'almacen' AND u.ubicacion = 'bar' AND (COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NULL OR COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= $1)) AS stock_bar,
      (SELECT COALESCE(SUM(u.ml_restante), 0) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = 'almacen' AND u.ubicacion = 'bar' AND (COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NULL OR COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= $2)) AS ml_abierta
     FROM inventario_presentaciones p
     INNER JOIN productos pr ON pr.id_producto = p.producto_id AND pr.estado = 1
     WHERE EXISTS (
       SELECT 1 FROM inventario_unidades u WHERE u.presentacion_id = p.id
         AND u.estado = 'almacen' AND u.ubicacion = 'bar'
         AND (COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) IS NULL
              OR COALESCE(u.fecha_vencimiento, p.fecha_vencimiento) >= $3)
     )`;

(async () => {
  await c.connect();
  const cols = await c.query(
    "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE (table_name = 'inventario_unidades' AND column_name = 'fecha_vencimiento') OR (table_name = 'inventario_movimientos' AND column_name = 'nota') ORDER BY table_name"
  );
  console.log('COLUMNAS:', JSON.stringify(cols.rows));

  const idx = await c.query(
    "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_unidades_vencimiento'"
  );
  console.log('INDICE:', JSON.stringify(idx.rows));

  const hoy = '2026-11-01';
  const lotes = await c.query(LOTE, [hoy]);
  console.log('LOTES VENCIDOS:', lotes.rows.length, JSON.stringify(lotes.rows.slice(0, 5)));

  const cat = await c.query(CATALOGO, [hoy, hoy, hoy]);
  console.log('CATALOGO CON STOCK VENDIBLE:', cat.rows.length);
  console.log('MUESTRA:', JSON.stringify(cat.rows.slice(0, 3)));

  await c.end();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
