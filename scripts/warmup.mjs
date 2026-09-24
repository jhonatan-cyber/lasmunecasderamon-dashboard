/**
 * Warmup del Dashboard
 *
 * Prefetch de endpoints del dashboard para compilar rutas y llenar caché
 * al iniciar el servidor, evitando el "cold start" en la primera request real.
 *
 * Se ejecuta automáticamente desde dev-lan-auto.js.
 * También se puede ejecutar manualmente: node scripts/warmup.mjs
 */

import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT_MS = 30_000;
const MAX_WAIT_MS = 60_000;

const CREDENTIALS = {
  email: process.env.WARMUP_USER || process.env.TEST_USER,
  password: process.env.WARMUP_PASSWORD || process.env.TEST_PASSWORD
};

const DASHBOARD_ENDPOINTS = [
  '/api/dashboard/composite',
  '/api/anticipos?limit=10',
  '/api/sales?limit=10',
  '/api/servicios?limit=10',
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
    }
    return data?.token || null;
  } catch (error) {
    console.warn(`[warmup] No se pudo completar el login: ${error.message}`);
    return null;
  }
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

  if (!CREDENTIALS.email || !CREDENTIALS.password) {
    console.log(
      '[warmup] Salud pública verificada. Para precargar el dashboard, configura WARMUP_USER y WARMUP_PASSWORD en .env.'
    );
    return;
  }

  // Login para obtener token (necesario para endpoints protegidos)
  const token = await login();
  if (!token) {
    return;
  } else {
    console.log('[warmup] ✅ Token obtenido');
  }

  const headers = { 'User-Agent': 'Dashboard-Warmup/1.0' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const results = [];
  const concurrency = 4;
  for (let i = 0; i < DASHBOARD_ENDPOINTS.length; i += concurrency) {
    const batch = DASHBOARD_ENDPOINTS.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async endpoint => {
        const reqStart = Date.now();
        try {
          const res = await fetch(`${BASE_URL}${endpoint}`, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers,
            keepalive: true
          });
          const duration = Date.now() - reqStart;
          return { endpoint, status: res.status, duration, ok: res.ok };
        } catch (err) {
          const duration = Date.now() - reqStart;
          return { endpoint, status: 0, duration, ok: false, error: err.message };
        }
      })
    );
    for (const r of batchResults) {
      const result =
        r.status === 'fulfilled'
          ? r.value
          : { endpoint: 'unknown', status: 0, duration: 0, ok: false };
      results.push(result);
      const icon = result.ok ? '✅' : result.status === 401 ? '⚠️' : '❌';
      const extra = result.error ? `: ${result.error}` : '';
      console.log(`  ${icon} ${result.endpoint} → ${result.status} (${result.duration}ms)${extra}`);
    }
  }

  const ok = results.filter(r => r.ok).length;
  const total = results.length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[warmup] 📊 ${ok}/${total} endpoints warmed up in ${elapsed}s`);
}

warmup().catch(err => {
  console.error(`[warmup] ❌ Fatal error:`, err.message);
});
