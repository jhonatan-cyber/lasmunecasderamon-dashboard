import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { conSesion, sesionDelDashboard } from '../dist/api-client.js';
import { herramientas } from '../dist/tools/operaciones.js';

test('cobrar_cuenta: confirmación, operacion_id y cabecera x-idempotency-key', async t => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const token = `header.${Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64url')}.signature`;
  const llamadas = [];
  let respuesta = { success: true, message: 'Cuenta cobrada exitosamente' };
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url: new URL(url), opciones });
    assert.equal(opciones.headers.Authorization, `Bearer ${token}`);
    return new Response(JSON.stringify(respuesta));
  };

  await conSesion(sesionDelDashboard(token, ''), async () => {
    const operacion = {
      id: 'cuenta-1',
      metodoPago: 'efectivo',
      montoFinal: 176000,
      propinaFinal: 16000,
      operacion_id: randomUUID()
    };

    // Sin confirmar y con clave inválida no debe salir un solo request.
    assert.equal((await herramientas.cobrar_cuenta.execute(operacion)).isError, true);
    assert.equal(
      (
        await herramientas.cobrar_cuenta.execute({ ...operacion, confirmar: true, operacion_id: 'no-es-uuid' })
      ).isError,
      true
    );
    assert.equal(
      (await herramientas.cobrar_cuenta.execute({ ...operacion, operacion_id: operacion.operacion_id, campo: 'x' }))
        .isError,
      true
    );
    assert.equal(llamadas.length, 0);

    const cobro = await herramientas.cobrar_cuenta.execute({ ...operacion, confirmar: true });
    assert.equal(cobro.isError, undefined);
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].url.pathname, '/api/cuentas/cuenta-1/cobrar');
    assert.equal(llamadas[0].opciones.headers['x-idempotency-key'], operacion.operacion_id);
    const cuerpo = JSON.parse(llamadas[0].opciones.body);
    assert.equal(cuerpo.metodoPago, 'efectivo');
    assert.equal(cuerpo.montoFinal, 176000);
    assert.equal(cuerpo.propinaFinal, 16000);

    // El reintento manda la MISMA clave: el backend replica en vez de cobrar otra vez.
    const reintento = await herramientas.cobrar_cuenta.execute({ ...operacion, confirmar: true });
    assert.equal(reintento.isError, undefined);
    assert.equal(llamadas.length, 2);
    assert.equal(llamadas[1].opciones.headers['x-idempotency-key'], operacion.operacion_id);
    assert.deepEqual(JSON.parse(llamadas[1].opciones.body), cuerpo);

    // Respuesta en curso (409 del backend por idempotencia) llega como error, sin reintentar sola.
    respuesta = {
      success: false,
      code: 'IDEMPOTENCY_PENDIENTE',
      message: 'Esta operación ya está en curso'
    };
    const enCurso = await herramientas.cobrar_cuenta.execute({ ...operacion, confirmar: true });
    assert.equal(enCurso.isError, true);
    assert.match(enCurso.content[0].text, /en curso/);
    assert.equal(llamadas.length, 3);
  });
});
