import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { env } from '@/lib/utils/env';
import { prepareQuery } from './postgres.cjs';
import { perfilActivo, registrarConsulta } from './perfilConsultas';

/**
 * Ejecuta una consulta y, en desarrollo, la anota en el perfil de rendimiento
 * (`lib/database/perfilConsultas.ts`). En producción `perfilActivo()` es `false` y lo único
 * que se paga es la llamada.
 */
async function ejecutar<T>(sql: string, params: any[] = []): Promise<{ rows: T; command: string }> {
  if (!perfilActivo()) {
    const result = await getPool().query(prepareQuery(sql, params));
    return { rows: result.rows as T, command: result.command };
  }
  const inicio = Date.now();
  const result = await getPool().query(prepareQuery(sql, params));
  registrarConsulta(sql, Date.now() - inicio);
  return { rows: result.rows as T, command: result.command };
}

const defaultConfig = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  options:
    '-c timezone=America/Santiago -c statement_timeout=8000 -c idle_in_transaction_session_timeout=30000'
};

declare global {
  var __lasMunecasPgPool: Pool | undefined;
}
function getPool(): Pool {
  if (!globalThis.__lasMunecasPgPool) {
    const pool = new Pool(defaultConfig);
    pool.on('error', error => console.error('[PostgreSQL pool]', error.message));
    globalThis.__lasMunecasPgPool = pool;
  }
  return globalThis.__lasMunecasPgPool;
}

export type TransactionQuery = <R = any>(sql: string, params?: any[]) => Promise<R>;

function changesData(command: string, sql: string): boolean {
  // PostgreSQL reports SELECT for a writable CTE, so inspect that case too.
  return (
    /^(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|DROP|CREATE)$/.test(command) ||
    (command === 'SELECT' &&
      /^\s*WITH\b/i.test(sql) &&
      /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(sql))
  );
}

async function invalidateAfterCommit(): Promise<void> {
  try {
    const { invalidateDashboardCache } = await import('@/lib/cache/dashboardCache');
    await invalidateDashboardCache();
  } catch {
    // A committed write must never be reported as failed because of the cache.
    console.warn('[DashboardCache] No se pudo invalidar tras confirmar la escritura');
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  // Do not retry writes: a lost connection can occur after the server committed.
  const { rows, command } = await ejecutar<T>(sql, params);
  if (changesData(command, sql)) await invalidateAfterCommit();
  return rows;
}

export async function withTransaction<T>(
  callback: (trx: TransactionQuery) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  let changed = false;
  let value: T;
  try {
    await client.query('BEGIN');
    const trx: TransactionQuery = async <R>(sql: string, params: any[] = []) => {
      if (perfilActivo()) {
        const inicio = Date.now();
        const result = await client.query(prepareQuery(sql, params));
        registrarConsulta(sql, Date.now() - inicio);
        changed ||= changesData(result.command, sql);
        return result.rows as R;
      }
      const result = await client.query(prepareQuery(sql, params));
      changed ||= changesData(result.command, sql);
      return result.rows as R;
    };
    value = await callback(trx);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  if (changed) await invalidateAfterCommit();
  return value;
}

// Lista blanca de tablas permitidas para rawQuery
const ALLOWED_RAW_TABLES = new Set([
  'asistencias',
  'usuarios',
  'roles',
  'ventas',
  'servicios',
  'cuentas',
  'productos',
  'categorias',
  'pedidos',
  'detalle_pedidos',
  'detalle_pedidos_anfitrionas',
  'detalle_servicios',
  'detalle_ventas',
  'detalle_cuentas',
  'clientes',
  'clientes_prepago_movimientos',
  'anticipos',
  'propinas',
  'detalle_propinas',
  'comisiones',
  'detalle_comisiones',
  'horas_extras',
  'gratificaciones',
  'cajas',
  'logins',
  'habitaciones',
  'codigos',
  'permisos',
  'role_permissions',
  'permissions',
  'configuraciones',
  'notificaciones',
  'backups',
  'eventos',
  'solicitudes_anulacion_ventas',
  'solicitudes_anulacion_servicios',
  'solicitudes_anulacion_cuentas',
  'solicitudes_servicios',
  'solicitudes_atencion',
  'historial_anticipos',
  'anticipo_historial',
  'pagos',
  'push_tokens',
  'query_logs',
  '_postgres_migrations',
  'audit_logs'
]);

function validateTableNames(sql: string): boolean {
  const tableRefPattern = /(?:FROM|JOIN|UPDATE|INTO|TABLE)\s+"?(\w+)"?/gi;
  let match;
  while ((match = tableRefPattern.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    if (!ALLOWED_RAW_TABLES.has(tableName)) {
      return false;
    }
  }
  return true;
}

export async function rawQuery(sql: string) {
  if (!validateTableNames(sql)) {
    throw new Error('Seguridad: Tabla no permitida en rawQuery');
  }
  const { rows, command } = await ejecutar<any>(sql);
  if (changesData(command, sql)) await invalidateAfterCommit();
  return rows;
}

export async function testConnection() {
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export function generateUUID(): string {
  return randomUUID();
}

const database = {
  query,
  withTransaction,
  testConnection,
  get pool() {
    return getPool();
  },
  generateUUID
};

export default database;
