/**
 * Benchmark de endpoints del Dashboard
 * Mide tiempo de respuesta de los endpoints clave, 3 iteraciones por endpoint
 * 
 * Uso: node scripts/benchmark-endpoints.mjs
 */

const BASE_URL = 'http://localhost:3000';

const BENCH_USER = process.env.TEST_USER || process.env.WARMUP_USER;
const BENCH_PASSWORD = process.env.TEST_PASSWORD || process.env.WARMUP_PASSWORD;
if (!BENCH_USER || !BENCH_PASSWORD) {
  console.error(
    'ERROR: Define TEST_USER y TEST_PASSWORD (o WARMUP_USER/WARMUP_PASSWORD) en el entorno antes de ejecutar el benchmark.'
  );
  process.exit(1);
}
const CREDENTIALS = { email: BENCH_USER, password: BENCH_PASSWORD };
const ITERATIONS = 3;

const ENDPOINTS = [
  { name: 'Health',        method: 'GET',  path: '/api/health',             isPublic: true },
  { name: 'Login',         method: 'POST', path: '/api/auth/login',         isPublic: true, body: CREDENTIALS },
  { name: 'Dashboard Composite', method: 'GET', path: '/api/dashboard/composite' },
  { name: 'Dashboard Insights',  method: 'GET', path: '/api/dashboard/insights' },
  { name: 'Dashboard Alerts',    method: 'GET', path: '/api/dashboard/alerts' },
  { name: 'Dashboard Stats',     method: 'GET', path: '/api/dashboard/stats' },
  { name: 'Dashboard Pending',   method: 'GET', path: '/api/dashboard/pending-items' },
  { name: 'Dashboard Sales Chart', method: 'GET', path: '/api/dashboard/sales-chart' },
  { name: 'Dashboard Recent Activity', method: 'GET', path: '/api/dashboard/recent-activity' },
  { name: 'Dashboard Logged Users', method: 'GET', path: '/api/dashboard/logged-users' },
  { name: 'Sales List',     method: 'GET', path: '/api/sales?limit=10' },
  { name: 'Sales Summary',  method: 'GET', path: '/api/sales?tipo=resumen' },
  { name: 'Servicios List', method: 'GET', path: '/api/servicios?limit=10' },
  { name: 'Orders List',    method: 'GET', path: '/api/orders' },
  { name: 'Tips Summary',   method: 'GET', path: '/api/tips' },
  { name: 'Anticipos List', method: 'GET', path: '/api/anticipos' },
  { name: 'Commissions',    method: 'GET', path: '/api/commissions' },
  { name: 'Cash Register',  method: 'GET', path: '/api/cashregister/summary' },
  { name: 'Caja Status',    method: 'GET', path: '/api/caja-status' },
  { name: 'Users List',     method: 'GET', path: '/api/users' },
  { name: 'Clients List',   method: 'GET', path: '/api/clients' },
  { name: 'Products List',  method: 'GET', path: '/api/products' },
  { name: 'Categories List', method: 'GET', path: '/api/categories' },
  { name: 'Rooms List',     method: 'GET', path: '/api/rooms' },
  { name: 'Attendance',     method: 'GET', path: '/api/attendance' },
  { name: 'Overtime',       method: 'GET', path: '/api/overtime' },
  { name: 'Gratificaciones', method: 'GET', path: '/api/gratificaciones' },
  { name: 'Ping',           method: 'GET', path: '/api/ping',               isPublic: false },
];

const results = [];
let TOKEN = null;

function pad(text, width) {
  return String(text).padEnd(width);
}

function formatTime(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

async function request(method, path, body = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const start = performance.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal: AbortSignal.timeout(30000)
    });
    const duration = performance.now() - start;
    const data = await res.text();
    let json;
    try { json = JSON.parse(data); } catch { json = null; }
    return { ok: res.ok, status: res.status, duration, data: json, raw: data.substring(0, 200) };
  } catch (err) {
    const duration = performance.now() - start;
    return { ok: false, status: 0, duration, error: err.message };
  }
}

async function login() {
  console.log('\n🔐 Intentando login...');
  const result = await request('POST', '/api/auth/login', CREDENTIALS);

  if (result.ok && result.data?.success && result.data?.token) {
    TOKEN = result.data.token;
    console.log(`   ✅ Login exitoso (${formatTime(result.duration)})`);
    return true;
  }

  console.log(`   ❌ Login falló: HTTP ${result.status} | ${result.data?.message || result.error || 'Respuesta inesperada'}`);
  
  // Intento alternativo: /api/login
  if (result.status === 404) {
    console.log('   ⚠️  Intentando /api/login...');
    const alt = await request('POST', '/api/login', CREDENTIALS);
    if (alt.ok && alt.data?.token) {
      TOKEN = alt.data.token;
      console.log(`   ✅ Login alternativo exitoso (${formatTime(alt.duration)})`);
      return true;
    }
  }

  return false;
}

async function benchmark() {
  console.log('\n' + '='.repeat(100));
  console.log('📊 BENCHMARK DE ENDPOINTS DEL DASHBOARD');
  console.log(`   Servidor: ${BASE_URL}`);
  console.log(`   Iteraciones por endpoint: ${ITERATIONS}`);
  console.log(`   Fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(100));

  if (!await login()) {
    console.log('\n   No se pudo autenticar. Algunos endpoints requieren token.');
  }

  console.log('\n' + '-'.repeat(100));
  console.log(pad('ENDPOINT', 32), pad('MET', 6), pad('ITER1', 12), pad('ITER2', 12), pad('ITER3', 12), pad('PROM', 12), pad('STATUS', 8));
  console.log('-'.repeat(100));

  for (const ep of ENDPOINTS) {
    const times = [];
    let lastStatus = 0;

    for (let i = 0; i < ITERATIONS; i++) {
      const result = await request(ep.method, ep.path, ep.body, ep.isPublic ? null : TOKEN);
      times.push(result.duration);
      lastStatus = result.status;
    }

    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const allOk = times.every((_, i) => true); // just track

    const statusColor = lastStatus >= 200 && lastStatus < 300 ? '✅' : lastStatus === 401 ? '⚠️' : '❌';

    console.log(
      pad(ep.name, 32),
      pad(ep.method, 6),
      pad(formatTime(times[0]), 12),
      pad(formatTime(times[1]), 12),
      pad(formatTime(times[2]), 12),
      pad(formatTime(avg), 12),
      pad(`${statusColor} ${lastStatus}`, 8)
    );

    results.push({
      name: ep.name,
      method: ep.method,
      path: ep.path,
      times,
      min,
      max,
      avg,
      status: lastStatus
    });
  }

  console.log('-'.repeat(100));

  // Resumen
  console.log('\n📈 RESUMEN:');
  console.log('='.repeat(100));

  const endpointsOk = results.filter(r => r.status >= 200 && r.status < 400);
  const endpointsFail = results.filter(r => r.status === 0 || r.status >= 400);

  console.log(`   Total endpoints: ${results.length}`);
  console.log(`   Exitosos: ${endpointsOk.length}`);
  console.log(`   Fallidos: ${endpointsFail.length}`);

  if (endpointsFail.length > 0) {
    console.log('\n   ⚠️  Endpoints con errores:');
    for (const r of endpointsFail) {
      console.log(`      - ${r.name} (${r.method} ${r.path}): HTTP ${r.status}`);
    }
  }

  // Top 5 más lentos
  const sortedByAvg = [...results].sort((a, b) => b.avg - a.avg);
  console.log('\n   🐌 Top 5 más lentos:');
  for (const r of sortedByAvg.slice(0, 5)) {
    if (r.status >= 200 && r.status < 400) {
      console.log(`      ${formatTime(r.avg)} - ${r.name} (${r.method} ${r.path})`);
    }
  }

  // Top 5 más rápidos
  console.log('\n   ⚡ Top 5 más rápidos:');
  for (const r of sortedByAvg.slice(-5).reverse()) {
    if (r.status >= 200 && r.status < 400) {
      console.log(`      ${formatTime(r.avg)} - ${r.name} (${r.method} ${r.path})`);
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log(`   Benchmark completado. ${results.length} endpoints probados.`);
  console.log('='.repeat(100));
}

benchmark().catch(err => {
  console.error('\n❌ Error ejecutando benchmark:', err);
  process.exit(1);
});
