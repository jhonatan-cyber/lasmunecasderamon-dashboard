import { afterAll, expect, it, vi } from 'vitest';
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
import db, { generateUUID } from '@/lib/database/db';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { anularServicioEnUnidad } from '@/modules/operacion/servicios/anulaciones';
import { cambiarAnfitrionasServicioEnUnidad } from '@/modules/operacion/servicios/asignaciones';
import { ServiceService } from '@/modules/operacion';
import { ProductService } from '@/modules/inventario';
import { registrarVenta } from '@/workflows/registrar-venta';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { marcarEstadoServicio } from '@/modules/operacion/servicios/repositorio';
import { liberarHabitacionPorAnulacion } from '@/modules/operacion/facturacion/servicio';
import { crearServicioEnUnidad } from '@/modules/operacion/servicios/creacion';
import { consumirStockBar, revertirStockAnulacion } from '@/modules/inventario';
import { bloquearServicioActivo } from '@/modules/operacion/servicios/asignacionesRepositorio';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from '@/modules/inventario/estados';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});
const rollback = new Error('ROLLBACK_TEST_ONLY');

it('incluye una unidad sin aumentar el precio, conserva comisiones al liberar y devuelve exactamente una vez', async () => {
  await expect(
    enUnaUnidad(u =>
      u.ejecutar(async contexto => {
        const trx = resolverTransaccion(contexto);
        const [host] = await trx<{ id_usuario: string }[]>(
          "SELECT u.id_usuario FROM usuarios u JOIN roles r ON r.id_rol = u.rol_id WHERE LOWER(r.nombre) = 'anfitriona' AND u.estado = 1 LIMIT 1"
        );
        expect(host).toBeTruthy();
        await trx(
          'INSERT INTO logins (id_login, usuario_id, last_login, estado, en_local) VALUES (?, ?, now(), 1, 1)',
          [generateUUID(), host.id_usuario]
        );
        const room = generateUUID(),
          product = generateUUID(),
          pres = generateUUID(),
          unit = generateUUID();
        await trx(
          'INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea) VALUES (?, ?, 50000, 60, 5000, 1, now())',
          [room, `TEST${room.slice(0, 8)}`]
        );
        await trx(
          'INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea) VALUES (?, ?, ?, 10000, 0, ?, now())',
          [product, product.slice(0, 10), 'Incluido prueba', 'Rollback fixture']
        );
        await trx(
          'INSERT INTO inventario_presentaciones (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea) VALUES (?, ?, ?, 10000, 0, 750, now())',
          [pres, product, '750 ml']
        );
        await trx(
          `INSERT INTO inventario_unidades (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea) VALUES (?, ?, ?, ?, 'bar', '${ESTADO_UNIDAD_ACTIVA}', now())`,
          [unit, product, pres, unit.slice(0, 10)]
        );
        const [caja] = await trx<{ id_caja: string }[]>(
          'SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1'
        );
        if (!caja)
          await trx(
            'INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, estado) VALUES (?, now(), ?, 0, 1)',
            [generateUUID(), host.id_usuario]
          );
        const body = {
          habitacion_id: room,
          precio_habitacion: 50000,
          precio_servicio: 0,
          iva: 0,
          sub_total: 50000,
          total: 50000,
          tiempo: 60,
          metodo_pago: 'efectivo' as const,
          usuarios: [host.id_usuario],
          clientes: []
        };
        await expect(
          crearServicioEnUnidad(body, host.id_usuario, contexto, () => {})
        ).rejects.toThrow('Selecciona el producto incluido');
        const result = await crearServicioEnUnidad(
          { ...body, producto_incluido_presentacion_id: pres },
          host.id_usuario,
          contexto,
          () => {}
        );
        expect(result.total).toBe(50000);
        const [state] = await trx<{ estado: string }[]>(
          'SELECT estado FROM inventario_unidades WHERE id = ?',
          [unit]
        );
        expect(state.estado).toBe(ESTADO_UNIDAD_VENDIDA);
        const [move] = await trx<{ cantidad: number; precio_venta: number; comision: number }[]>(
          'SELECT cantidad, precio_venta, comision FROM inventario_movimientos WHERE servicio_id = ?',
          [result.id]
        );
        expect(Number(move.cantidad)).toBe(1);
        expect(Number(move.precio_venta)).toBe(0);
        expect(Number(move.comision)).toBe(0);
        // Un adicional de dos minutos mantiene el principal pausado en veinte minutos.
        const businessNow = getNowInBusinessTimezone();
        await trx(
          "UPDATE servicios SET fecha_crea = CAST(? AS timestamp) - interval '40 minutes' WHERE id_servicio = ?",
          [businessNow, result.id]
        );
        const adicional = await crearServicioEnUnidad(
          {
            ...body,
            es_temporal: true,
            servicio_original_id: result.id,
            tiempo: 2,
            precio_habitacion: 0,
            precio_servicio: 2000,
            sub_total: 2000,
            total: 2000
          },
          host.id_usuario,
          contexto,
          () => {}
        );
        const [originalPausado] = await trx<{ estado: number; tiempo: number; restante: number }[]>(
          'SELECT estado, tiempo, tiempo * 60 - EXTRACT(EPOCH FROM (paused_at - fecha_crea)) AS restante FROM servicios WHERE id_servicio = ?',
          [result.id]
        );
        expect(originalPausado.estado).toBe(3);
        expect(originalPausado.tiempo).toBe(60);
        expect(Number(originalPausado.restante)).toBeGreaterThanOrEqual(1195);
        expect(Number(originalPausado.restante)).toBeLessThanOrEqual(1200);
        const [adicionalCreado] = await trx<{ tiempo: number; es_temporal: number }[]>(
          'SELECT tiempo, es_temporal FROM servicios WHERE id_servicio = ?',
          [adicional.id]
        );
        expect(adicionalCreado.tiempo).toBe(2);
        expect(adicionalCreado.es_temporal).toBe(1);
        const [comisionAdicional] = await trx<{ comision: number }[]>(
          'SELECT comision FROM detalle_servicios WHERE servicio_id = ?',
          [adicional.id]
        );
        expect(Number(comisionAdicional.comision)).toBe(2000);
        await cambiarAnfitrionasServicioEnUnidad(adicional.id, [], contexto);
        expect(
          (
            await trx(
              'SELECT usuario_id FROM detalle_servicios WHERE servicio_id IN (?, ?) AND liberado_en IS NULL',
              [result.id, adicional.id]
            )
          ).length
        ).toBe(0);
        await cambiarAnfitrionasServicioEnUnidad(adicional.id, [host.id_usuario], contexto);
        expect(
          (
            await trx(
              'SELECT usuario_id FROM detalle_servicios WHERE servicio_id IN (?, ?) AND liberado_en IS NULL',
              [result.id, adicional.id]
            )
          ).length
        ).toBe(2);
        expect(
          (await trx('SELECT id FROM inventario_movimientos WHERE servicio_id = ?', [adicional.id]))
            .length
        ).toBe(0);
        await expect(
          crearServicioEnUnidad(
            {
              ...body,
              es_temporal: true,
              servicio_original_id: result.id,
              tiempo: 2
            },
            host.id_usuario,
            contexto,
            () => {}
          )
        ).rejects.toThrow('adicional activo');
        // Simular dos minutos transcurridos sin esperar y finalizar en la misma unidad.
        await trx(
          "UPDATE servicios SET fecha_crea = CAST(? AS timestamp) - interval '42 minutes', paused_at = CAST(? AS timestamp) - interval '2 minutes' WHERE id_servicio = ?",
          [businessNow, businessNow, result.id]
        );
        await marcarEstadoServicio(adicional.id, 1, contexto);
        await liberarHabitacionPorAnulacion(room, contexto, undefined, adicional.id);
        const [reanudado] = await trx<{ estado: number; tiempo: number; restante: number }[]>(
          'SELECT estado, tiempo, tiempo * 60 - EXTRACT(EPOCH FROM (CAST(? AS timestamp) - fecha_crea)) AS restante FROM servicios WHERE id_servicio = ?',
          [getNowInBusinessTimezone(), result.id]
        );
        expect(reanudado.estado).toBe(2);
        expect(reanudado.tiempo).toBe(60);
        expect(Number(reanudado.restante)).toBeGreaterThanOrEqual(1195);
        expect(Number(reanudado.restante)).toBeLessThanOrEqual(1200);

        // Venta adicional: descuenta otro producto y no cambia el tiempo del servicio.
        const extraUnit = generateUUID();
        await trx(
          `INSERT INTO inventario_unidades (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea) VALUES (?, ?, ?, ?, 'bar', '${ESTADO_UNIDAD_ACTIVA}', now())`,
          [extraUnit, product, pres, extraUnit.slice(0, 10)]
        );
        const [incoming] = await trx<{ id_usuario: string }[]>(
          "SELECT u.id_usuario FROM usuarios u JOIN roles r ON r.id_rol = u.rol_id WHERE LOWER(r.nombre) = 'anfitriona' AND u.estado = 1 AND u.id_usuario <> ? LIMIT 1",
          [host.id_usuario]
        );
        expect(incoming).toBeTruthy();
        await trx(
          'INSERT INTO logins (id_login, usuario_id, last_login, estado, en_local) VALUES (?, ?, now(), 1, 1)',
          [generateUUID(), incoming.id_usuario]
        );
        await trx('SAVEPOINT failed_sale_assignment');
        await expect(
          registrarVenta(
            {
              servicio_id: result.id,
              servicio_anfitrionas: [incoming.id_usuario],
              total: 9990000,
              sub_total: 9990000,
              metodo_pago: 'efectivo',
              detalles: [
                {
                  producto_id: product,
                  presentacion_id: pres,
                  cantidad: 999,
                  precio: 10000,
                  tipo_venta: 'botella'
                }
              ]
            },
            host.id_usuario,
            contexto,
            () => {}
          )
        ).rejects.toThrow();
        await trx('ROLLBACK TO SAVEPOINT failed_sale_assignment');
        const unchanged = await trx<{ usuario_id: string }[]>(
          'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ? AND liberado_en IS NULL',
          [result.id]
        );
        expect(unchanged.map(row => row.usuario_id)).toEqual([host.id_usuario]);
        const [noSale] = await trx<{ count: string }[]>(
          'SELECT COUNT(*) AS count FROM ventas WHERE servicio_id = ?',
          [result.id]
        );
        expect(Number(noSale.count)).toBe(0);
        await registrarVenta(
          {
            servicio_id: result.id,
            servicio_anfitrionas: [incoming.id_usuario],
            tiempo: 120,
            habitacion_id: 'ignorada',
            total: 10000,
            sub_total: 10000,
            metodo_pago: 'efectivo',
            detalles: [
              {
                producto_id: product,
                presentacion_id: pres,
                cantidad: 1,
                precio: 10000,
                tipo_venta: 'botella'
              }
            ]
          },
          host.id_usuario,
          contexto,
          () => {}
        );
        const roster = await trx<{ usuario_id: string; comision: number; liberado_en: unknown }[]>(
          'SELECT usuario_id, comision, liberado_en FROM detalle_servicios WHERE servicio_id = ?',
          [result.id]
        );
        expect(roster.find(row => row.usuario_id === host.id_usuario)?.liberado_en).toBeTruthy();
        expect(Number(roster.find(row => row.usuario_id === host.id_usuario)?.comision)).toBe(5000);
        expect(roster.filter(row => row.liberado_en === null).map(row => row.usuario_id)).toEqual([
          incoming.id_usuario
        ]);
        const [incomingState] = await trx<{ estado_servicio: number }[]>(
          'SELECT estado_servicio FROM usuarios WHERE id_usuario = ?',
          [incoming.id_usuario]
        );
        expect(incomingState.estado_servicio).toBe(1);
        const [sale] = await trx<
          { tiempo: number; habitacion_id: string; estado: number; total: number }[]
        >('SELECT tiempo, habitacion_id, estado, total FROM ventas WHERE servicio_id = ?', [
          result.id
        ]);
        expect(Number(sale.tiempo)).toBe(0);
        expect(sale.habitacion_id).toBe(room);
        expect(Number(sale.total)).toBe(10000);
        expect(sale.estado).toBe(1);
        const [original] = await trx<{ tiempo: number; estado: number; total: number }[]>(
          'SELECT tiempo, estado, total FROM servicios WHERE id_servicio = ?',
          [result.id]
        );
        expect(Number(original.tiempo)).toBe(60);
        expect(original.estado).toBe(2);
        expect(Number(original.total)).toBe(50000);
        await cambiarAnfitrionasServicioEnUnidad(result.id, [], contexto);
        const [libre] = await trx<{ estado_servicio: number }[]>(
          'SELECT estado_servicio FROM usuarios WHERE id_usuario = ?',
          [host.id_usuario]
        );
        expect(libre.estado_servicio).toBe(0);
        const [roomState] = await trx<{ estado: number }[]>(
          'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
          [room]
        );
        expect(roomState.estado).toBe(2);
        const [earned] = await trx<{ comision: number; liberado_en: unknown }[]>(
          'SELECT comision, liberado_en FROM detalle_servicios WHERE servicio_id = ?',
          [result.id]
        );
        expect(Number(earned.comision)).toBe(5000);
        expect(earned.liberado_en).toBeTruthy();
        await cambiarAnfitrionasServicioEnUnidad(result.id, [host.id_usuario], contexto);
        const [sum] = await trx<{ total: number }[]>(
          'SELECT SUM(comision) AS total FROM detalle_servicios WHERE servicio_id = ?',
          [result.id]
        );
        expect(Number(sum.total)).toBe(5000);
        await bloquearServicioActivo(result.id, contexto);
        const entrada = {
          servicio_id: result.id,
          usuario_id: host.id_usuario,
          fecha: '2026-10-12 12:02:00'
        };
        await anularServicioEnUnidad(result.id, host.id_usuario, contexto, () => {});
        const balances = await trx(
          'SELECT servicio, efectivo, comision, devolucion FROM cajas WHERE estado = 1 ORDER BY id_caja'
        );
        await anularServicioEnUnidad(result.id, host.id_usuario, contexto, () => {});
        expect(
          await trx(
            'SELECT servicio, efectivo, comision, devolucion FROM cajas WHERE estado = 1 ORDER BY id_caja'
          )
        ).toEqual(balances);
        const [repuesto] = await trx<{ estado: string }[]>(
          'SELECT estado FROM inventario_unidades WHERE id = ?',
          [unit]
        );
        const [extra] = await trx<{ estado: string }[]>(
          'SELECT estado FROM inventario_unidades WHERE id = ?',
          [extraUnit]
        );
        expect(repuesto.estado).toBe(ESTADO_UNIDAD_ACTIVA);
        expect(extra.estado).toBe(ESTADO_UNIDAD_VENDIDA);
        expect((await revertirStockAnulacion(entrada, contexto)).unidades_repuestas).toBe(0);
        await expect(
          consumirStockBar(
            [{ presentacion_id: generateUUID(), cantidad: 1 }],
            { servicioId: result.id, usuarioId: host.id_usuario, fecha: entrada.fecha },
            contexto
          )
        ).rejects.toThrow('El producto incluido ya no existe');
        throw rollback;
      })
    )
  ).rejects.toBe(rollback);
});

it('las lecturas de servicios y del bar devuelven la configuración ampliada', async () => {
  const result = await ServiceService.getAll({ all: 'true', limit: '1', page: '1' });
  expect(Array.isArray(result.data)).toBe(true);
  if (result.data[0]?.id) expect(await ServiceService.getById(result.data[0].id)).toBeTruthy();
  const bar = await ProductService.listBarStock();
  expect(Array.isArray(bar)).toBe(true);
  for (const p of bar) {
    expect(Number(p.stock_bar_cerrado)).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(p.codigos_unidades_bar)).toBe(true);
    expect(
      p.codigos_unidades_bar.every((code: string) => typeof code === 'string' && code.length > 0)
    ).toBe(true);
  }
});
