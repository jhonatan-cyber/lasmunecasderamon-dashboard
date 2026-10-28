#!/usr/bin/env node
/**
 * Benchmark de arranque del Dashboard (Next dev + Turbopack).
 *
 * Uso:
 *   node scripts/benchmark-arranque.mjs [--cold 3] [--warm 2] [--port 3000] [--json ruta]
 *
 * - `frío`: elimina `.next` antes de cada corrida.
 * - `templado`: conserva la caché de `.next` de la última corrida fría.
 * - Desactiva el warmup (`DASHBOARD_WARMUP=0`) para no mezclar su trabajo.
 * - Exige el puerto libre: no ejecutar con `pnpm dev` levantado, porque borra
 *   `.next` y el servidor usa esa misma caché.
 *
 * Métricas (todas desde el spawn):
 *   readyMs           → línea "Ready in" de Next
 *   healthMs          → primer /api/health con HTTP 200
 *   loginMs           → primer /login con HTTP 200 (incluye health)
 *   loginPageMs       → loginMs - healthMs (compilación de la página)
 *   instrumentationMs → primera línea [instrumentation]
 */

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEXT_DIR = path.join(ROOT, '.next');
const args = process.argv.slice(2);

function valueOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function intOf(name, fallback, min, max) {
  const value = Number(valueOf(name, String(fallback)));
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} debe ser un entero entre ${min} y ${max}.`);
  }
  return value;
}

const COLD_RUNS = intOf('--cold', 3, 1, 10);
const WARM_RUNS = intOf('--warm', 2, 0, 10);
const PORT = intOf('--port', 3000, 1, 65535);
const DATE = new Date().toISOString().slice(0, 10);
const OUTPUT = path.resolve(ROOT, valueOf('--json', `docs/rendimiento/arranque-frio-${DATE}.json`));
const READY_TIMEOUT_MS = 120_000;
const ROUTE_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 60_000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const round = value => Math.round(value * 10) / 10;

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function gitRaw(...command) {
  try {
    return execFileSync('git', command, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).replace(/[\r\n]+$/, '');
  } catch {
    return '';
  }
}

function git(...command) {
  return gitRaw(...command).trim();
}

function canConnect(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    let settled = false;
    const finish = open => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(400, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function waitForFreePort(port, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await canConnect(port))) return;
    await sleep(250);
  }
  throw new Error(`El puerto ${port} sigue ocupado.`);
}

function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
    } catch {
      /* El proceso ya terminó. */
    }
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* El proceso ya terminó. */
      }
    }
  }
}

function waitForExit(child, timeoutMs = 15_000) {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    child.once('exit', finish);
  });
}

function createLogTail() {
  const lines = [];
  return {
    push(chunk) {
      for (const line of stripAnsi(chunk.toString()).split(/\r?\n/)) {
        if (!line.trim()) continue;
        lines.push(line);
        if (lines.length > 120) lines.shift();
      }
    },
    tail(count = 50) {
      return lines.slice(-count).join('\n');
    }
  };
}

async function waitFor(predicate, timeoutMs, label, child) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    if (child.exitCode !== null) {
      throw new Error(`${label}: el servidor terminó (código ${child.exitCode}).`);
    }
    await sleep(100);
  }
  throw new Error(`${label}: timeout de ${timeoutMs / 1000}s.`);
}

async function waitForRoute(pathname, startedAt, cancelled) {
  const deadline = Date.now() + ROUTE_TIMEOUT_MS;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    if (cancelled()) throw new Error(`${pathname}: solicitud cancelada.`);
    try {
      const response = await fetch(`${BASE_URL}${pathname}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'User-Agent': 'Dashboard-Startup-Benchmark/1.0' }
      });
      lastStatus = response.status;
      await response.arrayBuffer();
      if (response.status === 200) {
        return { status: response.status, elapsedMs: round(Date.now() - startedAt) };
      }
    } catch {
      /* El servidor todavía no escucha o la ruta se está compilando. */
    }
    await sleep(250);
  }
  throw new Error(
    `${pathname}: sin HTTP 200 en ${ROUTE_TIMEOUT_MS / 1000}s (último ${lastStatus}).`
  );
}

function summarize(samples) {
  const stats = key => {
    const values = samples
      .map(sample => sample[key])
      .filter(value => typeof value === 'number' && Number.isFinite(value))
      .sort((a, b) => a - b);
    if (!values.length) return null;
    const middle = Math.floor(values.length / 2);
    const median =
      values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
    return {
      n: values.length,
      minMs: round(values[0]),
      medianaMs: round(median),
      maxMs: round(values[values.length - 1])
    };
  };

  return {
    muestras: samples.length,
    ready: stats('readyMs'),
    health: stats('healthMs'),
    login: stats('loginMs'),
    loginPage: stats('loginPageMs'),
    instrumentation: stats('instrumentationMs')
  };
}

function formatRange(stat) {
  if (!stat) return '—';
  return `${stat.medianaMs} [${stat.minMs}-${stat.maxMs}]`;
}

async function runSample(tipo, corrida) {
  if (tipo === 'frio') {
    await waitForFreePort(PORT);
    fs.rmSync(NEXT_DIR, { recursive: true, force: true });
  }

  const log = createLogTail();
  let readyAt = null;
  let nextReadyMs = null;
  let instrumentationAt = null;
  let healthPromise = null;
  let cancelled = false;
  const startedAt = Date.now();

  console.log(`\n▶ ${tipo} ${corrida}/${tipo === 'frio' ? COLD_RUNS : WARM_RUNS}`);

  const child = spawn(process.execPath, ['scripts/dev-lan-auto.js'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      PORT: String(PORT),
      DASHBOARD_WARMUP: '0',
      NEXT_TELEMETRY_DISABLED: '1'
    }
  });

  const onData = chunk => {
    log.push(chunk);
    const text = stripAnsi(chunk.toString());
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      if (!readyAt) {
        const match = line.match(/Ready in ([\d.]+)(ms|s)/i);
        if (match) {
          nextReadyMs = Number(match[1]) * (match[2].toLowerCase() === 's' ? 1000 : 1);
          readyAt = Date.now();
          console.log(`  ${line.trim()}`);
        }
      }
      if (!instrumentationAt && line.includes('[instrumentation]')) {
        instrumentationAt = Date.now();
        console.log(`  ${line.trim()}`);
      }
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  try {
    healthPromise = waitForRoute('/api/health', startedAt, () => cancelled);
    await waitFor(() => readyAt !== null, READY_TIMEOUT_MS, 'Ready', child);
    const health = await healthPromise;
    const login = await waitForRoute('/login', startedAt, () => cancelled);

    const instrumentationDeadline = Date.now() + 15_000;
    while (!instrumentationAt && Date.now() < instrumentationDeadline) {
      if (child.exitCode !== null) break;
      await sleep(100);
    }

    const sample = {
      tipo,
      corrida,
      readyMs: round(readyAt - startedAt),
      nextReadyMs: nextReadyMs === null ? null : round(nextReadyMs),
      healthMs: health.elapsedMs,
      healthStatus: health.status,
      loginMs: login.elapsedMs,
      loginStatus: login.status,
      loginPageMs: round(login.elapsedMs - health.elapsedMs),
      instrumentationMs: instrumentationAt === null ? null : round(instrumentationAt - startedAt)
    };

    console.log(
      `  ready ${sample.readyMs} ms · health ${sample.healthMs} ms · ` +
        `login ${sample.loginMs} ms (página ${sample.loginPageMs} ms) · ` +
        `instrumentación ${sample.instrumentationMs ?? '—'} ms`
    );
    return sample;
  } catch (error) {
    console.error(`  ✗ ${tipo} ${corrida}: ${error.message}`);
    const tail = log.tail();
    if (tail) console.error(`\n${tail}\n`);
    throw error;
  } finally {
    cancelled = true;
    if (healthPromise) void healthPromise.catch(() => undefined);
    killTree(child.pid);
    await waitForExit(child);
    await waitForFreePort(PORT).catch(() => undefined);
  }
}

function buildReport(samples) {
  const cold = samples.filter(sample => sample.tipo === 'frio');
  const warm = samples.filter(sample => sample.tipo === 'templado');
  const gitStatus = gitRaw('status', '--porcelain').split(/\r?\n/).filter(Boolean);

  return {
    fecha: new Date().toISOString(),
    commit: git('rev-parse', '--short', 'HEAD') || null,
    arbolSucio: gitStatus.length > 0,
    cambios: gitStatus,
    entorno: {
      node: process.version,
      next: JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/next/package.json'), 'utf8'))
        .version,
      plataforma: `${os.platform()} ${os.release()}`,
      arquitectura: os.arch(),
      cpu: os.cpus()[0]?.model ?? 'desconocido',
      nucleos: os.cpus().length,
      memoriaGB: round(os.totalmem() / 1024 ** 3)
    },
    metodo: {
      comando: 'node scripts/dev-lan-auto.js',
      warmup: 'DASHBOARD_WARMUP=0',
      frio: 'se elimina .next antes de cada corrida',
      templado: 'se conserva .next de la última corrida fría',
      puerto: PORT,
      metricas: {
        readyMs: 'spawn → línea "Ready in" de Next',
        healthMs: 'spawn → primer GET /api/health con HTTP 200',
        loginMs: 'spawn → primer GET /login con HTTP 200 (incluye health)',
        loginPageMs: 'loginMs - healthMs',
        instrumentationMs: 'spawn → primera línea [instrumentation]'
      },
      timeoutListoMs: READY_TIMEOUT_MS,
      timeoutRutaMs: ROUTE_TIMEOUT_MS,
      timeoutSolicitudMs: REQUEST_TIMEOUT_MS
    },
    muestras: samples,
    resumen: {
      frio: summarize(cold),
      templado: summarize(warm)
    }
  };
}

function printSummary(report) {
  const rows = [
    ['frío', report.resumen.frio],
    ['templado', report.resumen.templado]
  ].filter(([, summary]) => summary.muestras > 0);

  console.log('\nResumen (mediana [mín-máx] ms)');
  console.log(
    'Tipo       n   Ready                Health               Login                Página'
  );
  console.log('-'.repeat(92));
  for (const [label, summary] of rows) {
    console.log(
      `${label.padEnd(9)} ${String(summary.muestras).padStart(2)}   ` +
        `${formatRange(summary.ready).padEnd(20)} ` +
        `${formatRange(summary.health).padEnd(20)} ` +
        `${formatRange(summary.login).padEnd(20)} ` +
        formatRange(summary.loginPage)
    );
  }
  console.log(`\nEvidencia: ${path.relative(ROOT, OUTPUT)}`);
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'Uso: node scripts/benchmark-arranque.mjs [--cold 3] [--warm 2] [--port 3000] [--json ruta]'
    );
    return;
  }

  if (await canConnect(PORT)) {
    throw new Error(
      `El puerto ${PORT} está en uso. Detén el servidor de desarrollo antes de medir: ` +
        'el benchmark elimina .next.'
    );
  }

  console.log('Benchmark de arranque del Dashboard');
  console.log(`Puerto ${PORT} · frío ${COLD_RUNS} · templado ${WARM_RUNS} · warmup desactivado`);
  console.log('Las corridas frías eliminan .next; no dejes el servidor de desarrollo levantado.');

  const samples = [];
  for (let index = 1; index <= COLD_RUNS; index += 1) {
    samples.push(await runSample('frio', index));
  }
  for (let index = 1; index <= WARM_RUNS; index += 1) {
    samples.push(await runSample('templado', index));
  }

  const report = buildReport(samples);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  printSummary(report);
}

main().catch(error => {
  console.error(`\n✗ ${error.message}`);
  process.exitCode = 1;
});
