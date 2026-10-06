import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../dist/config.js';
import { api } from '../dist/api-client.js';
import { herramientas } from '../dist/tools/consultas.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const token = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.firma`;
const login = () => json({ token: token(0) });

test('diagnóstico y autenticación con backend simulado', async t => {
  const original = { ...config };
  const originalFetch = globalThis.fetch;
  t.after(() => { Object.assign(config, original); globalThis.fetch = originalFetch; });
  config.email = 'prueba@example.test';
  config.password = 'solo-prueba';
  config.baseUrl = 'http://dashboard.test';

  await t.test('conserva ping cuando faltan credenciales', async () => {
    config.email = undefined;
    globalThis.fetch = async () => json({ status: 'ok' });
    const r = await herramientas.verificar_conexion.execute();
    assert.equal(r.isError, true);
    assert.equal(r.structuredContent.ping.ok, true);
    assert.equal(r.structuredContent.autenticacion.error.codigo, 'CREDENCIALES_FALTANTES');
    config.email = 'prueba@example.test';
  });
  for (const [name, error, code] of [
    ['servidor apagado', new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }), 'CONEXION_RECHAZADA'],
    ['timeout', new DOMException('timeout', 'TimeoutError'), 'TIMEOUT'],
    ['error de red', new TypeError('fetch failed'), 'ERROR_RED']
  ]) {
    await t.test(name, async () => {
      globalThis.fetch = async () => { throw error; };
      const r = await herramientas.verificar_conexion.execute();
      assert.equal(r.isError, true);
      assert.equal(r.structuredContent.ping.error.codigo, code);
      assert.equal(r.structuredContent.autenticacion.error.codigo, code);
    });
  }
  await t.test('credenciales inválidas', async () => {
    globalThis.fetch = async url => new URL(url).pathname === '/api/ping' ? json({ ok: true }) : json({ message: 'Login inválido' }, 401);
    const r = await herramientas.verificar_conexion.execute();
    assert.equal(r.structuredContent.ping.ok, true);
    assert.equal(r.structuredContent.autenticacion.error.codigo, 'CREDENCIALES_INVALIDAS');
  });
  await t.test('permisos insuficientes', async () => {
    globalThis.fetch = async url => {
      const path = new URL(url).pathname;
      return path === '/api/auth/login' ? login() : path === '/api/auth/me' ? json({ message: 'Sin permiso' }, 403) : json({ ok: true });
    };
    const r = await herramientas.verificar_conexion.execute();
    assert.equal(r.structuredContent.autenticacion.error.codigo, 'PERMISOS_INSUFICIENTES');
  });
  await t.test('ping HTTP fallido no impide validar autenticación', async () => {
    globalThis.fetch = async url => {
      const path = new URL(url).pathname;
      return path === '/api/auth/login' ? login() : path === '/api/ping' ? json({}, 503) : json({ id: 1 });
    };
    const r = await herramientas.verificar_conexion.execute();
    assert.equal(r.isError, true);
    assert.equal(r.structuredContent.ping.error.estado, 503);
    assert.equal(r.structuredContent.autenticacion.ok, true);
  });
  await t.test('respuesta inválida', async () => {
    globalThis.fetch = async () => new Response('<html>Error</html>');
    const r = await herramientas.verificar_conexion.execute();
    assert.equal(r.structuredContent.ping.error.codigo, 'RESPUESTA_INVALIDA');
  });
  await t.test('conexión correcta devuelve datos estructurados', async () => {
    globalThis.fetch = async url => new URL(url).pathname === '/api/auth/login' ? login() : json({ id: 1 });
    const r = await herramientas.verificar_conexion.execute();
    assert.notEqual(r.isError, true);
    assert.equal(r.structuredContent.ok, true);
    assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent);
  });
  await t.test('renueva token y rota refresh token', async () => {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      calls.push([path, options.headers]);
      if (path === '/api/auth/login') return json({ token: token(0), refreshToken: 'refresh-inicial' });
      if (path === '/api/auth/refresh') return json({ token: token(0), refreshToken: 'refresh-rotado' });
      return json({ success: true, data: { id: 1 } });
    };
    assert.deepEqual(await api('GET', '/api/auth/me'), { id: 1 });
    await api('GET', '/api/auth/me');
    await api('GET', '/api/auth/me');
    const refresh = calls.filter(([path]) => path === '/api/auth/refresh');
    assert.equal(refresh.length, 2);
    assert.equal(refresh[0][1]['x-refresh-token'], 'refresh-inicial');
    assert.equal(refresh[1][1]['x-refresh-token'], 'refresh-rotado');
  });
});
