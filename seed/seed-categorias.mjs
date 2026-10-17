/* eslint-disable no-console -- Salida de la herramienta CLI de desarrollo. */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import pg from 'pg';
import postgres from '../lib/database/postgres.cjs';

// Herramienta local de desarrollo: las escrituras pertenecen al módulo Inventario.
const config = postgres.connectionConfig();
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '::1'].includes(config.host)
) {
  throw new Error('El seed de categorías sólo se ejecuta en PostgreSQL local de desarrollo.');
}
const dryRun = process.argv.includes('--dry-run');
const client = new pg.Client(config);

// Categorías de producto del bar/discoteca. "Bebidas analcohólicas" se omite:
// la crea y protege la migración 076/078 (system_key = 'bebidas_analcoholicas').
// Las 10 primeras coinciden con CANTIDAD_POR_CATEGORIA de seed-traspasos.mjs.
const CATEGORIAS = [
  { nombre: 'Cerveza', descripcion: 'Cervezas nacionales e importadas', display_order: 1 },
  { nombre: 'Bebidas Sin Alcohol', descripcion: 'Bebidas sin alcohol y acompañamientos', display_order: 2 },
  { nombre: 'Snacks', descripcion: 'Snacks y pasabocas', display_order: 3 },
  { nombre: 'Vinos', descripcion: 'Vinos tintos y blancos', display_order: 4 },
  { nombre: 'Champagne', descripcion: 'Champañas y espumantes', display_order: 5 },
  { nombre: 'Pisco', descripcion: 'Piscos', display_order: 6 },
  { nombre: 'Tequila', descripcion: 'Tequilas', display_order: 7 },
  { nombre: 'Ron', descripcion: 'Rones', display_order: 8 },
  { nombre: 'Vodka', descripcion: 'Vodkas', display_order: 9 },
  { nombre: 'Whisky', descripcion: 'Whiskys', display_order: 10 },
  { nombre: 'Energizantes', descripcion: 'Bebidas energizantes para mezclas', display_order: 11 },
  { nombre: 'Cigarrillos', descripcion: 'Cigarrillos y tabaco', display_order: 12 }
];

function idPara(nombre) {
  const h = createHash('sha256').update(`seed-categorias-v1:${nombre}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

try {
  await client.connect();
  await client.query('BEGIN');
  // Serializa ejecuciones simultáneas del seed.
  await client.query('LOCK TABLE categorias IN SHARE ROW EXCLUSIVE MODE');
  const resumen = [];
  for (const categoria of CATEGORIAS) {
    const id = idPara(categoria.nombre);
    const { rowCount } = await client.query(
      `
      INSERT INTO categorias (id_categoria, nombre, descripcion, estado, fecha_crea, display_order)
      SELECT $1::varchar, $2::varchar, $3::text, 1, $4::timestamp, $5::integer
      WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE lower(nombre) = lower($2::varchar))
      ON CONFLICT (id_categoria) DO NOTHING
      RETURNING id_categoria
      `,
      [id, categoria.nombre, categoria.descripcion, new Date(), categoria.display_order]
    );
    resumen.push({
      nombre: categoria.nombre,
      display_order: categoria.display_order,
      estado: rowCount > 0 ? 'insertado' : 'ya existia'
    });
  }
  await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
  console.log(`${dryRun ? 'Simulación' : 'Seed aplicado'}: ${CATEGORIAS.length} categorías.`);
  console.table(resumen);
  const insertadas = resumen.filter(r => r.estado === 'insertado').length;
  console.log(`Categorías nuevas: ${insertadas}. Ya existían: ${CATEGORIAS.length - insertadas}.`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
