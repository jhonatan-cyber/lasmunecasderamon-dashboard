import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';

/**
 * Utilidades base para reducir boilerplate en los Repositorios.
 * Mantiene el control total de SQL pero automatiza los INSERT y UPDATE simples.
 */
export class BaseRepository {
  /**
   * Genera y ejecuta un INSERT dinámico a partir de un objeto.
   */
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

  /**
   * Genera y ejecuta un UPDATE dinámico basado en un ID.
   */
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

  /**
   * Ejecuta un DELETE simple por ID.
   */
  static async delete(
    trx: TransactionQuery | typeof query,
    table: string,
    idColumn: string,
    idValue: string | number
  ): Promise<void> {
    const sql = `DELETE FROM ${table} WHERE ${idColumn} = ?`;
    await trx(sql, [idValue]);
  }

  /**
   * Busca un registro por una columna específica.
   */
  static async findOne<T>(
    trx: TransactionQuery | typeof query,
    table: string,
    column: string,
    value: any
  ): Promise<T | null> {
    const sql = `SELECT * FROM ${table} WHERE ${column} = ? LIMIT 1`;
    const results = await trx<T[]>(sql, [value]);
    return (results && Array.isArray(results) && results.length > 0) ? results[0] : null;
  }
}
