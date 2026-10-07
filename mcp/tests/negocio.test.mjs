import test from 'node:test';
import assert from 'node:assert/strict';
import { conSesion, sesionDelDashboard } from '../dist/api-client.js';
import { herramientas } from '../dist/tools/consultas.js';

const token = `header.${Buffer.from(
  JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
).toString('base64url')}.firma`;

function conFetch(t, respuesta = { success: true, data: [] }) {
  const original = globalThis.fetch;
  const llamadas = [];
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url: new URL(url), opciones });
    return new Response(JSON.stringify(respuesta));
  };
  return llamadas;
}

test('cada herramienta nueva llama a su endpoint con los parámetros correctos', async t => {
  const llamadas = conFetch(t);

  await conSesion(sesionDelDashboard(token, ''), async () => {
    await herramientas.buscar_producto.execute({ term: 'champán', category_id: 'cat-1' });
    await herramientas.buscar_producto.execute({ para_venta: true });
    await herramientas.detalle_producto.execute({ id: 'prod-1' });
    await herramientas.listar_transferencias.execute({});
    await herramientas.transferencias_pendientes.execute({});
    await herramientas.historial_cajas.execute({ con_resumen: true });
    await herramientas.historial_cajas.execute({});
    await herramientas.reporte_ventas.execute({ period: 'month' });
    await herramientas.auditoria_reciente.execute({ limit: 25 });

    const rutas = llamadas.map(l => `${l.url.pathname}${l.url.search}`);
    assert.deepEqual(rutas, [
      '/api/products?term=champ%C3%A1n&category_id=cat-1',
      '/api/products?for_sale=1',
      '/api/products?id=prod-1',
      '/api/transfers',
      '/api/transfers/pending',
      '/api/cashregister?resumen=1',
      '/api/cashregister',
      '/api/reports/sales?period=month',
      '/api/audit-logs?limit=25'
    ]);
  });
});

test('las nuevas herramientas devuelven sobre estructurado y texto JSON parseable', async t => {
  const datos = { ventas: 12 };
  const llamadas = conFetch(t, { success: true, data: datos });

  await conSesion(sesionDelDashboard(token, ''), async () => {
    for (const [nombre, args] of [
      ['buscar_producto', {}],
      ['detalle_producto', { id: 'p-1' }],
      ['listar_transferencias', {}],
      ['transferencias_pendientes', {}],
      ['historial_cajas', {}],
      ['reporte_ventas', {}],
      ['auditoria_reciente', {}]
    ]) {
      const r = await herramientas[nombre].execute(args);
      assert.equal(r.isError, undefined, nombre);
      assert.deepEqual(r.structuredContent.resultado, datos, nombre);
      assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent, nombre);
      // Las anotaciones y el esquema viven en la definición, no en el resultado.
      assert.equal(herramientas[nombre].annotations.readOnlyHint, true, nombre);
      assert.equal(herramientas[nombre].annotations.destructiveHint, false, nombre);
      assert.ok(herramientas[nombre].outputSchema, `${nombre}: falta outputSchema`);
    }
    assert.equal(llamadas.length, 7);
  });
});

test('validaciones de reporte_ventas y auditoria_reciente', async t => {
  const llamadas = conFetch(t);

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const customIncompleto = await herramientas.reporte_ventas.execute({ period: 'custom' });
    assert.equal(customIncompleto.isError, true);
    assert.match(customIncompleto.content[0].text, /startDate y endDate/);

    const rangoInvertido = await herramientas.reporte_ventas.execute({
      period: 'custom',
      startDate: '2026-10-06',
      endDate: '2026-10-01'
    });
    assert.equal(rangoInvertido.isError, true);
    assert.match(rangoInvertido.content[0].text, /anterior o igual/);

    const fechaMala = await herramientas.reporte_ventas.execute({ period: 'custom', startDate: '06-10-2026' });
    assert.equal(fechaMala.isError, true);

    for (const limit of [0, 201, 3.5]) {
      const r = await herramientas.auditoria_reciente.execute({ limit });
      assert.equal(r.isError, true, `limit ${limit}`);
    }

    // Ninguna de las entradas inválidas llegó al backend.
    assert.equal(llamadas.length, 0);
  });
});

test('reporte_ventas por defecto pide period today', async t => {
  const llamadas = conFetch(t);

  await conSesion(sesionDelDashboard(token, ''), async () => {
    await herramientas.reporte_ventas.execute({});
    assert.equal(llamadas[0].url.searchParams.get('period'), 'today');
  });
});
