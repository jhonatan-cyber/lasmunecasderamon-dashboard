import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('estado de comandos a través del protocolo MCP', async t => {
  const root = await mkdtemp(join(tmpdir(), 'lasmunecas-mcp-test-'));
  const client = new Client({ name: 'regression', version: '1.0.0' });
  t.after(async () => { await client.close(); await rm(root, { recursive: true, force: true }); });
  const scripts = ['scripts/arquitectura/limites.mjs', 'scripts/arquitectura/analisis.mjs', 'node_modules/typescript/bin/tsc', 'node_modules/vitest/vitest.mjs'];
  for (const path of scripts) await mkdir(dirname(join(root, path)), { recursive: true });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
    env: { ...process.env, MCP_REPO_ROOT: root, MCP_ENABLE_DEV_TOOLS: '1' }
  }));
  assert.equal((await client.listTools()).tools.length, 16);
  for (const code of [0, 7]) {
    for (const path of scripts) await writeFile(join(root, path), `console.log('diagnostico-prueba'); process.exit(${code});`);
    for (const name of ['check_limites', 'diagnostico_arquitectura', 'typecheck', 'test_unit']) {
      await t.test(`${name}: salida ${code}`, async () => {
        const r = await client.callTool({ name, arguments: {} });
        assert.equal(r.isError === true, code !== 0);
        assert.match(r.content[0].text, /diagnostico-prueba/);
        if (code) assert.match(r.content[0].text, /código 7/);
      });
    }
  }
});
