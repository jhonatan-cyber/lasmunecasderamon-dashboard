export interface DashboardApiBenchmarkConfig {
  concurrency: number;
  coldBatches: number;
  warmBatches: number;
}

export interface DashboardApiLatencySummary {
  samples: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  requestsPerSecond: number;
}

export interface DashboardApiStageSummary {
  medianMs: number;
  p95Ms: number;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase().replace(/^\[|\]$/g, ''));
}

function parseBoundedInteger(
  value: string | undefined,
  variable: string,
  defaultValue: number,
  max: number
): number {
  if (value === undefined || value.trim() === '') return defaultValue;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`${variable} debe ser un entero entre 1 y ${max}`);
  }

  return parsed;
}

export function parseDashboardApiBenchmarkConfig(
  environment: Record<string, string | undefined>
): DashboardApiBenchmarkConfig {
  const config = {
    concurrency: parseBoundedInteger(
      environment.DASHBOARD_API_BENCHMARK_CONCURRENCY,
      'DASHBOARD_API_BENCHMARK_CONCURRENCY',
      4,
      20
    ),
    coldBatches: parseBoundedInteger(
      environment.DASHBOARD_API_BENCHMARK_COLD_BATCHES,
      'DASHBOARD_API_BENCHMARK_COLD_BATCHES',
      3,
      10
    ),
    warmBatches: parseBoundedInteger(
      environment.DASHBOARD_API_BENCHMARK_WARM_BATCHES,
      'DASHBOARD_API_BENCHMARK_WARM_BATCHES',
      6,
      10
    )
  };

  if (config.coldBatches + config.warmBatches > 10) {
    throw new Error('La suma de los lotes fríos y calientes no puede superar 10');
  }

  return config;
}

export function assertDashboardApiBenchmarkDependencies(
  environment: Record<string, string | undefined>,
  concurrency: number
): void {
  const databaseHost = environment.DB_HOST || '127.0.0.1';
  const allowRemoteDatabase = environment.DASHBOARD_API_BENCHMARK_ALLOW_REMOTE_DB === '1';
  const remoteDatabase = !isLoopback(databaseHost) || allowRemoteDatabase;
  if (!isLoopback(databaseHost) && !allowRemoteDatabase) {
    throw new Error(
      'PostgreSQL remoto requiere DASHBOARD_API_BENCHMARK_ALLOW_REMOTE_DB=1 explícito'
    );
  }
  if (remoteDatabase && concurrency > 4) {
    throw new Error('La concurrencia máxima para PostgreSQL remoto es 4');
  }

  let redisUrl: URL;
  try {
    redisUrl = new URL(environment.REDIS_URL || 'redis://127.0.0.1:6379');
  } catch {
    throw new Error('REDIS_URL debe ser una URL válida de Redis local');
  }
  if (!['redis:', 'rediss:'].includes(redisUrl.protocol) || !isLoopback(redisUrl.hostname)) {
    throw new Error('El benchmark HTTP solo permite Redis local');
  }
}

export function calculateDashboardApiLatencySummary(
  latencies: number[],
  elapsedMs: number
): DashboardApiLatencySummary {
  if (latencies.length === 0) throw new Error('Se requiere al menos una muestra de latencia');
  if (latencies.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('Se requieren muestras de latencia válidas');
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    throw new Error('Se requiere una duración total válida');
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const medianMs =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

  return {
    samples: sorted.length,
    medianMs,
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    requestsPerSecond: (sorted.length * 1000) / elapsedMs
  };
}

export function calculateDashboardApiStageSummary(durations: number[]): DashboardApiStageSummary {
  if (durations.length === 0) throw new Error('Se requiere al menos una duración de etapa');
  if (durations.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('Se requieren duraciones de etapa válidas');
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return {
    medianMs: sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1]
  };
}
