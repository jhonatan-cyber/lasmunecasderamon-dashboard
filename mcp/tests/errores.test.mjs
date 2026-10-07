import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../dist/config.js';
import { conSesion, sesionDelDashboard } from '../dist/api-client.js';
import { herramientas } from '../dist/tools/consultas.js';

const token = `header.${Buffer.from(
  JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
).toString('base64url')}.firma`;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

function conFetch(t, plan) {
  const original = globalThis.fetch;
  const llamadas = [];
  t.after(() => {
    globalThis.fetch = original;
    config.reintentoBaseMs = 250;
    config.reintentos = 3;
  });
  config.reintentoBaseMs = 0; // sin esperas reales: el backoff se prueba por cantidad de intentos
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url: new URL(url), opciones });
    return plan(llamadas.length, url, opciones);
  };
  return llamadas;
}

test('cada error lleva codigo, estado, mensaje y siguiente paso', async t => {
  const llamadas = conFetch(t, () => json({ message: 'Sin permiso' }, 403));

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const r = await herramientas.listar_ventas.execute({ limit: 1 });
    assert.equal(r.isError, true);
    // El texto es JSON parseable, igual que los resultados de éxito.
    const { error } = JSON.parse(r.content[0].text);
    assert.equal(error.codigo, 'PERMISOS_INSUFICIENTES');
    assert.equal(error.estado, 403);
    assert.match(error.mensaje, /403/);
    assert.ok(error.siguientePaso.length > 0);
    assert.deepEqual(r.structuredContent.error, error);
    assert.equal(llamadas.length, 1, 'un 403 no se reintenta');
  });
});

test('el código de negocio del backend viaja en el detalle', async t => {
  conFetch(t, () =>
    json({ success: false, code: 'IDEMPOTENCY_PENDIENTE', message: 'Operación en curso' }, 409)
  );

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const r = await herramientas.estado_caja.execute();
    assert.equal(r.isError, true);
    const { error } = JSON.parse(r.content[0].text);
    assert.equal(error.estado, 409);
    assert.equal(error.codigoNegocio, 'IDEMPOTENCY_PENDIENTE');
    assert.match(error.mensaje, /Operación en curso/);
    // El paso específico manda sobre el genérico: ni reintentar ni cambiar de clave.
    assert.match(error.siguientePaso, /No reintentes con otra clave/);
    assert.match(error.siguientePaso, /consulta el estado/);
  });
});

test('errores que no son de red también explican el siguiente paso', async t => {
  conFetch(t, () => json({ success: true, data: [] }));

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const invalida = await herramientas.auditoria_reciente.execute({ limit: 0 });
    assert.equal(invalida.isError, true);
    assert.equal(JSON.parse(invalida.content[0].text).error.codigo, 'ENTRADA_INVALIDA');

    const incompleta = await herramientas.reporte_ventas.execute({ period: 'custom' });
    assert.equal(incompleta.isError, true);
    const error = JSON.parse(incompleta.content[0].text).error;
    assert.equal(error.codigo, 'ERROR_HERRAMIENTA');
    assert.equal(error.estado, null);
    assert.match(error.mensaje, /startDate y endDate/);
    assert.ok(error.siguientePaso.length > 0);
  });
});

test('GET reintenta con backoff ante errores transitorios', async t => {
  const llamadas = conFetch(t, n =>
    n < 3 ? json({ message: 'calentando' }, 503) : json({ success: true, data: { ventas: [] } })
  );

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const r = await herramientas.resumen_dashboard.execute();
    assert.equal(r.isError, undefined);
    assert.deepEqual(r.structuredContent.resultado, { ventas: [] });
    assert.equal(llamadas.length, 3, 'dos 503 y un 200');
  });
});

test('GET agota los intentos y devuelve el error de red original', async t => {
  const llamadas = conFetch(t, () => {
    throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
  });
  config.reintentos = 3;

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const r = await herramientas.estado_caja.execute();
    assert.equal(r.isError, true);
    const { error } = JSON.parse(r.content[0].text);
    assert.equal(error.codigo, 'CONEXION_RECHAZADA');
    assert.equal(error.estado, null);
    assert.match(error.siguientePaso, /MCP_BASE_URL/);
    assert.equal(llamadas.length, 3, 'exactamente MCP_REINTENTOS intentos');
  });
});

test('POST nunca reintenta', async t => {
  const llamadas = conFetch(t, () => json({ message: 'boom' }, 500));
  const { api } = await import('../dist/api-client.js');

  await conSesion(sesionDelDashboard(token, ''), async () => {
    await assert.rejects(
      () => api('POST', '/api/cuentas/x/cobrar', { cuerpo: {} }),
      /falló \(500\)/
    );
    assert.equal(llamadas.length, 1, 'un POST con 500 no se repite');
  });
});

test('verificar_conexion explica también código, estado y siguiente paso', async t => {
  conFetch(t, () => {
    throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
  });

  const r = await conSesion(sesionDelDashboard(token, ''), () =>
    herramientas.verificar_conexion.execute()
  );
  assert.equal(r.isError, true);
  for (const rama of [r.structuredContent.ping.error, r.structuredContent.autenticacion.error]) {
    assert.equal(rama.codigo, 'CONEXION_RECHAZADA');
    assert.equal(rama.estado, null);
    assert.ok(rama.mensaje.length > 0);
    assert.match(rama.siguientePaso, /MCP_BASE_URL/);
  }
  // El diagnóstico crudo sigue coincidiendo con su texto.
  assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent);
});

test('MCP_REINTENTOS=1 desactiva los reintentos', async t => {
  const llamadas = conFetch(t, () => json({ message: 'calentando' }, 503));
  config.reintentos = 1;

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const r = await herramientas.resumen_dashboard.execute();
    assert.equal(r.isError, true);
    assert.equal(JSON.parse(r.content[0].text).error.estado, 503);
    assert.equal(llamadas.length, 1);
  });
});
