import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));

function env(nombre: string): string | undefined {
  const v = process.env[nombre];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

export const config = {
  desarrollo: env('MCP_ENABLE_DEV_TOOLS') === '1',
  baseUrl: (env('MCP_BASE_URL') ?? 'http://127.0.0.1:3000').replace(/\/+$/, ''),
  email: env('MCP_EMAIL'),
  password: env('MCP_PASSWORD'),
  codigo: env('MCP_CODIGO'),
  // dist/index.js -> mcp -> raíz del repo. Sirve para las herramientas de desarrollo.
  repoRaiz: env('MCP_REPO_ROOT') ?? resolve(aqui, '..', '..'),
  tiempoRedMs: Number(env('MCP_TIMEOUT_MS') ?? 20000)
};

if (config.desarrollo && !env('MCP_REPO_ROOT')) {
  throw new Error(
    'Para habilitar herramientas de desarrollo, define MCP_REPO_ROOT con la ruta del dashboard.'
  );
}
