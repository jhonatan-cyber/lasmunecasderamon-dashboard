import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { backendAdministrador } from './helpers/backend.mjs';
import { conSesion, sesionDelDashboard } from '../dist/api-client.js';
import { herramientas as consultas } from '../dist/tools/consultas.js';
import { herramientas as operacionesCobro } from '../dist/tools/operaciones.js';
import { consultas as bandeja, operaciones as solicitudes } from '../dist/tools/solicitudes.js';
import { herramientas as desarrollo } from '../dist/tools/desarrollo.js';

const todasLasHerramientas = { ...consultas, ...operacionesCobro, ...bandeja, ...solicitudes };
const desarrolloHerramientas = { ...desarrollo };
const token = `header.${Buffer.from(
  JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
).toString('base64url')}.firma`;

test('las 33 herramientas exportadas declaran outputSchema', () => {
  const nombres = Object.keys(todasLasHerramientas);
  assert.equal(nombres.length, 33);
  const sinEsquema = nombres.filter(nombre => !todasLasHerramientas[nombre].outputSchema);
  assert.deepEqual(sinEsquema, []);

  // Las 4 de desarrollo (sólo con MCP_ENABLE_DEV_TOOLS=1) también: el SDK exige
  // structuredContent a quien publica esquema, y estas las devuelven.
  assert.equal(Object.keys(desarrolloHerramientas).length, 4);
  assert.deepEqual(
    Object.keys(desarrolloHerramientas).filter(nombre => !desarrolloHerramientas[nombre].outputSchema),
    []
  );
});

test('por protocolo: outputSchema publicado y structuredContent validado por el SDK', async t => {
  const backend = await backendAdministrador(t);
  const client = new Client({ name: 'responses-test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
      env: { ...process.env, ...backend.env, MCP_ENABLE_DEV_TOOLS: '0' }
    })
  );

  const { tools } = await client.listTools();
  assert.equal(tools.length, 33);
  assert.deepEqual(
    tools.filter(tool => !tool.outputSchema).map(tool => tool.name),
    []
  );

  // El SDK valida el structuredContent contra el outputSchema publicado: si no
  // cumple el sobre, la llamada revienta aquí con InvalidParams.
  const r = await client.callTool({ name: 'resumen_dashboard', arguments: {} });
  assert.notEqual(r.isError, true);
  assert.ok('resultado' in r.structuredContent, 'falta structuredContent.resultado');
  assert.deepEqual(JSON.parse(r.content[0].text).resultado, r.structuredContent.resultado);
});

test('las consultas devuelven structuredContent.resultado además del texto', async t => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const datos = { ventas: [{ codigo: 'V1', total: 176000 }] };
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: datos }));

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const r = await consultas.listar_ventas.execute({ limit: 1 });
    assert.equal(r.isError, undefined);
    assert.deepEqual(r.structuredContent.resultado, datos);
    assert.equal(r.structuredContent.truncado, undefined);
    assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent);
  });
});

test('las respuestas grandes limitan ambos canales sin fingir datos completos', async () => {
  const { envolver } = await import('../dist/formato.js');
  for (const nota of ['x'.repeat(50000), '\"\\'.repeat(20000)]) {
    const r = envolver({ nota });
    assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent);
    assert.equal(r.structuredContent.resultado, null);
    assert.equal(r.structuredContent.truncado.limite, 20000);
    assert.match(r.structuredContent.aviso, /limit/);
    assert.ok(r.content[0].text.length < 20000);
    assert.ok(JSON.stringify(r.structuredContent).length < 20000);
  }
});

test('acotar devuelve JSON válido incluso sin representación', async () => {
  const { acotar, envolver } = await import('../dist/formato.js');
  assert.equal(JSON.parse(acotar(undefined)), null);
  // Un texto corto pasa tal cual: no era JSON que romperse.
  assert.equal(acotar('salida libre'), 'salida libre');
  const enorme = 'a'.repeat(30000);
  const sobre = JSON.parse(acotar(enorme));
  assert.equal(sobre.truncado, true);
  assert.equal(sobre.parcial.length, 20000);
  assert.deepEqual(JSON.parse(envolver(undefined).content[0].text), { resultado: null });
});
