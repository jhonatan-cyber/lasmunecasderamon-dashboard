import { config as loadDotenv } from 'dotenv';
import { randomInt } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  assertDashboardApiBenchmarkDependencies,
  calculateDashboardApiLatencySummary,
  calculateDashboardApiStageSummary,
  parseDashboardApiBenchmarkConfig
} from './dashboard-api-metrics';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

interface BenchmarkUser {
  id: string;
  username: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
  sessionVersion: number;
  sid: string;
}

interface ApiSample {
  latencyMs: number;
  cache: 'HIT' | 'MISS';
  stages: Record<ApiStageName, number>;
  database?: DatabaseSample;
  authDatabase?: DatabaseSample;
}

interface DatabaseSample {
  queries: number;
  queryMs: number;
  connectionMs: number;
}

type ApiStageName =
  | 'auth'
  | 'auth-token'
  | 'auth-jwt'
  | 'auth-session'
  | 'auth-permissions'
  | 'handler'
  | 'normalize'
  | 'cache';

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase().replace(/^\[|\]$/g, ''));
}

function getLocalBaseUrl(): URL {
  const baseUrl = new URL(process.env.DASHBOARD_API_BENCHMARK_BASE_URL || 'http://127.0.0.1:3000');
  if (
    !['http:', 'https:'].includes(baseUrl.protocol) ||
    !isLoopback(baseUrl.hostname) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.pathname !== '/' ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error('DASHBOARD_API_BENCHMARK_BASE_URL debe apuntar a un host loopback local');
  }
  return baseUrl;
}

async function findBenchmarkUser(
  query: <T>(sql: string, params?: any[]) => Promise<T>
): Promise<BenchmarkUser> {
  const [user] = await query<BenchmarkUser[]>(`
    SELECT u.id_usuario AS id,
      COALESCE(u.nick, u.nombre) AS username,
      u.nombre AS name,
      COALESCE(u.apellido, '') AS "lastName",
      COALESCE(u.email, '') AS email,
      r.nombre AS role,
      u.session_version AS "sessionVersion",
      s.id AS sid
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.rol_id
    JOIN sesiones s ON s.usuario_id = u.id_usuario
    WHERE u.estado = 1
      AND r.estado = 1
      AND s.revocada_en IS NULL
      AND s.expira_en > now()
      AND (
        lower(r.nombre) = 'administrador'
        OR (
          SELECT COUNT(DISTINCT lower(p.module))
          FROM role_permissions rp
          JOIN permissions p ON p.id = rp.permission_id
          WHERE rp.role_id = r.id_rol
            AND lower(p.module) IN ('dashboard', 'sales', 'users', 'finances')
            AND lower(p.action) = 'read'
            AND p.deleted_at IS NULL
        ) = 4
      )
    ORDER BY CASE WHEN lower(r.nombre) = 'administrador' THEN 1 ELSE 0 END,
      s.creada_en DESC
    LIMIT 1`);

  if (!user) {
    throw new Error('Se requiere una sesión local vigente con permiso para leer el dashboard');
  }
  return user;
}

async function reportSessionQueryPlan(
  query: <T>(sql: string, params?: any[]) => Promise<T>,
  user: BenchmarkUser
): Promise<void> {
  const sessionSql = `SELECT u.id_usuario AS id, COALESCE(u.nick, u.nombre) AS username,
    u.nombre AS name, u.apellido AS "lastName", u.nick, u.email,
    r.nombre AS role, u.session_version AS "sessionVersion",
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = ? AND s.usuario_id = u.id_usuario
        AND s.revocada_en IS NULL AND s.expira_en > now()
    ) AS "sesionVigente"
  FROM usuarios u JOIN roles r ON r.id_rol = u.rol_id
  WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1`;
  const params = [user.sid, user.id];
  const rows = await query<Array<{ 'QUERY PLAN': string }>>(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sessionSql}`,
    params
  );
  const lines = rows.map(row => row['QUERY PLAN']);
  const planning = lines.find(line => line.startsWith('Planning Time:'))?.match(/([\d.]+) ms$/);
  const execution = lines.find(line => line.startsWith('Execution Time:'))?.match(/([\d.]+) ms$/);
  if (!planning || !execution) {
    throw new Error('PostgreSQL no devolvió tiempos de planificación y ejecución');
  }
  const indexes = Array.from(
    new Set(
      lines.flatMap(line =>
        Array.from(line.matchAll(/\busing\s+([^\s]+)\s+on\b/gi), match => match[1])
      )
    )
  );
  const clientStartedAt = performance.now();
  await query(sessionSql, params);
  const clientRoundTripMs = performance.now() - clientStartedAt;
  console.log(
    JSON.stringify({
      benchmark: 'dashboard-auth-session-query-plan',
      planningMs: Number(planning[1]),
      executionMs: Number(execution[1]),
      clientRoundTripMs: Number(clientRoundTripMs.toFixed(2)),
      indexes
    })
  );
}

async function requestApiSample(
  baseUrl: URL,
  path: string,
  token: string,
  clientIp: string,
  includeDatabaseProfile = false
): Promise<ApiSample> {
  const startedAt = performance.now();
  const url = new URL(path, baseUrl);
  if (includeDatabaseProfile) url.searchParams.set('perfil', '1');
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Forwarded-For': clientIp,
      'X-LMR-Profile': '1'
    },
    signal: AbortSignal.timeout(30000)
  });
  const body = await response.text();
  const latencyMs = performance.now() - startedAt;

  if (!response.ok) {
    throw new Error(`${path} respondió HTTP ${response.status}`);
  }
  if (!['HIT', 'MISS'].includes(response.headers.get('x-cache') || '')) {
    throw new Error(`${path} no informó el estado del caché Redis`);
  }

  const stages = Object.fromEntries(
    (response.headers.get('server-timing') || '')
      .split(',')
      .map(metric => metric.trim().match(/^([a-z][a-z0-9_-]*);dur=(\d+(?:\.\d+)?)$/i))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map(match => [match[1].toLowerCase(), Number(match[2])])
  ) as Partial<Record<ApiStageName, number>>;
  const stageNames: ApiStageName[] = [
    'auth',
    'auth-token',
    'auth-jwt',
    'auth-session',
    'auth-permissions',
    'handler',
    'normalize',
    'cache'
  ];
  const serverTimingHeader = response.headers.get('server-timing') || '(none)';
  for (const stage of stageNames) {
    if (!Number.isFinite(stages[stage])) {
      throw new Error(
        `${path} no informó el tiempo de la etapa ${stage}; usa Next.js en desarrollo. ` +
          `Server-Timing recibido: ${serverTimingHeader}`
      );
    }
  }

  let payload: { success?: boolean };
  try {
    payload = JSON.parse(body) as { success?: boolean };
  } catch {
    throw new Error(`${path} no devolvió JSON válido`);
  }
  if (payload.success !== true) throw new Error(`${path} devolvió una respuesta no exitosa`);

  let database: ApiSample['database'];
  let authDatabase: ApiSample['authDatabase'];
  if (includeDatabaseProfile) {
    const rawProfile = response.headers.get('x-lmr-consultas');
    const rawAuthProfile = response.headers.get('x-lmr-auth-consultas');
    if (!rawProfile || !rawAuthProfile) {
      throw new Error(`${path} no informó los perfiles locales de PostgreSQL`);
    }
    const parseProfile = (raw: string): DatabaseSample => {
      const profile = JSON.parse(raw) as { n: number; ms: number; conexionMs: number };
      if (![profile.n, profile.ms, profile.conexionMs].every(Number.isFinite)) {
        throw new Error(`${path} devolvió un perfil PostgreSQL inválido`);
      }
      return {
        queries: profile.n,
        queryMs: profile.ms,
        connectionMs: profile.conexionMs
      };
    };
    database = parseProfile(rawProfile);
    authDatabase = parseProfile(rawAuthProfile);
  }

  return {
    latencyMs,
    cache: response.headers.get('x-cache') as ApiSample['cache'],
    stages: stages as ApiSample['stages'],
    database,
    authDatabase
  };
}

function reportPhase(
  endpoint: string,
  phase: 'single-cold' | 'single-warm' | 'concurrent-cold' | 'concurrent-warm',
  samples: ApiSample[],
  elapsedMs: number,
  concurrency: number
): void {
  const latency = calculateDashboardApiLatencySummary(
    samples.map(sample => sample.latencyMs),
    elapsedMs
  );
  const stageNames: ApiStageName[] = [
    'auth',
    'auth-token',
    'auth-jwt',
    'auth-session',
    'auth-permissions',
    'handler',
    'normalize',
    'cache'
  ];
  const stages = Object.fromEntries(
    stageNames.map(stage => [
      stage,
      calculateDashboardApiStageSummary(samples.map(sample => sample.stages[stage]))
    ])
  );
  const databaseSamples = samples.flatMap(sample => (sample.database ? [sample.database] : []));
  const authDatabaseSamples = samples.flatMap(sample =>
    sample.authDatabase ? [sample.authDatabase] : []
  );
  const database = databaseSamples.length
    ? {
        queries: calculateDashboardApiStageSummary(databaseSamples.map(sample => sample.queries)),
        queryMs: calculateDashboardApiStageSummary(databaseSamples.map(sample => sample.queryMs)),
        connectionMs: calculateDashboardApiStageSummary(
          databaseSamples.map(sample => sample.connectionMs)
        )
      }
    : undefined;
  const authDatabase = authDatabaseSamples.length
    ? {
        queries: calculateDashboardApiStageSummary(
          authDatabaseSamples.map(sample => sample.queries)
        ),
        queryMs: calculateDashboardApiStageSummary(
          authDatabaseSamples.map(sample => sample.queryMs)
        ),
        connectionMs: calculateDashboardApiStageSummary(
          authDatabaseSamples.map(sample => sample.connectionMs)
        )
      }
    : undefined;
  console.log(
    JSON.stringify({
      benchmark: 'dashboard-api-http',
      endpoint,
      phase,
      concurrency,
      ...Object.fromEntries(
        Object.entries(latency).map(([key, value]) => [
          key,
          typeof value === 'number' ? +value.toFixed(2) : value
        ])
      ),
      stages,
      database,
      authDatabase,
      cacheHits: samples.filter(sample => sample.cache === 'HIT').length,
      cacheMisses: samples.filter(sample => sample.cache === 'MISS').length
    })
  );
}

it('measures each local dashboard API route in isolation and under concurrent load', async () => {
  loadDotenv({ path: '.env.development.local', quiet: true });
  loadDotenv({ path: '.env', quiet: true });
  const benchmarkConfig = parseDashboardApiBenchmarkConfig(process.env);
  const baseUrl = getLocalBaseUrl();
  assertDashboardApiBenchmarkDependencies(process.env, benchmarkConfig.concurrency);

  const [{ query, default: database }, { generateAccessToken }, { DashboardCache }] =
    await Promise.all([
      import('@/lib/database/db'),
      import('@/lib/auth/auth'),
      import('@/lib/cache/dashboardCache')
    ]);

  try {
    const user = await findBenchmarkUser(query);
    const token = await generateAccessToken(user, user.sid);
    await reportSessionQueryPlan(query, user);
    const endpoints = [
      { name: 'composite', path: '/api/dashboard/composite' },
      { name: 'dashboard-summary', path: '/api/stats/dashboard-summary' },
      { name: 'sales-by-month', path: '/api/stats/sales-by-month?offset=0' },
      { name: 'sales-by-week', path: '/api/stats/sales-by-week?offset=0' },
      { name: 'logged-users', path: '/api/stats/logged-users' },
      { name: 'cash-register-stats', path: '/api/cash-register/stats' }
    ] as const;
    const nextClientIp = () => `127.255.${randomInt(1, 256)}.${randomInt(1, 255)}`;

    for (const endpoint of endpoints) {
      await requestApiSample(baseUrl, endpoint.path, token, nextClientIp());

      const singleCold: ApiSample[] = [];
      let singleColdElapsedMs = 0;
      for (let batch = 0; batch < benchmarkConfig.coldBatches; batch++) {
        await DashboardCache.invalidate();
        const startedAt = performance.now();
        const sample = await requestApiSample(baseUrl, endpoint.path, token, nextClientIp(), true);
        singleColdElapsedMs += performance.now() - startedAt;
        expect(sample.cache).toBe('MISS');
        singleCold.push(sample);
      }
      reportPhase(endpoint.name, 'single-cold', singleCold, singleColdElapsedMs, 1);

      const singleWarm: ApiSample[] = [];
      let singleWarmElapsedMs = 0;
      for (let batch = 0; batch < benchmarkConfig.warmBatches; batch++) {
        const startedAt = performance.now();
        const sample = await requestApiSample(baseUrl, endpoint.path, token, nextClientIp(), true);
        singleWarmElapsedMs += performance.now() - startedAt;
        expect(sample.cache).toBe('HIT');
        singleWarm.push(sample);
      }
      reportPhase(endpoint.name, 'single-warm', singleWarm, singleWarmElapsedMs, 1);

      const concurrentCold: ApiSample[] = [];
      let concurrentColdElapsedMs = 0;
      for (let batch = 0; batch < benchmarkConfig.coldBatches; batch++) {
        await DashboardCache.invalidate();
        const startedAt = performance.now();
        const burst = await Promise.all(
          Array.from({ length: benchmarkConfig.concurrency }, () =>
            requestApiSample(baseUrl, endpoint.path, token, nextClientIp())
          )
        );
        concurrentColdElapsedMs += performance.now() - startedAt;
        expect(burst.some(sample => sample.cache === 'MISS')).toBe(true);
        concurrentCold.push(...burst);
      }
      reportPhase(
        endpoint.name,
        'concurrent-cold',
        concurrentCold,
        concurrentColdElapsedMs,
        benchmarkConfig.concurrency
      );

      const concurrentWarm: ApiSample[] = [];
      let concurrentWarmElapsedMs = 0;
      for (let batch = 0; batch < benchmarkConfig.warmBatches; batch++) {
        const startedAt = performance.now();
        const burst = await Promise.all(
          Array.from({ length: benchmarkConfig.concurrency }, () =>
            requestApiSample(baseUrl, endpoint.path, token, nextClientIp())
          )
        );
        concurrentWarmElapsedMs += performance.now() - startedAt;
        expect(burst.every(sample => sample.cache === 'HIT')).toBe(true);
        concurrentWarm.push(...burst);
      }
      reportPhase(
        endpoint.name,
        'concurrent-warm',
        concurrentWarm,
        concurrentWarmElapsedMs,
        benchmarkConfig.concurrency
      );
    }
  } finally {
    DashboardCache.close();
    await database.pool.end();
    globalThis.__lasMunecasPgPool = undefined;
  }
}, 300000);
