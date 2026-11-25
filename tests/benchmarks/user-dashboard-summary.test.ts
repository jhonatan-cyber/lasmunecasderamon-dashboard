import { expect, it, vi } from 'vitest';
import { config } from 'dotenv';
import {
  getDashboardSummaryThresholdViolations,
  parseDashboardSummaryThresholds
} from './dashboard-summary-thresholds';

vi.mock('@/lib/utils/logger', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return {
    logger,
    default: logger,
    setRequestId: vi.fn(),
    getRequestId: vi.fn(() => 'benchmark-request-id'),
    clearRequestId: vi.fn()
  };
});

it('measures getUserDashboardSummary directly against local PostgreSQL', async () => {
  config({ quiet: true });
  const thresholds = parseDashboardSummaryThresholds(process.env);
  if (!['127.0.0.1', 'localhost', '::1'].includes(process.env.DB_HOST || '127.0.0.1')) {
    throw new Error('El benchmark solo permite PostgreSQL local');
  }

  const { default: database, query } = await import('@/lib/database/db');
  try {
    const [sampleUser] = await query<{ id_usuario: string }[]>(`
        SELECT u.id_usuario
        FROM usuarios u
        LEFT JOIN asistencias a ON a.usuario_id = u.id_usuario
        GROUP BY u.id_usuario
        ORDER BY COUNT(a.usuario_id) DESC, u.id_usuario
        LIMIT 1`);
    if (!sampleUser) throw new Error('No hay usuarios para medir el resumen de personal');

    const { StatsQueries } = await import('@/modules/reportes/dashboard/consultas');
    const measureSummary = () =>
      StatsQueries.getUserDashboardSummary(sampleUser.id_usuario, 'anfitriona');
    for (let i = 0; i < 3; i++) await measureSummary();

    const summaryTimes: number[] = [];
    for (let i = 0; i < 30; i++) {
      const start = performance.now();
      const summary = await measureSummary();
      summaryTimes.push(performance.now() - start);
      expect(typeof summary.totalAsistencias).toBe('number');
    }

    const sortedSummaryTimes = [...summaryTimes].sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedSummaryTimes.length / 2);
    const medianMs =
      sortedSummaryTimes.length % 2 === 0
        ? (sortedSummaryTimes[medianIndex - 1] + sortedSummaryTimes[medianIndex]) / 2
        : sortedSummaryTimes[medianIndex];
    const p95Ms = sortedSummaryTimes[Math.ceil(sortedSummaryTimes.length * 0.95) - 1];
    const metrics = { medianMs, p95Ms };
    const thresholdViolations = getDashboardSummaryThresholdViolations(metrics, thresholds);
    console.log(
      JSON.stringify({
        benchmark: 'StatsQueries.getUserDashboardSummary',
        role: 'anfitriona',
        samples: summaryTimes.length,
        warmups: 3,
        thresholdMode: Object.keys(thresholds).length ? 'enforced' : 'report-only',
        thresholds,
        thresholdViolations,
        medianMs: +medianMs.toFixed(2),
        p95Ms: +p95Ms.toFixed(2),
        minMs: +sortedSummaryTimes[0].toFixed(2),
        maxMs: +sortedSummaryTimes[sortedSummaryTimes.length - 1].toFixed(2)
      })
    );

    if (thresholdViolations.length) {
      throw new Error(
        `Se excedieron los umbrales del benchmark: ${thresholdViolations.join('; ')}`
      );
    }
  } finally {
    await database.pool.end();
    globalThis.__lasMunecasPgPool = undefined;
  }
}, 120000);
