#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const port = process.env.PORT || '3000';
const host = '0.0.0.0';
const publicHost = 'localhost';

console.log(`[dev] Servidor: http://${publicHost}:${port}`);

const command = `pnpm exec next dev --hostname ${host} --port ${String(port)}`;
const child = spawn(command, { stdio: 'inherit', shell: true, windowsHide: false });

// Warmup automático: cuando el servidor esté listo, prefetch endpoints del dashboard
const warmupScript = path.join(__dirname, 'warmup.mjs');
const warmup = spawn('node', [warmupScript], {
  stdio: 'inherit',
  windowsHide: false,
  env: { ...process.env, BASE_URL: `http://${host}:${port}` }
});
warmup.unref();

child.on('exit', code => process.exit(code ?? 0));
