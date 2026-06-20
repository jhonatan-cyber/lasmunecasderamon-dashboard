import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';

export class BaseRepository {
  static async insert(
    trx: TransactionQuery | typeof query,
    table: string,
    data: Record<string, any>
  ): Promise<void> {
    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => data[k]);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    await trx(sql, values);
  }

  static async update(
    trx: TransactionQuery | typeof query,
    table: string,
    idColumn: string,
    idValue: string | number,
    data: Record<string, any>
  ): Promise<void> {
    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    if (keys.length === 0) return;

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => data[k]).concat(idValue);

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = ?`;
    await trx(sql, values);
  }

  static async delete(
    trx: TransactionQuery | typeof query,
    table: string,
    idColumn: string,
    idValue: string | number
  ): Promise<void> {
    const sql = `DELETE FROM ${table} WHERE ${idColumn} = ?`;
    await trx(sql, [idValue]);
  }

  static async findOne<T>(
    trx: TransactionQuery | typeof query,
    table: string,
    column: string,
    value: any
  ): Promise<T | null> {
    const sql = `SELECT * FROM ${table} WHERE ${column} = ? LIMIT 1`;
    const results = await trx<T[]>(sql, [value]);
    return results && Array.isArray(results) && results.length > 0 ? results[0] : null;
  }
}
