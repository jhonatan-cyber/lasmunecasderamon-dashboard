import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';

const archive = resolve(process.argv[2] ?? 'releases/lasmunecas-mcp-0.2.0.tgz');
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Ejecuta esta prueba mediante npm run test:package -- ruta-al-paquete.tgz');
const root = await mkdtemp(join(tmpdir(), 'lasmunecas-installed-'));
let client;
const backend = createServer((_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  res.end(JSON.stringify(_req.url === '/api/auth/login' ? { success: true, token } : { success: true, data: { id: 'admin-test', role: 'Administrador' } }));
});
await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
try {
  await promisify(execFile)(process.execPath, [npmCli, 'install', '--prefix', root, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', archive], { windowsHide: true, timeout: 120000 });
  const packageRoot = join(root, 'node_modules', 'lasmunecas-mcp');
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(manifest.bin['lasmunecas-mcp'], 'dist/index.js');
  const sdk = join(root, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm', 'client');
  const { Client } = await import(pathToFileURL(join(sdk, 'index.js')).href);
  const { StdioClientTransport } = await import(pathToFileURL(join(sdk, 'stdio.js')).href);
  client = new Client({ name: 'installed-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [join(packageRoot, 'dist', 'index.js')],
    cwd: root,
    env: { ...process.env, MCP_ENABLE_DEV_TOOLS: '0', MCP_EMAIL: 'admin@test', MCP_PASSWORD: 'test', MCP_BASE_URL: `http://127.0.0.1:${backend.address().port}` }
  }));
  const { tools } = await client.listTools();
  assert.equal(tools.length, 26);
  const result = await client.callTool({ name: 'verificar_conexion', arguments: {} });
  assert.notEqual(result.isError, true);
  assert.equal(result.structuredContent.autenticacion.ok, true);
  console.log('Paquete instalado fuera del repositorio: 26 herramientas, administrador, stdio y diagnóstico OK.');
} finally {
  if (client) await client.close();
  await new Promise(resolve => { backend.close(resolve); backend.closeAllConnections(); });
  await rm(root, { recursive: true, force: true });
}
