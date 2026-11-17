#!/usr/bin/env node
const { spawn, execSync } = require('child_process');
const Redis = require('ioredis');

async function ping(url) {
  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 1000,
    commandTimeout: 1000,
    retryStrategy: () => null,
    maxRetriesPerRequest: 0
  });
  client.on('error', () => {});
  try {
    await client.connect();
    return (await client.ping()) === 'PONG';
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

async function startRedis() {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const target = new URL(url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  const ready = await ping(url);
  let keeper;
  let keeperError = false;
  const stop = () => {
    // EOF also releases the Linux process if the parent terminal closes.
    keeper?.stdin?.end();
  };

  // Only manage the explicitly configured WSL service. Never start a local
  // substitute for a remote Redis, authenticated instance or custom port.
  // Prefiere Valkey (fork open source de Redis) si está disponible, cae a Redis como fallback.
  // Si WSL no está configurado, intenta usar Redis nativo de Windows.
  if (
    process.platform === 'win32' &&
    local &&
    (!target.port || target.port === '6379') &&
    !target.username &&
    !target.password &&
    target.protocol === 'redis:'
  ) {
    if (process.env.REDIS_WSL_DISTRO) {
      // WSL disponible: usar Valkey/Redis a través de WSL.
      const service = process.env.REDIS_WSL_SERVICE || 'auto';
      let serviceCommand;
      if (service === 'valkey') {
        serviceCommand = 'systemctl start valkey && exec cat >/dev/null';
      } else if (service === 'redis-server') {
        serviceCommand = 'systemctl start redis-server && exec cat >/dev/null';
      } else {
        // 'auto': intenta Valkey primero; si no existe, usa Redis.
        serviceCommand =
          'systemctl is-active valkey >/dev/null 2>&1 && systemctl start valkey || systemctl start redis-server && exec cat >/dev/null';
      }
      keeper = spawn(
        'wsl.exe',
        ['-d', process.env.REDIS_WSL_DISTRO, '-u', 'root', '--', 'sh', '-lc', serviceCommand],
        { stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true }
      );
      keeper.stdin.on('error', () => {});
      keeper.on('error', () => {
        keeperError = true;
      });
      keeper.on('exit', () => {
        keeperError = true;
      });
      // Keep a Linux process alive for the development session: systemd services
      // alone do not prevent WSL from becoming idle and shutting down.
      process.once('exit', stop);
    } else {
      // WSL no configurado: intentar Redis nativo de Windows.
      try {
        // Verificar si redis-server está disponible en PATH.
        execSync('where.exe redis-server', { stdio: 'pipe', encoding: 'utf8' });
        // Iniciar redis-server en segundo plano.
        keeper = spawn('redis-server', ['--loglevel', 'warning', '--daemonize', 'yes'], {
          stdio: 'ignore',
          windowsHide: true
        });
        keeper.on('error', () => {
          keeperError = true;
        });
        keeper.on('exit', () => {
          keeperError = true;
        });
      } catch {
        // redis-server no encontrado en PATH.
        keeperError = true;
      }
    }
  }

  if (ready) {
    console.log('[redis/valkey] PONG: conexión disponible.');
    return stop;
  }
  if (keeper) {
    const deadline = Date.now() + 15000;
    while (!keeperError && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (await ping(url)) {
        console.log('[redis/valkey] Ubuntu/WSL iniciado; PONG correcto.');
        return stop;
      }
    }
  }
  stop();
  console.warn(
    '[redis/valkey] No disponible. El limitador usará memoria y reintentará la conexión.'
  );
  return stop;
}

module.exports = { startRedis, ping };

if (require.main === module) {
  require(
    require.resolve('@next/env', { paths: [require.resolve('next/package.json')] })
  ).loadEnvConfig(process.cwd(), true);
  if (process.argv.includes('--check')) {
    ping(process.env.REDIS_URL || 'redis://127.0.0.1:6379').then(ok => {
      console.log(ok ? '[redis/valkey] PONG' : '[redis/valkey] No disponible');
      process.exitCode = ok ? 0 : 1;
    });
  } else {
    startRedis()
      .then(stop => {
        for (const signal of ['SIGINT', 'SIGTERM']) {
          process.once(signal, () => {
            stop();
            process.exit(0);
          });
        }
      })
      .catch(() => {
        console.error('[redis/valkey] Revisa la configuración REDIS_URL.');
        process.exitCode = 1;
      });
  }
}
