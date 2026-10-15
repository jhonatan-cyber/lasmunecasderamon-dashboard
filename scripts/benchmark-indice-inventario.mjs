import 'dotenv/config';
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// Aísla el plan del índice: solo lee la tabla real; todo DDL/DML usa pg_temp.
if (
  !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || '127.0.0.1') ||
  process.env.DB_NAME !== 'lasmunecasderamon'
)
  throw new Error('Requiere la base local de pruebas');
const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
const sql = `SELECT id, ml_restante FROM pg_temp.bench_stock_indice
  WHERE presentacion_id = $1 AND estado = 'almacen' AND ubicacion = 'bar'
  ORDER BY CASE WHEN ml_restante > 0 THEN 0 ELSE 1 END, fecha_crea ASC, codigo ASC FOR UPDATE`;
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const cases = [];
await client.connect();
try {
  await client.query("SET statement_timeout = '15s'");
  for (const escenario of ['copia_local', 'sintetico_100000']) {
    await client.query(`CREATE TEMP TABLE bench_stock_indice AS
      SELECT id, presentacion_id, estado, ubicacion, ml_restante, fecha_crea, codigo
      FROM inventario_unidades`);
    let target;
    if (escenario === 'copia_local') {
      const { rows } = await client.query(`SELECT presentacion_id FROM pg_temp.bench_stock_indice
        WHERE estado='almacen' AND ubicacion='bar' AND presentacion_id IS NOT NULL
        GROUP BY presentacion_id ORDER BY count(*) DESC, presentacion_id LIMIT 1`);
      if (!rows.length) throw new Error('No hay stock local elegible para comparar');
      target = rows[0].presentacion_id;
    } else {
      await client.query('TRUNCATE pg_temp.bench_stock_indice');
      await client.query(`INSERT INTO pg_temp.bench_stock_indice
        SELECT 'u-' || n, 'p-' || (n / 10), 'almacen', 'bar',
          CASE WHEN n % 3 = 0 THEN 150 ELSE 0 END, timestamp '2026-01-01' + n * interval '1 second',
          'code-' || n FROM generate_series(1,100000) AS g(n)`);
      target = 'p-500';
    }
    await client.query('ANALYZE pg_temp.bench_stock_indice');
    const measurements = [];
    for (const indice of [false, true]) {
      if (indice)
        await client.query(`CREATE INDEX bench_stock_presentacion
        ON pg_temp.bench_stock_indice (presentacion_id) WHERE estado='almacen' AND ubicacion='bar'`);
      const execution = [],
        planning = [];
      let plan;
      for (let i = 0; i < 22; i++) {
        await client.query('BEGIN');
        try {
          const result = await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql, [
            target
          ]);
          plan = result.rows[0]['QUERY PLAN'][0];
          if (i >= 2) {
            execution.push(plan['Execution Time']);
            planning.push(plan['Planning Time']);
          }
        } finally {
          await client.query('ROLLBACK');
        }
      }
      await client.query('BEGIN');
      let rows;
      try {
        rows = (await client.query(sql, [target])).rows;
      } finally {
        await client.query('ROLLBACK');
      }
      measurements.push({
        indice,
        filas: rows.length,
        resultadoSha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
        ejecucionServidorMs: { p50: percentile(execution, 0.5), p95: percentile(execution, 0.95) },
        planificacionServidorMs: {
          p50: percentile(planning, 0.5),
          p95: percentile(planning, 0.95)
        },
        plan
      });
    }
    if (measurements[0].resultadoSha256 !== measurements[1].resultadoSha256)
      throw new Error('El índice cambió las unidades seleccionadas o su orden');
    cases.push({ escenario, mediciones: measurements });
    await client.query('DROP TABLE pg_temp.bench_stock_indice');
  }
  const path = resolve(
    process.env.INVENTARIO_INDICE_OUTPUT ||
      'docs/rendimiento/inventario-indice-temporal-2026-10-15.json'
  );
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      {
        fechaUTC: new Date().toISOString(),
        alcance:
          'SELECT de stock sin modificar; copia temporal local y distribución sintética, 2 calentamientos + 20 EXPLAIN por variante. Solo DDL/DML en pg_temp. No mide el coste de mantenimiento del índice.',
        cases
      },
      null,
      2
    )
  );
  console.log(
    JSON.stringify(
      cases.map(c => ({
        escenario: c.escenario,
        mediciones: c.mediciones.map(({ plan, ...m }) => m)
      })),
      null,
      2
    )
  );
} finally {
  await client.end();
}
