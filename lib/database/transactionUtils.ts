import db from "@/lib/database/db";

export type TransactionCallback<T> = (trx: typeof db.query) => Promise<T>;

export const withTransaction = async <T>(callback: TransactionCallback<T>): Promise<T> => {
  const connection = await db.pool.getConnection();

  try {
    await connection.beginTransaction();

    const trx = async <R = any>(sql: string, values?: any[]): Promise<R> => {
      const { getSQLTimezoneOffset } = require("@/lib/business/timezoneService");
      const dbTz = getSQLTimezoneOffset();
      await connection.query(`SET time_zone = '${dbTz}'`);
      await connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");

      const [rows] = await connection.query(sql, values);
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
};

