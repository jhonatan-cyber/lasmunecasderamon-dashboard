import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { QueryLogRepository } from '@/lib/database/query-log';

/**
 * GET /api/monitoring/slow-queries
 *
 * Retorna las slow queries registradas en la tabla query_logs.
 * Solo accesible para el administrador.
 *
 * Query params:
 *   - limit (number, default 50): cantidad de registros
 *   - offset (number, default 0): paginación
 *   - stats (boolean): si es 'true', retorna estadísticas en lugar de listado
 */
export const GET = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const showStats = searchParams.get('stats') === 'true';

    if (showStats) {
      const stats = await QueryLogRepository.getStats();
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 500);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const result = await QueryLogRepository.getRecent(limit, offset);

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      limit,
      offset
    });
  }
);
