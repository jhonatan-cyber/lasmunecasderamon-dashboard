import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));

function env(nombre: string): string | undefined {
  const v = process.env[nombre];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

/** Entero con mínimo; cualquier basura cae en el valor por defecto (NaN incluido). */
function entero(valor: string | undefined, porDefecto: number, min: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.max(min, Math.trunc(n)) : porDefecto;
}

export const config = {
  desarrollo: env('MCP_ENABLE_DEV_TOOLS') === '1',
  baseUrl: (env('MCP_BASE_URL') ?? 'http://127.0.0.1:3000').replace(/\/+$/, ''),
  email: env('MCP_EMAIL'),
  password: env('MCP_PASSWORD'),
  codigo: env('MCP_CODIGO'),
  // dist/index.js -> mcp -> raíz del repo. Sirve para las herramientas de desarrollo.
  repoRaiz: env('MCP_REPO_ROOT') ?? resolve(aqui, '..', '..'),
  tiempoRedMs: tiempoRed(),
  /** Intentos máximos por petición GET (1 = sin reintentos). */
  reintentos: entero(env('MCP_REINTENTOS'), 3, 1),
  /** Espera base del backoff exponencial con jitter, en ms. */
  reintentoBaseMs: entero(env('MCP_RETRY_MS'), 250, 0)
};

function tiempoRed(): number {
  const valor = Number(env('MCP_TIMEOUT_MS') ?? 20000);
  if (!Number.isSafeInteger(valor) || valor < 1 || valor > 300000)
    throw new Error('MCP_TIMEOUT_MS debe ser un entero entre 1 y 300000.');
  return valor;
}

if (config.desarrollo && !env('MCP_REPO_ROOT')) {
  throw new Error(
    'Para habilitar herramientas de desarrollo, define MCP_REPO_ROOT con la ruta del dashboard.'
  );
}
