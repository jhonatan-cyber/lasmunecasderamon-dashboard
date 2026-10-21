import {
  DATABASE_CLEAN_PROTECTED_TABLES,
  DATABASE_MIGRATION_TABLES
} from '@/lib/constants/database-maintenance';
import { withTransaction, type TransactionQuery } from './db';
import { quoteIdentifier } from './postgres.cjs';

const excluded = new Set([
  'usuarios',
  'roles',
  'role_permissions',
  'permissions',
  'backups',
  '_migrations',
  '_postgres_migrations'
]);
const protectedFromCleaning = new Set<string>([
  ...DATABASE_CLEAN_PROTECTED_TABLES,
  ...DATABASE_MIGRATION_TABLES
]);

/**
 * Tablas cuyo borrado masivo protege un trigger. El mantenimiento limpia y
 * restaura un respaldo completo, así que desactiva temporalmente esos triggers
 * —de forma transaccional: si algo falla, el `ROLLBACK` los deja activos— y los
 * reactiva al terminar. Sin esto, `cleanDatabase`/`restoreDatabase` no pueden
 * vaciar `categorias` y la protección de la categoría predeterminada bloquea
 * cualquier restauración, incluso desde QA.
 */
const TABLAS_CON_TRIGGER_DE_BORRADO = ['categorias'];

async function desactivarTriggersDeBorrado(trx: TransactionQuery): Promise<void> {
  for (const table of TABLAS_CON_TRIGGER_DE_BORRADO)
    await trx(`ALTER TABLE ${quoteIdentifier(table)} DISABLE TRIGGER USER`);
}

async function reactivarTriggersDeBorrado(trx: TransactionQuery): Promise<void> {
  for (const table of TABLAS_CON_TRIGGER_DE_BORRADO)
    await trx(`ALTER TABLE ${quoteIdentifier(table)} ENABLE TRIGGER USER`);
}

async function tables(trx: TransactionQuery): Promise<string[]> {
  const rows = await trx<{ table_name: string }[]>(`SELECT table_name FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name`);
  return rows.map(row => row.table_name);
}

/**
 * Orden de borrado que respeta las llaves foráneas: primero las tablas que
 * ninguna otra tabla pendiente referencia. `restoreDatabase` borraba en orden
 * alfabético y una fila nueva en una tabla hija (p. ej. `colaciones` →
 * `cajas`) hacía fallar el `DELETE` de la tabla padre. Las claves no
 * diferibles no se pueden aplazar con `SET CONSTRAINTS`, así que el orden es
 * la única garantía. Ante un ciclo de referencias se cae al orden restante.
 */
async function ordenDeBorrado(trx: TransactionQuery, tablas: string[]): Promise<string[]> {
  const referencias = await trx<{ hija: string; padre: string }[]>(
    `SELECT hija.relname AS hija, padre.relname AS padre
       FROM pg_constraint con
       JOIN pg_class hija ON hija.oid = con.conrelid
       JOIN pg_class padre ON padre.oid = con.confrelid
      WHERE con.contype = 'f' AND hija.relkind = 'r' AND padre.relkind = 'r'`
  );
  const pendientes = new Set(tablas);
  const orden: string[] = [];
  while (pendientes.size) {
    const referenciadas = new Set(
      referencias
        .filter(fk => pendientes.has(fk.hija) && pendientes.has(fk.padre))
        .map(fk => fk.padre)
    );
    const libres = [...pendientes].filter(tabla => !referenciadas.has(tabla));
    const lote = libres.length ? libres : [...pendientes];
    for (const tabla of lote.sort()) {
      orden.push(tabla);
      pendientes.delete(tabla);
    }
  }
  return orden;
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
  return withTransaction(async trx => {
    const all = await tables(trx);
    const deletedTables = all.filter(table => !protectedFromCleaning.has(table));
    const skippedTables = all.filter(table => protectedFromCleaning.has(table));
    // One statement checks all FK relationships. RESTRICT prevents deleting protected tables.
    if (deletedTables.length) {
      await desactivarTriggersDeBorrado(trx);
      await trx(
        `TRUNCATE TABLE ${deletedTables.map(quoteIdentifier).join(', ')} RESTART IDENTITY RESTRICT`
      );
      await reactivarTriggersDeBorrado(trx);
    }
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
    await desactivarTriggersDeBorrado(trx);
    // Las claves foráneas de esta base no son diferibles, así que el orden es la
    // única garantía también al reponer: se borra hijo → padre y se inserta
    // padre → hijo. Antes se insertaba en el orden alfabético del snapshot y
    // cualquier fila hija con padre en otra tabla (p. ej. `colaciones` →
    // `inventario_presentaciones`) hacía fallar la restauración.
    const orden = await ordenDeBorrado(
      trx,
      entries.map(([table]) => table)
    );
    for (const table of orden) await trx(`DELETE FROM ${quoteIdentifier(table)}`);
    await reactivarTriggersDeBorrado(trx);
    let totalRecords = 0;
    const registros = new Map(entries);
    for (const table of [...orden].reverse()) {
      const records = registros.get(table) ?? [];
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
