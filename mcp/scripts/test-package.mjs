import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const archive = resolve(process.argv[2] ?? 'releases/lasmunecas-mcp-0.1.0.tgz');
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Ejecuta esta prueba mediante npm run test:package -- ruta-al-paquete.tgz');
const root = await mkdtemp(join(tmpdir(), 'lasmunecas-installed-'));
let client;
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
    env: { ...process.env, MCP_ENABLE_DEV_TOOLS: '0', MCP_EMAIL: '', MCP_PASSWORD: '' }
  }));
  const { tools } = await client.listTools();
  assert.equal(tools.length, 12);
  const result = await client.callTool({ name: 'verificar_conexion', arguments: {} });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.autenticacion.error.codigo, 'CREDENCIALES_FALTANTES');
  console.log('Paquete instalado fuera del repositorio: 12 herramientas, stdio y diagnóstico OK.');
} finally {
  if (client) await client.close();
  await rm(root, { recursive: true, force: true });
}
