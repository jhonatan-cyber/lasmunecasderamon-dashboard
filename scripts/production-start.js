#!/usr/bin/env node
/**
 * Production Start + Warmup
 *
 * Ejecuta next build (opcional), inicia next start en background,
 * espera a que el servidor esté listo y ejecuta el warmup.
 *
 * Uso:
 *   node scripts/production-start.js                    # build + start + warmup
 *   SKIP_BUILD=true node scripts/production-start.js    # solo start + warmup
 *   PORT=4000 node scripts/production-start.js          # puerto personalizado
 */

const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || '3000';
const HOST = process.env.HOST || '0.0.0.0';
const SKIP_BUILD = process.env.SKIP_BUILD === 'true';

const SCRIPTS_DIR = __dirname;
const WARMUP_SCRIPT = path.join(SCRIPTS_DIR, 'warmup.mjs');

async function run() {
  // ── 1. Build ─────────────────────────────────────────────────────────
  if (!SKIP_BUILD) {
    console.log('[production] 🔨 Building...');
    await runCommand('pnpm', ['exec', 'next', 'build'], { stdio: 'inherit' });
    await runCommand('node', ['scripts/generate-sw.js'], { stdio: 'inherit' });
    console.log('[production] ✅ Build complete');
  } else {
    console.log('[production] ⏭️ Skipping build (SKIP_BUILD=true)');
  }

  // ── 2. Start server ──────────────────────────────────────────────────
  console.log(`[production] 🚀 Starting server on http://${HOST}:${PORT}...`);

  const serverCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const serverArgs = [
    'exec', 'cross-env', `TZ=UTC`,
    'next', 'start',
    `--hostname`, HOST,
    `--port`, PORT
  ];

  const server = spawn(serverCmd, serverArgs, {
    stdio: 'inherit',
    shell: true,
    windowsHide: false,
    env: { ...process.env }
  });

  // ── 3. Wait for server + warmup ──────────────────────────────────────
  const baseUrl = `http://localhost:${PORT}`;

  // Pequeña pausa para que next start comience a inicializar
  await new Promise(r => setTimeout(r, 3000));

  // Esperar a que el servidor esté listo (máximo 90s en producción)
  const serverReady = await waitForServer(baseUrl, 90_000);
  if (!serverReady) {
    console.error('[production] ❌ Server did not start within 90s');
    server.kill();
    process.exit(1);
  }

  // Ejecutar warmup
  console.log('[production] 🔥 Running warmup...');
  const warmup = spawn('node', [WARMUP_SCRIPT], {
    stdio: 'inherit',
    shell: true,
    windowsHide: false,
    env: { ...process.env, BASE_URL: baseUrl }
  });

  // Esperar a que warmup termine (con timeout)
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('[production] ⚠️ Warmup timed out, continuing...');
      resolve();
    }, 120_000);

    warmup.on('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    warmup.on('error', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  console.log(`[production] ✅ Server running at http://${HOST}:${PORT}`);
  console.log('[production] 📋 Press Ctrl+C to stop');

  // ── 4. Mantener servidor vivo ────────────────────────────────────────
  // El proceso principal se queda vivo hasta que next start termine
  return new Promise((resolve) => {
    server.on('exit', (code) => {
      console.log(`[production] Server exited with code ${code}`);
      process.exit(code ?? 0);
    });

    // Manejar signals gracefulmente
    process.on('SIGINT', () => {
      console.log('\n[production] Shutting down...');
      server.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      server.kill('SIGTERM');
    });
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────

function runCommand(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, shell: true, windowsHide: false });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}: ${cmd} ${args.join(' ')}`));
    });
    child.on('error', reject);
  });
}

async function waitForServer(baseUrl, maxWaitMs) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return true;
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 2_000));
  }
  return false;
}

run().catch(err => {
  console.error('[production] ❌ Fatal error:', err.message);
  process.exit(1);
});
