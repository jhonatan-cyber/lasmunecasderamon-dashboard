import db from '@/lib/database/db';

export type TransactionCallback<T> = (trx: typeof db.query) => Promise<T>;

/**
 * Wrapper compat: antes usaba mysql getConnection(). Ahora delega a db.withTransaction (pg)
 */
export const withTransaction = async <T>(callback: TransactionCallback<T>): Promise<T> => {
  return db.withTransaction(callback);
};
