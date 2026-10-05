import { withTransaction, type TransactionQuery } from './db';
import { quoteIdentifier } from './postgres.cjs';

const excluded = new Set([
  'usuarios',
  'roles',
  'role_permissions',
  'permissions',
  'configuraciones',
  'backups',
  '_migrations',
  '_postgres_migrations'
]);
const protectedFromCleaning = new Set([
  ...excluded,
  'habitaciones',
  'productos',
  'categorias',
  'codigos',
  'inventario_presentaciones',
  'inventario_unidades',
  'inventario_movimientos',
  // `inventario_productos` e `inventario_movimiento_unidades` eran del diseno
  // anterior a 84b61fd. Se retiraron en la migracion 023 y su DDL quedo en
  // database/legacy/inventario-prerediseno.sql.
  // Compras: inventario_unidades.compra_id apunta aqui, y las unidades se
  // preservan, asi que las compras que las originaron tambien.
  'compras',
  'detalle_compras',
  // Configuracion de precios por producto, no dato operativo.
  'producto_champagne_tiers'
]);

async function tables(trx: TransactionQuery): Promise<string[]> {
  const rows = await trx<{ table_name: string }[]>(`SELECT table_name FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name`);
  return rows.map(row => row.table_name);
}

export async function snapshotDatabase() {
  return withTransaction(async trx => {
    await trx('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const data: Record<string, unknown[]> = {};
    for (const table of await tables(trx)) {
      if (!excluded.has(table)) data[table] = await trx(`SELECT * FROM ${quoteIdentifier(table)}`);
    }
    return data;
  });
}

export async function cleanDatabase() {
  if (process.env.NODE_ENV === 'production') throw new Error('cleanDatabase blocked in production');
  return withTransaction(async trx => {
    const all = await tables(trx);
    const deletedTables = all.filter(table => !protectedFromCleaning.has(table));
    const skippedTables = all.filter(table => protectedFromCleaning.has(table));
    // One statement checks all FK relationships. RESTRICT prevents deleting protected tables.
    if (deletedTables.length)
      await trx(
        `TRUNCATE TABLE ${deletedTables.map(quoteIdentifier).join(', ')} RESTART IDENTITY RESTRICT`
      );
    return { deletedTables, skippedTables };
  });
}

export async function restoreDatabase(data: unknown, backupId: string) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid backup');
  return withTransaction(async trx => {
    const allowed = new Set((await tables(trx)).filter(table => !excluded.has(table)));
    const entries = Object.entries(data);
    const metadata = await trx<
      { table_name: string; column_name: string; is_identity: string; data_type: string }[]
    >(
      'SELECT table_name, column_name, is_identity, data_type FROM information_schema.columns WHERE table_schema = current_schema()'
    );
    const tiposColumna = new Map(
      metadata.map(column => [`${column.table_name}.${column.column_name}`, column.data_type])
    );
    for (const [table, records] of entries) {
      if (!allowed.has(table) || !Array.isArray(records))
        throw new Error(`Invalid backup table: ${table}`);
      const columns = new Set(
        metadata.filter(col => col.table_name === table).map(col => col.column_name)
      );
      for (const row of records) {
        if (
          !row ||
          typeof row !== 'object' ||
          Array.isArray(row) ||
          !Object.keys(row).length ||
          Object.keys(row).some(column => !columns.has(column))
        )
          throw new Error(`Invalid backup row: ${table}`);
      }
    }
    await trx('SET CONSTRAINTS ALL DEFERRED');
    for (const [table] of entries) await trx(`DELETE FROM ${quoteIdentifier(table)}`);
    let totalRecords = 0;
    for (const [table, records] of entries) {
      for (const row of records) {
        const columns = Object.keys(row);
        await trx(
          `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')})
          VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map(column => {
            const value = row[column];
            const dataType = tiposColumna.get(`${table}.${column}`);
            return Array.isArray(value) && (dataType === 'json' || dataType === 'jsonb')
              ? JSON.stringify(value)
              : value;
          })
        );
        totalRecords++;
      }
      for (const column of metadata.filter(
        col => col.table_name === table && col.is_identity === 'YES'
      )) {
        // Explicit identity values from the snapshot must not collide with the next insert.
        await trx(
          `SELECT setval(pg_get_serial_sequence(?, ?),
          GREATEST(COALESCE((SELECT max(${quoteIdentifier(column.column_name)}) FROM ${quoteIdentifier(table)}), 1),
            COALESCE(pg_sequence_last_value(pg_get_serial_sequence(?, ?)::regclass), 1)), true)`,
          [table, column.column_name, table, column.column_name]
        );
      }
    }
    if (entries.some(([table]) => table === 'inventario_unidades')) {
      await trx(`SELECT setval('inventario_sku_seq', GREATEST(
        COALESCE((SELECT max(substring(codigo FROM 4)::bigint) FROM inventario_unidades WHERE codigo ~ '^LM-[0-9]+$'), 1),
        COALESCE(pg_sequence_last_value('inventario_sku_seq'::regclass), 1)), true)`);
    }
    await trx('SET CONSTRAINTS ALL IMMEDIATE');
    await trx('UPDATE backups SET estado = 2 WHERE id_backup = ?', [backupId]);
    return { tablas: entries.length, registros: totalRecords };
  });
}
