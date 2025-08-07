import db from "./db";

export type TransactionCallback<T> = (trx: typeof db.query) => Promise<T>;

/**
 * Ejecuta una función dentro de una transacción de base de datos.
 * Maneja automáticamente el commit y rollback.
 * 
 * @param callback Función que contiene las operaciones de la transacción
 * @returns El resultado de la transacción
 * @throws Error si algo falla durante la transacción
 * 
 * @example
 * const result = await withTransaction(async (trx) => {
 *   const result1 = await trx("INSERT INTO table1...");
 *   const result2 = await trx("INSERT INTO table2...");
 *   return result2;
 * });
 */
export const withTransaction = async <T>(callback: TransactionCallback<T>): Promise<T> => {
  const connection = await db.pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Crear una función de consulta que usa esta conexión
    const trx = async (sql: string, values?: any[]) => {
      const [rows] = await connection.execute(sql, values);
      return rows;
    };

    // Ejecutar el callback con nuestra función de transacción
    const result = await callback(trx);
    
    // Si llegamos aquí, todo salió bien, hacer commit
    await connection.commit();
    
    return result;
  } catch (error) {
    // Si algo falla, hacer rollback
    await connection.rollback();
    throw error;
  } finally {
    // Siempre liberar la conexión
    connection.release();
  }
};
