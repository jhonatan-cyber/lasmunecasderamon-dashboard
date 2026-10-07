import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { paginar } from '../dist/paginacion.js';
import { herramientas } from '../dist/tools/consultas.js';
import { DashboardOAuthProvider } from '../dist/oauth/provider.js';
import { OAuthStore } from '../dist/oauth/store.js';
import { crearAppHttp } from '../dist/http-app.js';
import { conSesion, sesionDelDashboard } from '../dist/api-client.js';
import { consultas as solicitudes } from '../dist/tools/solicitudes.js';

test('paginación permite recuperar filas y pagina cada grupo de transferencias', () => {
  const filas = Array.from({ length: 45 }, (_, id) => ({ id }));
  const paginas = [0, 20, 40].map(offset => paginar(filas, { offset }));
  assert.deepEqual(paginas.flatMap(p => p.items), filas);
  assert.deepEqual(paginas.map(p => p.hay_mas), [true, true, false]);
  const grupos = paginar({ items: filas, history: filas }, { limit: 2, offset: 3 }, ['items', 'history']);
  assert.deepEqual(grupos.items.items, filas.slice(3, 5));
  assert.equal(grupos.history.total, 45);
});

test('las herramientas aplican paginación sin enviar parámetros ignorados al backend', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const filas = Array.from({ length: 45 }, (_, id) => ({ id, name: `Empleado ${id}` }));
  globalThis.fetch = async url => {
    const destino = new URL(url);
    assert.equal(destino.searchParams.has('offset'), false);
    const data = destino.pathname === '/api/transfers' ? { items: filas, history: filas } : filas;
    return new Response(JSON.stringify({ success: true, data }));
  };
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.firma`;
  await conSesion(sesionDelDashboard(token, ''), async () => {
    for (const nombre of ['listar_cuentas', 'buscar_producto', 'transferencias_pendientes', 'historial_cajas']) {
      const r = await herramientas[nombre].execute({ offset: 40, limit: 10 });
      assert.deepEqual(r.structuredContent.resultado.items, filas.slice(40), nombre);
      assert.equal(r.structuredContent.resultado.hay_mas, false);
      assert.equal((await herramientas[nombre].execute({ limit: 101 })).isError, true);
    }
    const transferencias = await herramientas.listar_transferencias.execute({ limit: 2, offset: 3 });
    assert.deepEqual(transferencias.structuredContent.resultado.history.items, filas.slice(3, 5));
    const personal = await solicitudes.buscar_personal.execute({ search: 'Empleado 4', limit: 2 });
    assert.equal(personal.structuredContent.resultado.total, 6);
    assert.deepEqual(personal.structuredContent.resultado.items.map(u => u.id), [4, 40]);
  });
});

test('fechas imposibles y rangos invertidos no llegan al backend', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = () => { throw new Error('No debe consultar el backend'); };
  for (const nombre of ['agenda_rango', 'reporte_ventas']) {
    for (const fechas of [
      { startDate: '2026-02-31', endDate: '2026-03-01' },
      { startDate: '2026-10-07', endDate: '2026-10-01' }
    ]) {
      const r = await herramientas[nombre].execute({ ...fechas, ...(nombre === 'reporte_ventas' ? { period: 'custom' } : {}) });
      assert.equal(r.isError, true);
      assert.doesNotMatch(r.content[0].text, /No debe consultar/);
    }
  }
});

test('timeout inválido falla al cargar configuración', () => {
  for (const valor of ['abc', '0', '-1', '1.5', 'Infinity', '300001']) {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', "import './dist/config.js'"], {
      cwd: new URL('..', import.meta.url), env: { ...process.env, MCP_TIMEOUT_MS: valor }, encoding: 'utf8'
    });
    assert.notEqual(r.status, 0, valor);
    assert.match(r.stderr, /MCP_TIMEOUT_MS/);
  }
});

test('la limpieza de caché conserva sesiones vigentes y elimina expiradas', () => {
  const store = new OAuthStore(':memory:', randomBytes(32));
  try {
    const url = new URL('http://127.0.0.1:3001');
    const provider = new DashboardOAuthProvider(store, url, new URL('/mcp', url), url);
    const now = Date.now();
    const sesion = { token: 'token', refreshToken: 'refresh', expiraEn: now + 100000 };
    for (const [id, expires] of [['expirada', now + 1000], ['vigente', now + 100000]]) {
      store.put('grant', id, { sesion, expires }, expires);
      provider.session(id);
    }
    provider.limpiarSesiones(now + 1001);
    assert.equal(provider.sesiones.has('expirada'), false);
    assert.equal(provider.sesiones.has('vigente'), true);
  } finally { store.close(); }
});

test('proxy confiable separa usuarios; cabecera falsificada sin confianza no evade límite', async t => {
  for (const trustedProxies of [[], ['loopback']]) {
    let application;
    const server = createServer((req, res) => application.app(req, res));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const issuer = new URL(`http://127.0.0.1:${server.address().port}`);
    application = crearAppHttp({ issuer, dashboard: issuer, database: ':memory:', key: randomBytes(32), trustedProxies });
    try {
      const post = ip => fetch(new URL('/oauth/consent', issuer), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: '{}'
      });
      for (let i = 0; i < 20; i++) assert.equal((await post('198.51.100.1')).status, 400);
      const blocked = await post('198.51.100.1');
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
      assert.equal((await post('198.51.100.2')).status, trustedProxies.length ? 400 : 429);
    } finally {
      await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
      application.store.close();
    }
  }
});
