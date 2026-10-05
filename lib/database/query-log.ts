export type QueryLogEntry = {
  sql: string;
  params_count: number;
  duration_ms: number;
  query_type: 'query' | 'transaction_query' | 'transaction';
  query_count?: number | null;
  avg_query_ms?: number | null;
  total_query_time_ms?: number | null;
};

/**
 * Repository for slow query logs (query_logs table).
 *
 * IMPORTANTE: Usa import() dinámico para evitar circular dependency
 * con db.ts (db.ts importa QueryLogRepository, y viceversa).
 *
 * Las escrituras son fire-and-forget: se ejecutan sin await
 * para no afectar el rendimiento de la query original.
 *
 * La tabla tiene un índice en created_at para permitir
 * limpieza periódica de registros antiguos (recomendado: TTL de 7 días).
 */
export class QueryLogRepository {
  private static readonly TABLE = 'query_logs';

  /**
   * Inserta una slow query en la tabla query_logs (fire-and-forget).
   * Usa import() dinámico para evitar circular dependency con db.ts.
   * No usa await para no bloquear la query original.
   */
  static log(entry: QueryLogEntry): void {
    const sqlText = (entry.sql || '').substring(0, 500);

    import('@/lib/database/db')
      .then(({ query }) => {
        query(
          `INSERT INTO ${this.TABLE}
         ("sql", params_count, duration_ms, query_type, query_count, avg_query_ms, total_query_time_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            sqlText,
            entry.params_count,
            entry.duration_ms,
            entry.query_type,
            entry.query_count ?? null,
            entry.avg_query_ms ?? null,
            entry.total_query_time_ms ?? null
          ]
        ).catch(() => {
          // Si falla el insert en query_logs, no debe afectar la operación principal.
          // El logger de archivo sigue funcionando como fallback.
        });
      })
      .catch(() => {
        // Si falla el import dinámico, el logger de archivo sigue funcionando.
      });
  }

  /**
   * Obtiene las slow queries más recientes.
   */
  static async getRecent(
    limit = 50,
    offset = 0
  ): Promise<{
    data: Array<{
      id: number;
      sql: string;
      params_count: number;
      duration_ms: number;
      query_type: string;
      query_count: number | null;
      avg_query_ms: number | null;
      total_query_time_ms: number | null;
      created_at: string;
    }>;
    total: number;
  }> {
    const { query } = await import('@/lib/database/db');
    const [data, countResult] = await Promise.all([
      query<any[]>(
        `SELECT id, "sql", params_count, duration_ms, query_type, query_count,
                avg_query_ms, total_query_time_ms, created_at
         FROM ${this.TABLE}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      query<[{ total: number }]>(`SELECT COUNT(*) as total FROM ${this.TABLE}`)
    ]);

    return {
      data,
      total: countResult[0]?.total || 0
    };
  }

  /**
   * Obtiene estadísticas resumidas de slow queries.
   */
  static async getStats(): Promise<{
    total_count: number;
    avg_duration_ms: number;
    max_duration_ms: number;
    by_type: Array<{ query_type: string; count: number; avg_duration_ms: number }>;
  }> {
    const { query } = await import('@/lib/database/db');
    const [stats, byType] = await Promise.all([
      query<any[]>(
        `SELECT
           COUNT(*) as total_count,
           COALESCE(ROUND(AVG(duration_ms), 1), 0) as avg_duration_ms,
           COALESCE(ROUND(MAX(duration_ms), 1), 0) as max_duration_ms
         FROM ${this.TABLE}`
      ),
      query<any[]>(
        `SELECT
           query_type,
           COUNT(*) as count,
           COALESCE(ROUND(AVG(duration_ms), 1), 0) as avg_duration_ms
         FROM ${this.TABLE}
         GROUP BY query_type
         ORDER BY count DESC`
      )
    ]);

    return {
      total_count: stats[0]?.total_count || 0,
      avg_duration_ms: stats[0]?.avg_duration_ms || 0,
      max_duration_ms: stats[0]?.max_duration_ms || 0,
      by_type: byType || []
    };
  }

  /**
   * Limpia registros antiguos (recomendado: ejecutar como cron diario).
   * Por defecto elimina registros con más de 7 días.
   */
  static async purgeOlderThan(days = 7): Promise<number> {
    const { query } = await import('@/lib/database/db');
    const rows = await query<any[]>(
      `DELETE FROM ${this.TABLE}
       WHERE created_at < (CAST(NOW() AS timestamp) - make_interval(days => CAST(? AS integer))) RETURNING id`,
      [days]
    );
    return rows.length;
  }
}
