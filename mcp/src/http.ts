#!/usr/bin/env node
import { resolve } from 'node:path';
import { crearAppHttp } from './http-app.js';
import { config } from './config.js';

if (!process.env.MCP_PUBLIC_URL || !process.env.MCP_OAUTH_STORE_KEY) {
  throw new Error('Define MCP_PUBLIC_URL y MCP_OAUTH_STORE_KEY (32 bytes en base64).');
}
if (config.desarrollo)
  throw new Error('Las herramientas de desarrollo no se pueden publicar por HTTP.');
const port = Number(process.env.MCP_PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MCP_PORT inválido.');
const { app, store } = crearAppHttp({
  issuer: new URL(process.env.MCP_PUBLIC_URL),
  dashboard: new URL(config.baseUrl),
  database: resolve(process.env.MCP_OAUTH_DB ?? '.data/mcp-oauth.sqlite'),
  key: Buffer.from(process.env.MCP_OAUTH_STORE_KEY, 'base64'),
  trustedProxies: (process.env.MCP_TRUSTED_PROXIES ?? '').split(',').map(v => v.trim()).filter(Boolean),
  browserOrigins: (process.env.MCP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .filter(Boolean)
    .map(value => new URL(value.trim()).origin)
});
const server = app.listen(port, process.env.MCP_HOST ?? '127.0.0.1', () => {
  console.error(`[lasmunecas-mcp] OAuth + Streamable HTTP: ${process.env.MCP_PUBLIC_URL}/mcp`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () =>
    server.close(() => {
      store.close();
      process.exit(0);
    })
  );
}
