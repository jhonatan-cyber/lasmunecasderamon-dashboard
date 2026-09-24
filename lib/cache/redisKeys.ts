import { createHash } from 'node:crypto';

/**
 * Identifica la base de datos dentro de las claves de Redis: entornos que comparten
 * un mismo Redis pero no PostgreSQL (local, staging, producción) no se pisan entre sí.
 */
export function redisNamespace(): string {
  const database = [
    process.env.DB_HOST || '127.0.0.1',
    process.env.DB_PORT || '5432',
    process.env.DB_NAME || 'lasmunecasderamon'
  ].join(':');
  return createHash('sha256').update(database).digest('hex').slice(0, 16);
}
