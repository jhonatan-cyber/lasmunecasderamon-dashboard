import { afterAll, expect, it } from 'vitest';
import db from '@/lib/database/db';
import { registrarCompra } from '@/modules/inventario/compras/servicio';
import { runRegistration } from '@/lib/api/registration';
import { createRegistrationFetch } from '@/lib/api/registrationFetch';

const products: string[] = [];
const keys: string[] = [];
afterAll(async () => {
  try {
    for (const product of products) {
      const { rows: compras } = await db.pool.query(
        'SELECT DISTINCT compra_id FROM detalle_compras WHERE producto_id=$1',
        [product]
      );
      await db.pool.query('DELETE FROM inventario_unidades WHERE producto_id=$1', [product]);
      await db.pool.query('DELETE FROM detalle_compras WHERE producto_id=$1', [product]);
      for (const compra of compras)
        await db.pool.query('DELETE FROM compras WHERE id=$1', [compra.compra_id]);
      await db.pool.query('DELETE FROM inventario_presentaciones WHERE producto_id=$1', [product]);
      await db.pool.query('DELETE FROM productos WHERE id_producto=$1', [product]);
    }
    for (const key of keys)
      await db.pool.query('DELETE FROM sync_operations WHERE id_cliente=$1', [key]);
  } finally {
    await db.pool.end();
    globalThis.__lasMunecasPgPool = undefined;
  }
});
async function fixture() {
  const product = crypto.randomUUID();
  const presentation = crypto.randomUUID();
  products.push(product);
  await db.pool.query(
    `INSERT INTO productos (id_producto,codigo,nombre,precio,comision,descripcion,fecha_crea)
    VALUES ($1,$2,'Test compra idempotente',10000,0,'Fixture propio',now())`,
    [product, product.slice(0, 20)]
  );
  await db.pool.query(
    `INSERT INTO inventario_presentaciones (id,producto_id,nombre,precio_venta,comision,ml_botella,fecha_crea)
    VALUES ($1,$2,'750 ml',10000,0,750,now())`,
    [presentation, product]
  );
  const { rows: users } = await db.pool.query('SELECT id_usuario FROM usuarios LIMIT 1');
  return {
    product,
    user: users[0].id_usuario as string,
    body: {
      detalles: [
        { producto_id: product, presentacion_id: presentation, cantidad: 3, precio_compra: 5000 }
      ]
    }
  };
}
async function assertStock(product: string, quantity: number, purchases: number) {
  const { rows } = await db.pool.query(
    `SELECT (SELECT count(*)::int FROM inventario_unidades WHERE producto_id=$1) AS unidades,
    (SELECT count(DISTINCT compra_id)::int FROM detalle_compras WHERE producto_id=$1) AS compras,
    stock_almacen FROM productos WHERE id_producto=$1`,
    [product]
  );
  expect(rows[0]).toEqual({ unidades: quantity, compras: purchases, stock_almacen: quantity });
}
it('dos solicitudes simultaneas y su reintento crean una compra y exactamente 3 unidades', async () => {
  const f = await fixture();
  const key = crypto.randomUUID();
  keys.push(key);
  const request = (nextKey = key) =>
    new Request('http://localhost/api/purchases', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-registration-key': nextKey },
      body: JSON.stringify(f.body)
    });
  let entered!: () => void;
  let release!: () => void;
  const started = new Promise<void>(resolve => {
    entered = resolve;
  });
  const wait = new Promise<void>(resolve => {
    release = resolve;
  });
  let executions = 0;
  const handler = async (req: Request) => {
    executions++;
    entered();
    await wait;
    return Response.json(
      { success: true, data: await registrarCompra(await req.json(), f.user) },
      { status: 201 }
    );
  };
  const a = runRegistration(request(), f.user, handler);
  await started;
  expect((await runRegistration(request(), f.user, handler)).status).toBe(409);
  release();
  const first = await a;
  expect(first.status).toBe(201);
  const replay = await runRegistration(request(), f.user, handler);
  expect(replay.status).toBe(201);
  expect(await replay.json()).toEqual(await first.json());
  expect(executions).toBe(1);
  await assertStock(f.product, 3, 1);
  const newKey = crypto.randomUUID();
  keys.push(newKey);
  expect((await runRegistration(request(newKey), f.user, handler)).status).toBe(201);
  expect(executions).toBe(2);
  await assertStock(f.product, 6, 2);
});
it('perder la respuesta despues del commit y reintentar no vuelve a ingresar stock', async () => {
  const f = await fixture();
  let loseResponse = true;
  const transport: typeof fetch = async input => {
    const request = input as Request;
    const key = request.headers.get('x-registration-key')!;
    if (!keys.includes(key)) keys.push(key);
    const response = await runRegistration(request, f.user, async req =>
      Response.json(
        { success: true, data: await registrarCompra(await req.json(), f.user) },
        { status: 201 }
      )
    );
    if (loseResponse) {
      loseResponse = false;
      throw new Error('Respuesta perdida despues del commit');
    }
    return response;
  };
  const guarded = createRegistrationFetch(transport, 'http://localhost');
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(f.body)
  };
  await expect(guarded('/api/purchases', init)).rejects.toThrow('Respuesta perdida');
  await assertStock(f.product, 3, 1);
  expect((await guarded('/api/purchases', init)).status).toBe(201);
  await assertStock(f.product, 3, 1);
});
