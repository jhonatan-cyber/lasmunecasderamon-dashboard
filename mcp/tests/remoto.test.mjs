import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { backendAdministrador } from './helpers/backend.mjs';

test('modo remoto no registra herramientas de desarrollo', async t => {
  const backend = await backendAdministrador(t);
  const client = new Client({ name: 'remote-test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
    env: { ...process.env, ...backend.env, MCP_ENABLE_DEV_TOOLS: '0' }
  }));
  const { tools } = await client.listTools();
  assert.equal(tools.length, 33);
  assert.ok(tools.some(t => t.name === 'verificar_conexion'));
  for (const name of ['check_limites', 'diagnostico_arquitectura', 'typecheck', 'test_unit']) {
    assert.ok(!tools.some(t => t.name === name));
  }
  const rejected = await client.callTool({ name: 'typecheck', arguments: {} });
  assert.equal(rejected.isError, true);
  backend.setRole('Cajero');
  const blocked = await client.callTool({ name: 'resumen_dashboard', arguments: {} });
  assert.equal(blocked.isError, true);
  assert.match(blocked.content[0].text, /exclusivo para administradores/);
});

test('stdio rechaza conexión de un usuario no administrador', async t => {
  const backend = await backendAdministrador(t);
  backend.setRole('Cajero');
  const client = new Client({ name: 'denied', version: '1' });
  t.after(() => client.close());
  await assert.rejects(client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
    env: { ...process.env, ...backend.env, MCP_ENABLE_DEV_TOOLS: '0' }
  })));
});
