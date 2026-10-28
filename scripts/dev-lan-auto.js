#!/usr/bin/env node
const { spawn } = require('child_process');
const net = require('net');
require(
  require.resolve('@next/env', { paths: [require.resolve('next/package.json')] })
).loadEnvConfig(process.cwd(), true);
const { startRedis } = require('./redis-dev');

const port = process.env.PORT || '3000';
const publicHost = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname;
const host = '0.0.0.0';

async function start() {
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen({ host, port: Number(port), exclusive: true }, () => probe.close(resolve));
  });
  // Redis no bloquea el arranque: el limitador cae a memoria mientras la
  // conexión no esté lista. Se inicia en paralelo con Next y se detiene al
  // salir; así una WSL apagada no demora el servidor hasta 15 s.
  let stopRedis = () => {};
  let saliendo = false;
  startRedis()
    .then(stop => {
      stopRedis = stop;
      if (saliendo) stop();
    })
    .catch(error => {
      console.warn(`[redis] No se pudo iniciar: ${error.message}`);
    });

  console.log(`[dev] Servidor: http://${publicHost}:${port}`);

  const child = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), 'dev', '--hostname', host, '--port', String(port)],
    {
      stdio: 'inherit',
      windowsHide: true
    }
  );

  // El warmup se lanza recién cuando Next ya escucha. Si arranca antes, sus
  // requests compiten con la compilación inicial y demoran la primera
  // respuesta; esperar el puerto no compila nada y no bloquea el servidor.
  let warmup = null;
  const iniciarWarmup = async () => {
    if (process.env.DASHBOARD_WARMUP === '0') return;
    const abierto = await esperarPuerto(Number(port), 90_000, () => saliendo);
    if (!abierto || saliendo || warmup) return;
    warmup = spawn(process.execPath, [require.resolve('./warmup.mjs')], {
      stdio: 'inherit',
      windowsHide: true,
      env: { ...process.env, BASE_URL: `http://127.0.0.1:${port}` }
    });
    warmup.on('error', error => {
      console.warn(`[warmup] ${error.message}`);
    });
    warmup.on('exit', () => {
      warmup = null;
    });
  };
  void iniciarWarmup();

  const detener = () => {
    saliendo = true;
    stopRedis();
    warmup?.kill();
  };

  child.on('error', error => {
    detener();
    console.error(`[dev] ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', code => {
    detener();
    process.exitCode = code ?? 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      child.kill(signal);
      detener();
    });
  }
}

async function esperarPuerto(port, timeoutMs, cancelado) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (cancelado()) return false;
    const abierto = await new Promise(resolve => {
      const socket = net.connect({ host: '127.0.0.1', port }, () => {
        socket.end();
        resolve(true);
      });
      socket.setTimeout(500, () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (abierto) return true;
    if (cancelado()) return false;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return false;
}

start().catch(error => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `[dev] El puerto ${port} está ocupado. Detén el servidor anterior o configura PORT con otro puerto.`
      : `[dev] ${error.message}`
  );
  process.exitCode = 1;
});
