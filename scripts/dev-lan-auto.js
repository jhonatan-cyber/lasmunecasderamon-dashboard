#!/usr/bin/env node
const { spawn } = require('child_process');
const net = require('net');
require(
  require.resolve('@next/env', { paths: [require.resolve('next/package.json')] })
).loadEnvConfig(process.cwd(), true);
const { startRedis } = require('./redis-dev');

const port = process.env.PORT || '3000';
const host = '0.0.0.0';
const publicHost = 'localhost';

async function start() {
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen({ host, port: Number(port), exclusive: true }, () => probe.close(resolve));
  });
  const stopRedis = await startRedis();
  console.log(`[dev] Servidor: http://${publicHost}:${port}`);

  const child = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), 'dev', '--hostname', host, '--port', String(port)],
    {
      stdio: 'inherit',
      windowsHide: true
    }
  );

  child.on('error', error => {
    stopRedis();
    console.error(`[dev] ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', code => {
    stopRedis();
    process.exitCode = code ?? 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }
}

start().catch(error => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `[dev] El puerto ${port} está ocupado. Detén el servidor anterior o configura PORT con otro puerto.`
      : `[dev] ${error.message}`
  );
  process.exitCode = 1;
});
