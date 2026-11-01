const { spawn } = require('child_process');
const net = require('net');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
require(
  require.resolve('@next/env', { paths: [require.resolve('next/package.json')] })
).loadEnvConfig(process.cwd(), true);
const { startRedis } = require('./redis-dev');
const portSolicitado = (process.env.PORT ?? '').trim();
const port = portSolicitado === '' || portSolicitado === '0' ? '3000' : portSolicitado;
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

  asegurarTunelBd();

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
  const logFile = path.join(os.tmpdir(), 'lasmunecas-dashboard-dev.log');
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  console.log(`[dev] Log: ${logFile}`);

  const child = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), 'dev', '--hostname', host, '--port', String(port)],
    {
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsHide: true
    }
  );

  child.stdout.on('data', data => {
    process.stdout.write(data);
    logStream.write(data);
  });

  child.stderr.on('data', data => {
    process.stderr.write(data);
    logStream.write(data);
  });

  let warmup = null;
  const iniciarWarmup = async () => {
    if (process.env.DASHBOARD_WARMUP !== '1') return;
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

function asegurarTunelBd() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const puerto = Number(process.env.DB_PORT || 5432);
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (process.platform !== 'win32' || !loopback || puerto === 5432) return;

  const tarea = process.env.DB_TUNNEL_TASK || 'LasMunecas DB Tunnel';
  const escucha = () =>
    new Promise(resolve => {
      const socket = net.connect({ host: '127.0.0.1', port: puerto }, () => {
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

  void (async () => {
    if (await escucha()) return;

    const nombre = tarea.replace(/'/g, "''");
    const script =
      `$t = Get-ScheduledTask -TaskName '${nombre}' -ErrorAction SilentlyContinue; ` +
      `if (-not $t) { exit 2 }; ` +
      `if ($t.State -ne 'Running') { Start-ScheduledTask -TaskName '${nombre}' }`;
    console.log(`[túnel] Arrancando "${tarea}" para ${host}:${puerto}...`);
    spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      stdio: 'ignore',
      windowsHide: true
    });

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (await escucha()) {
        console.log(`[túnel] PostgreSQL disponible en ${host}:${puerto}.`);
        return;
      }
    }
    console.warn(`[túnel] ${host}:${puerto} no responde. Revisa la tarea "${tarea}".`);
  })();
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
