import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('modo remoto no registra herramientas de desarrollo', async t => {
  const client = new Client({ name: 'remote-test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
    env: { ...process.env, MCP_ENABLE_DEV_TOOLS: '0' }
  }));
  const { tools } = await client.listTools();
  assert.equal(tools.length, 12);
  assert.ok(tools.some(t => t.name === 'verificar_conexion'));
  for (const name of ['check_limites', 'diagnostico_arquitectura', 'typecheck', 'test_unit']) {
    assert.ok(!tools.some(t => t.name === name));
  }
  const rejected = await client.callTool({ name: 'typecheck', arguments: {} });
  assert.equal(rejected.isError, true);
});
