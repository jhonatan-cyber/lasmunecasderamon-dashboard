/**
 * Benchmark Cold vs Warm
 *
 * 1. Mide tiempos de primera request (cold start) después de reiniciar servidor
 * 2. Ejecuta warmup
 * 3. Mide tiempos nuevamente (warmed up)
 *
 * Uso: node scripts/benchmark-cold-warm.mjs
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:3000';

const ENDPOINTS = [
  { name: 'Dashboard Composite',    path: '/api/dashboard/composite' },
  { name: 'Anticipos List',         path: '/api/anticipos?limit=10' },
  { name: 'Sales List',             path: '/api/sales?limit=10' },
  { name: 'Servicios List',        path: '/api/servicios?limit=10' },
  { name: 'Cash Register Summary',  path: '/api/cashregister?resumen=1' },
  { name: 'Users List',             path: '/api/users' },
  { name: 'Clients List',           path: '/api/clients' },
  { name: 'Products List',          path: '/api/products' },
  { name: 'Orders List',            path: '/api/orders' },
];

function pad(s, w) { return String(s).padEnd(w); }

async function login() {
  const user = process.env.TEST_USER || process.env.WARMUP_USER;
  const password = process.env.TEST_PASSWORD || process.env.WARMUP_PASSWORD;
  if (!user || !password) {
    console.error(
      'ERROR: Define TEST_USER y TEST_PASSWORD (o WARMUP_USER/WARMUP_PASSWORD) en el entorno antes de ejecutar el benchmark.'
    );
    process.exit(1);
  }
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user, password }),
    signal: AbortSignal.timeout(15_000)
  });
  const data = await res.json();
  return data?.token || null;
}

async function benchmark(token, label) {
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const results = [];

  console.log(`\n📊 ${label}`);
  console.log('-'.repeat(85));
  console.log(pad('ENDPOINT', 32) + '  ' + pad('TIEMPO', 12) + '  STATUS');
  console.log('-'.repeat(85));

  for (const ep of ENDPOINTS) {
    const start = performance.now();
    let status = 0;
    try {
      const res = await fetch(`${BASE_URL}${ep.path}`, { headers, signal: AbortSignal.timeout(30_000) });
      status = res.status;
    } catch { status = 0; }
    const duration = performance.now() - start;
    results.push({ ...ep, duration, status });
    const icon = status >= 200 && status < 400 ? '✅' : '❌';
    console.log(pad(ep.name, 32) + '  ' + pad((duration / 1000).toFixed(3) + 's', 12) + `  ${icon} ${status}`);
  }

  console.log('-'.repeat(85));
  const avg = results.filter(r => r.status >= 200).reduce((s, r) => s + r.duration, 0) /
              Math.max(1, results.filter(r => r.status >= 200).length);
  console.log(`Promedio (exitosos): ${(avg / 1000).toFixed(3)}s`);
  return results;
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 2_000));
  }
  return false;
}

async function main() {
  console.log('='.repeat(85));
  console.log('🔥 BENCHMARK COLD START vs WARMED UP');
  console.log('='.repeat(85));
  console.log(`Servidor: ${BASE_URL}`);
  console.log(`Endpoints: ${ENDPOINTS.length}`);

  // Wait for server to be ready
  console.log('\n⏳ Esperando servidor...');
  const ready = await waitForServer();
  if (!ready) { console.log('❌ Servidor no responde'); process.exit(1); }
  console.log('✅ Servidor listo');

  // Login
  console.log('\n🔐 Obteniendo token...');
  const token = await login();
  if (!token) { console.log('❌ Login falló'); process.exit(1); }
  console.log('✅ Token obtenido');

  // ===== COLD BENCHMARK ===== (first request after server start)
  const coldResults = await benchmark(token, '❄️  COLD START (primera request)');

  // ===== COLLECT STATS =====
  const coldOk = coldResults.filter(r => r.status >= 200);
  const coldAvg = coldOk.reduce((s, r) => s + r.duration, 0) / Math.max(1, coldOk.length);

  // ===== WARMUP =====
  console.log(`\n🔥 Ejecutando warmup...`);
  const warmupStart = Date.now();
  // Run warmup script
  execSync('node scripts/warmup.mjs', { cwd: PROJECT_DIR, stdio: 'inherit', timeout: 120_000 });
  const warmupDuration = Date.now() - warmupStart;
  console.log(`✅ Warmup completado en ${(warmupDuration / 1000).toFixed(1)}s`);

  // Wait a moment for cache to settle
  await new Promise(r => setTimeout(r, 2_000));

  // ===== WARM BENCHMARK ===== (after warmup)
  const warmResults = await benchmark(token, '🔥 WARM (post-warmup)');

  const warmOk = warmResults.filter(r => r.status >= 200);
  const warmAvg = warmOk.reduce((s, r) => s + r.duration, 0) / Math.max(1, warmOk.length);

  // ===== COMPARISON TABLE =====
  console.log('\n' + '='.repeat(85));
  console.log('📈 COMPARATIVA COLD vs WARM');
  console.log('='.repeat(85));
  console.log(pad('ENDPOINT', 32) + '  ' + pad('COLD', 12) + '  ' + pad('WARM', 12) + '  ' + pad('MEJORA', 12));
  console.log('-'.repeat(85));

  for (let i = 0; i < ENDPOINTS.length; i++) {
    const cold = coldResults[i];
    const warm = warmResults[i];
    if (cold.status < 200 || warm.status < 200) {
      console.log(pad(cold.name, 32) + '  ' + pad('ERROR', 12) + '  ' + pad('ERROR', 12) + '  ' + pad('-', 12));
      continue;
    }
    const improvement = cold.duration > 0 ? ((cold.duration - warm.duration) / cold.duration * 100).toFixed(0) : '0';
    const icon = improvement > 50 ? '🚀' : improvement > 20 ? '👍' : '➡️';
    console.log(
      pad(cold.name, 32) +
      '  ' + pad((cold.duration / 1000).toFixed(3) + 's', 12) +
      '  ' + pad((warm.duration / 1000).toFixed(3) + 's', 12) +
      `  ${icon} ${improvement}%`
    );
  }

  console.log('-'.repeat(85));
  console.log(
    pad('PROMEDIO', 32) +
    '  ' + pad((coldAvg / 1000).toFixed(3) + 's', 12) +
    '  ' + pad((warmAvg / 1000).toFixed(3) + 's', 12) +
    `  🚀 ${coldAvg > 0 ? ((coldAvg - warmAvg) / coldAvg * 100).toFixed(0) : 0}%`
  );
  console.log('='.repeat(85));
  console.log(`Warmup time: ${(warmupDuration / 1000).toFixed(1)}s`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
