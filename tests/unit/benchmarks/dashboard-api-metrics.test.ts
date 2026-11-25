import { describe, expect, it } from 'vitest';
import {
  assertDashboardApiBenchmarkDependencies,
  calculateDashboardApiLatencySummary,
  calculateDashboardApiStageSummary,
  parseDashboardApiBenchmarkConfig
} from '../../benchmarks/dashboard-api-metrics';

describe('dashboard API benchmark metrics', () => {
  it('uses a bounded local workload by default', () => {
    expect(parseDashboardApiBenchmarkConfig({})).toEqual({
      concurrency: 4,
      coldBatches: 3,
      warmBatches: 6
    });
  });

  it('accepts explicit bounded workload settings', () => {
    expect(
      parseDashboardApiBenchmarkConfig({
        DASHBOARD_API_BENCHMARK_CONCURRENCY: '8',
        DASHBOARD_API_BENCHMARK_COLD_BATCHES: '4',
        DASHBOARD_API_BENCHMARK_WARM_BATCHES: '6'
      })
    ).toEqual({ concurrency: 8, coldBatches: 4, warmBatches: 6 });
  });

  it.each([
    ['DASHBOARD_API_BENCHMARK_CONCURRENCY', '0'],
    ['DASHBOARD_API_BENCHMARK_CONCURRENCY', '21'],
    ['DASHBOARD_API_BENCHMARK_COLD_BATCHES', '1.5'],
    ['DASHBOARD_API_BENCHMARK_WARM_BATCHES', '11']
  ])('rejects invalid %s=%s', (variable, value) => {
    expect(() => parseDashboardApiBenchmarkConfig({ [variable]: value })).toThrow(variable);
  });

  it('keeps the complete dashboard workload below the route rate limit', () => {
    expect(() =>
      parseDashboardApiBenchmarkConfig({
        DASHBOARD_API_BENCHMARK_COLD_BATCHES: '5',
        DASHBOARD_API_BENCHMARK_WARM_BATCHES: '6'
      })
    ).toThrow('no puede superar 10');
  });

  it('allows remote PostgreSQL only with explicit opt-in and bounded concurrency', () => {
    expect(() => assertDashboardApiBenchmarkDependencies({ DB_HOST: 'db.example.net' }, 1)).toThrow(
      'DASHBOARD_API_BENCHMARK_ALLOW_REMOTE_DB=1'
    );
    expect(() =>
      assertDashboardApiBenchmarkDependencies(
        { DB_HOST: 'db.example.net', DASHBOARD_API_BENCHMARK_ALLOW_REMOTE_DB: '1' },
        5
      )
    ).toThrow('concurrencia máxima');
    expect(() =>
      assertDashboardApiBenchmarkDependencies(
        { DB_HOST: 'db.example.net', DASHBOARD_API_BENCHMARK_ALLOW_REMOTE_DB: '1' },
        4
      )
    ).not.toThrow();
    expect(() =>
      assertDashboardApiBenchmarkDependencies({ DASHBOARD_API_BENCHMARK_ALLOW_REMOTE_DB: '1' }, 5)
    ).toThrow('concurrencia máxima');
  });

  it('keeps Redis local because cold-cache phases invalidate it', () => {
    expect(() =>
      assertDashboardApiBenchmarkDependencies(
        {
          DB_HOST: 'db.example.net',
          DASHBOARD_API_BENCHMARK_ALLOW_REMOTE_DB: '1',
          REDIS_URL: 'rediss://cache.example.net'
        },
        1
      )
    ).toThrow('solo permite Redis local');
  });

  it('calculates median, nearest-rank p95 and throughput', () => {
    expect(calculateDashboardApiLatencySummary([10, 20, 30, 40], 2000)).toEqual({
      samples: 4,
      medianMs: 25,
      p95Ms: 40,
      minMs: 10,
      maxMs: 40,
      requestsPerSecond: 2
    });
  });

  it('calculates median and nearest-rank p95 for a timing stage', () => {
    expect(calculateDashboardApiStageSummary([3, 5, 8, 12])).toEqual({
      medianMs: 6.5,
      p95Ms: 12
    });
  });

  it('rejects empty or invalid timing stages', () => {
    expect(() => calculateDashboardApiStageSummary([])).toThrow('al menos una duración');
    expect(() => calculateDashboardApiStageSummary([1, Number.NaN])).toThrow(
      'duraciones de etapa válidas'
    );
  });

  it('rejects empty or invalid timing samples', () => {
    expect(() => calculateDashboardApiLatencySummary([], 100)).toThrow('al menos una muestra');
    expect(() => calculateDashboardApiLatencySummary([10, Number.NaN], 100)).toThrow(
      'muestras de latencia válidas'
    );
    expect(() => calculateDashboardApiLatencySummary([10], 0)).toThrow('duración total válida');
  });
});
