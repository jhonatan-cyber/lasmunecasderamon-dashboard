import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transporte = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  env: process.env
});
const cliente = new Client({ name: 'humo', version: '0.0.0' });
await cliente.connect(transporte);

const { tools } = await cliente.listTools();
console.log('tools:', tools.length);
for (const t of tools) console.log(' -', t.name);

console.log('\n--- call check_limites ---');
const r = await cliente.callTool({ name: 'check_limites', arguments: {} });
for (const c of r.content ?? []) console.log(c.text?.slice(0, 400));

console.log('\n--- call verificar_conexion (dashboard probablemente apagado) ---');
const v = await cliente.callTool({ name: 'verificar_conexion', arguments: {} });
for (const c of v.content ?? []) console.log(c.text?.slice(0, 300));

await cliente.close();
process.exit(0);
