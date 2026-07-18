/**
 * Warmup del Dashboard
 * 
 * Prefetch de endpoints del dashboard para compilar rutas y llenar caché
 * al iniciar el servidor, evitando el "cold start" en la primera request real.
 * 
 * Se ejecuta automáticamente desde dev-lan-auto.js.
 * También se puede ejecutar manualmente: node scripts/warmup.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT_MS = 30_000;
const MAX_WAIT_MS = 60_000;

const CREDENTIALS = { email: 'admin', password: 'REMOVED_PASSWORD' };

const DASHBOARD_ENDPOINTS = [
  '/api/dashboard/composite',
  '/api/dashboard/insights',
  '/api/dashboard/alerts',
  '/api/dashboard/pending-items',
  '/api/dashboard/sales-chart',
  '/api/dashboard/stats',
  '/api/dashboard/recent-activity',
  '/api/dashboard/logged-users',
  '/api/anticipos?limit=10',
  '/api/sales?limit=10',
  '/api/servicios?limit=10',
  '/api/orders',
  '/api/cashregister?resumen=1',
  '/api/users',
  '/api/debug/slow-queries',
  '/api/monitoring/slow-queries',
];

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) return true;
    } catch { /* server not ready yet */ }
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
    const data = await res.json();
    return data?.token || null;
  } catch {
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

  // Login para obtener token (necesario para endpoints protegidos)
  const token = await login();
  if (!token) {
    console.log('[warmup] ⚠️ Login failed — warmup parcial (solo endpoints públicos)');
  } else {
    console.log('[warmup] ✅ Token obtenido');
  }

  const headers = { 'User-Agent': 'Dashboard-Warmup/1.0' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const results = [];
  for (const endpoint of DASHBOARD_ENDPOINTS) {
    const reqStart = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers
      });
      const duration = Date.now() - reqStart;
      results.push({ endpoint, status: res.status, duration, ok: res.ok });
      const icon = res.ok ? '✅' : res.status === 401 ? '⚠️' : '❌';
      console.log(`  ${icon} ${endpoint} → ${res.status} (${duration}ms)`);
    } catch (err) {
      const duration = Date.now() - reqStart;
      results.push({ endpoint, status: 0, duration, ok: false });
      console.log(`  ❌ ${endpoint} → ERROR (${duration}ms): ${err.message}`);
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
