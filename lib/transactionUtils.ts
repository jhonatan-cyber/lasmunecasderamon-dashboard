import db from "./db";

export type TransactionCallback<T> = (trx: typeof db.query) => Promise<T>;

export const withTransaction = async <T>(callback: TransactionCallback<T>): Promise<T> => {
  const connection = await db.pool.getConnection();
  await connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));");

  try {
    await connection.beginTransaction();

    const trx = async (sql: string, values?: any[]) => {
      const [rows] = await connection.execute(sql, values);
      return rows;
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
};
