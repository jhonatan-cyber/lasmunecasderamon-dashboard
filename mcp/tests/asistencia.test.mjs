import test from 'node:test';
import assert from 'node:assert/strict';
import { conSesion, sesionDelDashboard } from '../dist/api-client.js';
import { herramientas } from '../dist/tools/consultas.js';

test('ranking usa sesión y fechas inclusivas; rechaza rango invertido', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.firma`;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(new URL(url));
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    return new Response(JSON.stringify({ success: true, data: { mas_asistencias: [], mas_faltas: [] } }));
  };
  await conSesion(sesionDelDashboard(token, ''), async () => {
    assert.notEqual((await herramientas.ranking_asistencia.execute({})).isError, true);
    assert.equal(calls[0].pathname, '/api/attendance/ranking');
    assert.equal(calls[0].search, '');
    await herramientas.ranking_asistencia.execute({ startDate: '2026-01-01', endDate: '2026-10-06' });
    assert.equal(calls[1].searchParams.get('startDate'), '2026-01-01');
    assert.equal(calls[1].searchParams.get('endDate'), '2026-10-06');
    assert.equal((await herramientas.ranking_asistencia.execute({ startDate: '2026-10-06', endDate: '2026-01-01' })).isError, true);
    assert.equal(calls.length, 2);
  });
});
