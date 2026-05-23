#!/usr/bin/env node
const { networkInterfaces } = require('os');
const { spawn } = require('child_process');

function detectLanIp() {
  const nets = networkInterfaces();
  const preferred = [];
  const fallback = [];

  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (!net || net.family !== 'IPv4' || net.internal) continue;
      const ip = net.address;
      if (
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
      ) {
        preferred.push(ip);
      } else {
        fallback.push(ip);
      }
    }
  }

  return preferred[0] || fallback[0] || null;
}

const ip = detectLanIp();
const host = ip || '0.0.0.0';
const port = process.env.PORT || '3000';

console.log(`[dev:lan:auto] Host detectado: ${host}`);
console.log(`[dev:lan:auto] URL móvil: http://${host}:${port}`);

const command = `pnpm exec next dev --hostname ${host} --port ${String(port)}`;
const child = spawn(command, [], { stdio: 'inherit', shell: true, windowsHide: false });
child.on('exit', code => process.exit(code ?? 0));
