import type { PoolClient } from 'pg';
import database from '@/lib/database/db';

const RECEPCION_LOCK_ID = 72_419_002;

export async function adquirirLockRecepcion(): Promise<PoolClient | null> {
  const client = await database.pool.connect();
  try {
    const resultado = await client.query<{ adquirido: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS adquirido',
      [RECEPCION_LOCK_ID]
    );
    if (resultado.rows[0]?.adquirido === true) return client;
    client.release();
    return null;
  } catch (error) {
    client.release(true);
    throw error;
  }
}

export async function liberarLockRecepcion(client: PoolClient, destruir = false): Promise<void> {
  if (destruir) {
    client.release(true);
    return;
  }

  try {
    await client.query('SELECT pg_advisory_unlock($1)', [RECEPCION_LOCK_ID]);
  } catch (error) {
    destruir = true;
    console.warn('[asistencia] No se pudo liberar limpiamente el lock biométrico', error);
  } finally {
    client.release(destruir);
  }
}
