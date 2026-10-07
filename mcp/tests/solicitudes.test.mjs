import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { conSesion, sesionDelDashboard } from '../dist/api-client.js';
import { consultas, operaciones } from '../dist/tools/solicitudes.js';

test('solicitudes: confirmación, beneficiario, paginación y errores de negocio', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  const llamadas = [];
  let respuesta = { success: true, data: { id: 'sol-1', estado: 'pendiente' } };
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url: new URL(url), opciones });
    assert.equal(opciones.headers.Authorization, `Bearer ${token}`);
    return new Response(JSON.stringify(respuesta));
  };
  await conSesion(sesionDelDashboard(token, ''), async () => {
    const entrada = { usuario_id: 'empleado-1', monto: 200, motivo: 'Emergencia', operacion_id: randomUUID() };
    assert.equal((await operaciones.solicitar_anticipo_empleado.execute(entrada)).isError, true);
    assert.equal((await operaciones.solicitar_anticipo_empleado.execute({ ...entrada, confirmar: false })).isError, true);
    assert.equal(llamadas.length, 0);
    const result = await operaciones.solicitar_anticipo_empleado.execute({ ...entrada, confirmar: true });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent.resultado.estado, 'pendiente');
    const body = JSON.parse(llamadas[0].opciones.body);
    assert.equal(body.accion, 'crear_anticipo');
    assert.equal(body.usuario_id, 'empleado-1');
    assert.equal(body.operacion_id, entrada.operacion_id);
    assert.equal(llamadas[0].url.pathname, '/api/mcp/admin/solicitudes');
    await consultas.solicitudes_pendientes.execute({ tipo: 'devolucion', limit: 20, offset: 40 });
    assert.equal(llamadas[1].url.searchParams.get('offset'), '40');
    assert.equal(llamadas[1].url.searchParams.get('tipo'), 'devolucion');
    assert.equal((await consultas.solicitudes_pendientes.execute({ limit: 51 })).isError, true);
    assert.equal(llamadas.length, 2);
    respuesta = { success: false, message: 'Saldo insuficiente' };
    const error = await operaciones.solicitar_devolucion_cliente.execute({ cliente_id: 'cliente-1', monto: 500, motivo: 'Devolución', operacion_id: randomUUID(), confirmar: true });
    assert.equal(error.isError, true);
    assert.match(error.content[0].text, /Saldo insuficiente/);
  });
});

test('respuestas grandes de solicitudes limitan ambos canales', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  const data = { grupos: [{ items: [{ motivo: 'a'.repeat(25000) }], total: 1, hay_mas: false }] };
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data }));
  const result = await conSesion(sesionDelDashboard(token, ''), () => consultas.solicitudes_pendientes.execute({}));
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  assert.equal(result.structuredContent.resultado, null);
  assert.ok(result.content[0].text.length < 20000);
});
