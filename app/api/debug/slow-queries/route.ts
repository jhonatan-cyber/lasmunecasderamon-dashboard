import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { QueryLogRepository } from '@/lib/repositories/QueryLogRepository';

/**
 * GET /api/debug/slow-queries
 *
 * Endpoint de depuración que expone las últimas N queries lentas
 * registradas en la tabla query_logs.
 *
 * Query params:
 *   - limit (number, default 20): cantidad de registros (max 200)
 *   - offset (number, default 0): paginación
 *   - min_ms (number, default 0): filtrar por duración mínima
 *   - type (string): filtrar por tipo ('query' | 'transaction_query' | 'transaction')
 */
export const GET = withRoute({ auth: true, audit: true }, async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 200);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);
  const minMs = Math.max(Number(searchParams.get('min_ms')) || 0, 0);
  const type = searchParams.get('type') || null;

  const result = await QueryLogRepository.getRecent(limit, offset);

  // Filtros opcionales en memoria
  let data = result.data;
  if (minMs > 0) {
    data = data.filter(row => row.duration_ms >= minMs);
  }
  if (type) {
    data = data.filter(row => row.query_type === type);
  }

  return NextResponse.json({
    success: true,
    data,
    total: result.total,
    limit,
    offset,
    filtered: data.length,
    filters: {
      min_ms: minMs || undefined,
      type
    }
  });
});
