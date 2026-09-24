#!/usr/bin/env node
const { spawn } = require('child_process');
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
  if (
    process.platform === 'win32' &&
    local &&
    (!target.port || target.port === '6379') &&
    !target.username &&
    !target.password &&
    target.protocol === 'redis:' &&
    process.env.REDIS_WSL_DISTRO
  ) {
    keeper = spawn(
      'wsl.exe',
      [
        '-d',
        process.env.REDIS_WSL_DISTRO,
        '-u',
        'root',
        '--',
        'sh',
        '-lc',
        'systemctl start redis-server && exec cat >/dev/null'
      ],
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
  }

  if (ready) {
    console.log('[redis] PONG: conexión disponible.');
    return stop;
  }
  if (keeper) {
    const deadline = Date.now() + 15000;
    while (!keeperError && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (await ping(url)) {
        console.log('[redis] Ubuntu/WSL iniciado; PONG correcto.');
        return stop;
      }
    }
  }
  stop();
  console.warn('[redis] No disponible. El limitador usará memoria y reintentará la conexión.');
  return stop;
}

module.exports = { startRedis, ping };

if (require.main === module) {
  require(
    require.resolve('@next/env', { paths: [require.resolve('next/package.json')] })
  ).loadEnvConfig(process.cwd(), true);
  if (process.argv.includes('--check')) {
    ping(process.env.REDIS_URL || 'redis://127.0.0.1:6379').then(ok => {
      console.log(ok ? '[redis] PONG' : '[redis] No disponible');
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
        console.error('[redis] Revisa la configuración REDIS_URL.');
        process.exitCode = 1;
      });
  }
}
