/**
 * Warmup del Dashboard
 *
 * Prefetch de rutas y endpoints para compilar páginas y llenar caché al
 * iniciar el servidor, evitando el "cold start" en la primera visita real.
 *
 * Se ejecuta automáticamente desde dev-lan-auto.js al levantar `pnpm dev`
 * (DASHBOARD_WARMUP=0 lo desactiva). También se puede ejecutar manualmente:
 * node scripts/warmup.mjs
 */

import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const TIMEOUT_MS = 30_000;
const MAX_WAIT_MS = 60_000;

const CREDENTIALS = {
  email: process.env.WARMUP_USER || process.env.TEST_USER,
  password: process.env.WARMUP_PASSWORD || process.env.TEST_PASSWORD
};

// Rutas HTML que se compilan en la primera visita. Las públicas no necesitan
// sesión; las privadas se suman sólo cuando hay credenciales configuradas.
const PUBLIC_PAGES = ['/login'];
const AUTHENTICATED_PAGES = ['/dashboard', '/tickets'];

const DASHBOARD_ENDPOINTS = [
  '/api/dashboard/composite',
  '/api/advances?limit=10',
  '/api/sales?limit=10',
  '/api/services?limit=10',
  '/api/orders',
  '/api/cashregister?resumen=1',
  '/api/users',
  '/api/monitoring/slow-queries'
];

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) return true;
    } catch {
      /* server not ready yet */
    }
    await new Promise(r => setTimeout(r, 2_000));
  }
  return false;
}

async function login() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CREDENTIALS),
      signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) {
      console.warn(
        `[warmup] Login rechazado (HTTP ${res.status}); se omiten las rutas protegidas.`
      );
      return null;
    }
    const data = await res.json();
    if (!data?.token) {
      console.warn(
        '[warmup] Login sin token; comprueba las credenciales y los requisitos de acceso de la cuenta.'
      );
      return null;
    }
    // Las páginas autentican por cookie (httpOnly); el Bearer sólo sirve para
    // las rutas API. Sin reenviar la cookie, /dashboard y /tickets redirigen.
    const cookie = (res.headers.getSetCookie?.() ?? [])
      .map(value => value.split(';')[0])
      .join('; ');
    return { token: data.token, cookie };
  } catch (error) {
    console.warn(`[warmup] No se pudo completar el login: ${error.message}`);
    return null;
  }
}

async function warmPath(path, headers) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers,
      keepalive: true
    });
    return { endpoint: path, status: res.status, duration: Date.now() - start, ok: res.ok };
  } catch (error) {
    return {
      endpoint: path,
      status: 0,
      duration: Date.now() - start,
      ok: false,
      error: error.message
    };
  }
}

function logResult(result) {
  const icon = result.ok ? '✅' : result.status === 401 ? '⚠️' : '❌';
  const extra = result.error ? `: ${result.error}` : '';
  console.log(`  ${icon} ${result.endpoint} → ${result.status} (${result.duration}ms)${extra}`);
}

function summary(results, startTime) {
  const ok = results.filter(r => r.ok).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[warmup] 📊 ${ok}/${results.length} rutas precalentadas en ${elapsed}s`);
}

async function warmup() {
  const startTime = Date.now();
  console.log(`[warmup] 🔥 Starting dashboard warmup against ${BASE_URL}...`);

  const serverReady = await waitForServer();
  if (!serverReady) {
    console.log(`[warmup] ❌ Server not ready after ${MAX_WAIT_MS / 1000}s`);
    return;
  }
  console.log(`[warmup] ✅ Server ready (${Date.now() - startTime}ms)`);

  const results = [];

  for (const page of PUBLIC_PAGES) {
    const result = await warmPath(page, {});
    results.push(result);
    logResult(result);
  }

  if (!CREDENTIALS.email || !CREDENTIALS.password) {
    console.log(
      '[warmup] Salud y páginas públicas verificadas. Para precargar el resto, configura WARMUP_USER y WARMUP_PASSWORD en .env.'
    );
    summary(results, startTime);
    return;
  }

  // Login para obtener token (necesario para endpoints protegidos)
  const session = await login();
  if (!session) {
    summary(results, startTime);
    return;
  }
  console.log('[warmup] ✅ Token obtenido');

  const headers = {
    'User-Agent': 'Dashboard-Warmup/1.0',
    Authorization: `Bearer ${session.token}`
  };
  if (session.cookie) headers.Cookie = session.cookie;
  const targets = [...DASHBOARD_ENDPOINTS, ...AUTHENTICATED_PAGES];
  const concurrency = 4;

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(path => warmPath(path, headers)));
    for (const result of batchResults) {
      results.push(result);
      logResult(result);
    }
  }

  summary(results, startTime);
}

warmup().catch(err => {
  console.error(`[warmup] ❌ Fatal error:`, err.message);
});
