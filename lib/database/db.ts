import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { getSQLTimezoneOffset } from '@/lib/business/timezoneService';
import { env } from '@/lib/utils/env';

const dbTzOffset = getSQLTimezoneOffset();

const defaultConfig: any = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: dbTzOffset,
  dateStrings: true,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 60000
};

declare global {
  var __lasMunecasDbPool: mysql.Pool | undefined;
  var __lasMunecasDbPoolListenersAttached: boolean | undefined;
}

function getPool(): mysql.Pool {
  if (!globalThis.__lasMunecasDbPool) {
    globalThis.__lasMunecasDbPool = mysql.createPool(defaultConfig);

    if (!globalThis.__lasMunecasDbPoolListenersAttached) {
      globalThis.__lasMunecasDbPool.on('connection', async (connection: any) => {
        try {
          const promiseConnection = connection.promise();
          await promiseConnection.query('SET time_zone = ?', [getSQLTimezoneOffset()]);
          await promiseConnection.query(
            "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))"
          );
        } catch (err) {
          console.error('Error initializing connection:', err);
        }
      });

      globalThis.__lasMunecasDbPoolListenersAttached = true;
    }
  }

  return globalThis.__lasMunecasDbPool;
}

export type TransactionQuery = <R>(sql: string, params?: any[]) => Promise<R>;

async function executeQuery<T>(sql: string, params: any[], attempt = 0): Promise<T> {
  const safeParams = (params || []).map(p => {
    if (p === undefined) return null;
    if (typeof p === 'string' && /^\d+$/.test(p)) {
      return parseInt(p, 10);
    }
    return p;
  });

  try {
    const pool = getPool();
    const isLimitQuery = /\blimit\b/i.test(sql);
    const [rows] =
      safeParams.length > 0 && !isLimitQuery
        ? await pool.execute(sql, safeParams)
        : await pool.query(sql, safeParams);

    return (rows || []) as T;
  } catch (error: any) {
    const isConnError =
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'PROTOCOL_CONNECTION_LOST' ||
      error?.code === 'ECONNRESET' ||
      error?.code === 'EPIPE' ||
      error?.code === 'POOL_CLOSED';

    if (isConnError && attempt < 2) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DB] Connection lost (attempt ${attempt + 1}/2), recreating pool...`);
      }
      try {
        await globalThis.__lasMunecasDbPool?.end().catch(() => {});
      } catch {}
      globalThis.__lasMunecasDbPool = undefined;
      globalThis.__lasMunecasDbPoolListenersAttached = false;
      return executeQuery<T>(sql, params, attempt + 1);
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Database query failed:', { sql, safeParams, error });
    }
    throw error;
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  return await executeQuery<T>(sql, params);
}

export async function withTransaction<T>(
  callback: (trx: <R>(sql: string, params?: any[]) => Promise<R>) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();

  try {
    const trx = async <R>(sql: string, params: any[] = []): Promise<R> => {
      const [rows] = await connection.execute(sql, params);
      return rows as unknown as R;
    };

    const result = await callback(trx);
    await connection.commit();

    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Lista blanca de tablas permitidas para rawQuery — evita inyección SQL
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
  'clientes',
  'anticipos',
  'propinas',
  'comisiones',
  'horas_extras',
  'gratificaciones',
  'cajas',
  'detalle_cuentas',
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
  'detalle_ventas',
  'solicitudes_anulacion_ventas',
  'solicitudes_anulacion_servicios',
  'solicitudes_anulacion_cuentas',
  'historial_anticipos',
  'pagos'
]);

/**
 * Valida que los nombres de tabla en una consulta SQL estén en la whitelist.
 * Extrae nombres de tabla después de FROM, JOIN, UPDATE, INTO, TABLE.
 */
function validateTableNames(sql: string): boolean {
  const tableRefPattern = /(?:FROM|JOIN|UPDATE|INTO|TABLE)\s+`?(\w+)`?/gi;
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
  // Validar que las tablas referenciadas estén en whitelist
  if (!validateTableNames(sql)) {
    throw new Error('Seguridad: Tabla no permitida en rawQuery');
  }
  const [rows] = await getPool().query(sql);
  return rows;
}

export async function testConnection() {
  try {
    const [rows] = await getPool().query('SELECT 1');
    return true;
  } catch (error) {
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
