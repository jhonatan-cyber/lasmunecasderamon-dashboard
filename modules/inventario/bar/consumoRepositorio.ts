import {
  bloquearYValidarConfiguracionVenta,
  productoDesactivado
} from './validarConfiguracionVenta';
import { generateUUID, type TransactionQuery } from '@/lib/database/db';
import {
  DEFAULT_BOTTLE_ML,
  DEFAULT_SHOT_ML,
  DEFAULT_SHOTS_ALERTA,
  getBarMlConfig
} from './configuracion';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from '../estados';
import { BusinessError } from '@/lib/errors/errors';
import { resolveBotellaMl, resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import type { ContextoVentaInventario, ConsumoInventarioDetalle, ShotAlert } from '../contracts';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { sincronizarStockTotal } from '../unidades/repositorio';
import { parseOpcionesVenta } from '../helpers';

interface PedidoPresentacion {
  botellas: number;
  shotsCliente: number;
  shotsAnfitriona: number;
  tieneShots: boolean;
  mlAcompanamiento: number;
}

interface PresentacionConsumo {
  id: string;
  producto_id: string;
  nombre: string;
  precio_venta: number;
  comision: number;
  ml_botella: number | null;
  ml_shot: number | null;
  ml_shot_anfitriona: number | null;
  /** Estado del producto: 0 = desactivado, no se consume del bar. */
  estado: number | null;
}

interface UnidadConsumo {
  id: string;
  ml_restante: number | null;
}

export async function consumirStock(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: ContextoVentaInventario,
  soloValidar = false
): Promise<ShotAlert[]> {
  // El producto incluido consume una unidad completa sin reglas de precio de venta.
  const presentacionesBloqueadas = contextoVenta.servicioId
    ? undefined
    : await bloquearYValidarConfiguracionVenta(trx, detalles);
  const alertas: ShotAlert[] = [];
  const requerido = new Map<string, PedidoPresentacion>();

  for (const detalle of detalles) {
    if (detalle.acompanamiento_botella) {
      const mixer = detalle.acompanamiento_botella;
      const cantidad = Number(detalle.cantidad);
      if (
        detalle.tipo_venta === 'shot' ||
        !detalle.presentacion_id ||
        mixer.presentacion_id === detalle.presentacion_id ||
        !Number.isInteger(cantidad) ||
        cantidad < 1 ||
        !Number.isInteger(mixer.unidades) ||
        mixer.unidades < 1 ||
        mixer.unidades > 1000
      )
        throw new BusinessError('Bebida de botella inválida');
      const pedido = requerido.get(mixer.presentacion_id) ?? {
        botellas: 0,
        shotsCliente: 0,
        shotsAnfitriona: 0,
        tieneShots: false,
        mlAcompanamiento: 0
      };
      pedido.botellas += cantidad * mixer.unidades;
      requerido.set(mixer.presentacion_id, pedido);
    }

    if (detalle.acompanamiento_corto) {
      const mixer = detalle.acompanamiento_corto;
      const cantidad = Number(detalle.cantidad);
      if (
        detalle.tipo_venta !== 'shot' ||
        !detalle.presentacion_id ||
        mixer.presentacion_id === detalle.presentacion_id ||
        !Number.isInteger(cantidad) ||
        cantidad < 1 ||
        cantidad > 99 ||
        (mixer.unidades !== undefined
          ? !Number.isInteger(mixer.unidades) || mixer.unidades < 1 || mixer.unidades > 1000
          : !Number.isInteger(mixer.ml_por_corto) ||
            Number(mixer.ml_por_corto) < 1 ||
            Number(mixer.ml_por_corto) > 10000)
      )
        throw new BusinessError('Consumo de acompa\u00f1amiento inv\u00e1lido');
      const acumulado = requerido.get(mixer.presentacion_id) ?? {
        botellas: 0,
        shotsCliente: 0,
        shotsAnfitriona: 0,
        tieneShots: false,
        mlAcompanamiento: 0
      };
      if (mixer.unidades !== undefined) acumulado.botellas += cantidad * mixer.unidades;
      else {
        acumulado.mlAcompanamiento += cantidad * Number(mixer.ml_por_corto);
        acumulado.tieneShots = true;
      }
      requerido.set(mixer.presentacion_id, acumulado);
    }
    const presentacionId = detalle.presentacion_id?.trim();
    const unidades = Math.max(0, Math.floor(Number(detalle.cantidad ?? 0)));
    if (!presentacionId || unidades === 0) continue;

    const acumulado = requerido.get(presentacionId) ?? {
      botellas: 0,
      shotsCliente: 0,
      shotsAnfitriona: 0,
      tieneShots: false,
      mlAcompanamiento: 0
    };
    if (detalle.tipo_venta === 'shot') {
      if (detalle.shot_anfitriona) acumulado.shotsAnfitriona += unidades;
      else acumulado.shotsCliente += unidades;
      acumulado.tieneShots = true;
    } else {
      acumulado.botellas += unidades;
    }
    requerido.set(presentacionId, acumulado);
  }

  if (requerido.size === 0) return alertas;

  const hayShots = [...requerido.values()].some(
    pedido => pedido.shotsCliente > 0 || pedido.shotsAnfitriona > 0 || pedido.mlAcompanamiento > 0
  );
  const { shotMl, botellaMl, shotsAlerta } = hayShots
    ? await getBarMlConfig(trx)
    : {
        shotMl: DEFAULT_SHOT_ML,
        botellaMl: DEFAULT_BOTTLE_ML,
        shotsAlerta: DEFAULT_SHOTS_ALERTA
      };

  // Orden estable de bloqueo para ventas concurrentes que comparten bebidas.
  for (const [presentacionId, pedido] of [...requerido].sort(([a], [b]) => a.localeCompare(b))) {
    // Para botellas completas los volúmenes de shot del producto no intervienen.
    // La presentación ya está bloqueada por la validación; no hay otra lectura ni
    // un bloqueo nuevo. Shots, acompañamientos e incluidos conservan su consulta.
    const bloqueada = !pedido.tieneShots
      ? presentacionesBloqueadas?.get(presentacionId)
      : undefined;
    const presentaciones = bloqueada
      ? [{ ...bloqueada, ml_shot: null, ml_shot_anfitriona: null }]
      : await trx<PresentacionConsumo[]>(
          `SELECT p.id, p.producto_id, p.nombre, p.precio_venta, p.comision, p.ml_botella, pr.ml_shot,
        pr.ml_shot_anfitriona, pr.estado
       FROM inventario_presentaciones p
       INNER JOIN productos pr ON pr.id_producto = p.producto_id
       WHERE p.id = ? FOR UPDATE OF p`,
          [presentacionId]
        );
    const presentacion = presentaciones[0];
    if (!presentacion) {
      if (soloValidar)
        throw new BusinessError('La presentacion del pedido o su bebida no esta disponible');
      if (contextoVenta.servicioId) throw new BusinessError('El producto incluido ya no existe');
      if (
        pedido.mlAcompanamiento > 0 ||
        detalles.some(d => d.acompanamiento_botella?.presentacion_id === presentacionId)
      )
        throw new BusinessError('El producto de acompa\u00f1amiento ya no existe');
      continue;
    }
    // Un producto desactivado a mano no se consume del bar, aunque conserve
    // stock: la misma regla aplica al corto y a la botella.
    if (productoDesactivado(presentacion.estado)) {
      if (contextoVenta.servicioId)
        throw new BusinessError('El producto incluido ya no esta disponible');
      throw new BusinessError('La bebida seleccionada no esta disponible');
    }

    const capacidadMl = resolveBotellaMl(presentacion.ml_botella, presentacion.nombre, botellaMl);
    const shotMlPresentacion = resolveShotMl(presentacion.ml_shot, shotMl);
    const shotMlAnfitriona = resolveShotMlAnfitriona(
      presentacion.ml_shot_anfitriona,
      shotMlPresentacion
    );
    const umbralAlertaPresentacion = shotMlPresentacion * shotsAlerta;

    const unidades = await trx<UnidadConsumo[]>(
      `SELECT id, ml_restante FROM inventario_unidades
        WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
        ORDER BY CASE WHEN ml_restante > 0 THEN 0 ELSE 1 END, fecha_crea ASC, codigo ASC
        FOR UPDATE`,
      [presentacionId]
    );

    // `ml_consumido` es lo que este movimiento le quitó a la unidad, no la
    // diferencia con lo que tenía: si la venta abrió una botella cerrada, la
    // diferencia con su `ml_restante` (0) no diría nada de los ml que salieron.
    const plan: { id: string; ml_restante: number; ml_consumido: number }[] = [];
    let mlPendiente =
      pedido.shotsCliente * shotMlPresentacion +
      pedido.shotsAnfitriona * shotMlAnfitriona +
      pedido.mlAcompanamiento;
    let botellasPendientes = pedido.botellas;

    for (const unidad of unidades) {
      if (mlPendiente <= 0) break;
      const restante = Math.floor(Number(unidad.ml_restante ?? 0));
      if (restante <= 0) continue;
      const consumido = Math.min(restante, mlPendiente);
      mlPendiente -= consumido;
      plan.push({ id: unidad.id, ml_restante: restante - consumido, ml_consumido: consumido });
    }

    for (const unidad of unidades) {
      if (Number(unidad.ml_restante ?? 0) > 0) continue;
      if (mlPendiente > 0) {
        const consumido = Math.min(capacidadMl, mlPendiente);
        mlPendiente -= consumido;
        plan.push({ id: unidad.id, ml_restante: capacidadMl - consumido, ml_consumido: consumido });
        continue;
      }
      if (botellasPendientes > 0) {
        botellasPendientes -= 1;
        // Botella vendida entera: no sale ml de ella, sale la botella.
        plan.push({ id: unidad.id, ml_restante: 0, ml_consumido: 0 });
        continue;
      }
      break;
    }

    if (mlPendiente > 0 || botellasPendientes > 0) {
      const abiertas = unidades.filter(unidad => Number(unidad.ml_restante ?? 0) > 0).length;
      const totalShots = pedido.shotsCliente + pedido.shotsAnfitriona;
      const mlRequeridos =
        pedido.shotsCliente * shotMlPresentacion +
        pedido.shotsAnfitriona * shotMlAnfitriona +
        pedido.mlAcompanamiento;
      const mensaje =
        totalShots === 0 && pedido.mlAcompanamiento === 0
          ? `Quedan ${unidades.length} de ${pedido.botellas} botellas de "${presentacion.nombre}" en el bar`
          : `No alcanza el stock de "${presentacion.nombre}" en el bar: faltan ${
              mlPendiente > 0 ? `${mlPendiente} ml` : `${botellasPendientes} botella(s)`
            }`;
      throw new BusinessError(mensaje, 'INSUFFICIENT_BAR_STOCK', {
        presentacion_id: presentacionId,
        disponibles: unidades.length,
        requeridas: pedido.botellas + totalShots,
        ml_requeridos: mlRequeridos,
        ml_disponibles: unidades.reduce(
          (total, unidad) =>
            total +
            (Number(unidad.ml_restante ?? 0) > 0
              ? Math.floor(Number(unidad.ml_restante))
              : capacidadMl),
          0
        ),
        botellas_abiertas: abiertas
      });
    }

    // El pedido comprueba el mismo plan, sin consumir, abrir botellas ni registrar movimientos.
    if (soloValidar) continue;

    const vendidas: string[] = [];
    const vaciadasPorShots: string[] = [];
    const mlAnterior = new Map(
      unidades.map(unidad => [unidad.id, Math.floor(Number(unidad.ml_restante ?? 0))])
    );
    for (const item of plan) {
      if (item.ml_restante > 0) {
        await trx(
          'UPDATE inventario_unidades SET ml_restante = ?, abierta_por_shots = true WHERE id = ?',
          [item.ml_restante, item.id]
        );
        const antes = mlAnterior.get(item.id) ?? 0;
        const estabaEnAlerta = antes > 0 && antes <= umbralAlertaPresentacion;
        if (!estabaEnAlerta && item.ml_restante <= umbralAlertaPresentacion) {
          alertas.push({
            presentacion_id: presentacionId,
            nombre: presentacion.nombre,
            ml_restante: item.ml_restante,
            shots_restantes: Math.floor(item.ml_restante / shotMlPresentacion)
          });
        }
      } else if (pedido.tieneShots) {
        vaciadasPorShots.push(item.id);
        vendidas.push(item.id);
      } else {
        vendidas.push(item.id);
      }
    }

    if (vendidas.length > 0) {
      const placeholders = vendidas.map(() => '?').join(',');
      await trx(
        `UPDATE inventario_unidades SET estado = '${ESTADO_UNIDAD_VENDIDA}', ml_restante = 0 WHERE id IN (${placeholders})`,
        vendidas
      );
    }
    if (vaciadasPorShots.length > 0) {
      const placeholders = vaciadasPorShots.map(() => '?').join(',');
      await trx(
        `UPDATE inventario_unidades SET abierta_por_shots = true WHERE id IN (${placeholders})`,
        vaciadasPorShots
      );
    }

    const movimiento = {
      id: generateUUID(),
      tipo: 'venta',
      estado: 'completada',
      producto_id: presentacion.producto_id,
      presentacion_id: presentacionId,
      cantidad: vendidas.length,
      ml:
        pedido.shotsCliente + pedido.shotsAnfitriona > 0 || pedido.mlAcompanamiento > 0
          ? pedido.shotsCliente * shotMlPresentacion +
            pedido.shotsAnfitriona * shotMlAnfitriona +
            pedido.mlAcompanamiento
          : null,
      precio_venta: contextoVenta.servicioId
        ? 0
        : pedido.mlAcompanamiento > 0 &&
            pedido.botellas === 0 &&
            pedido.shotsCliente === 0 &&
            pedido.shotsAnfitriona === 0
          ? 0
          : Math.floor(Number(presentacion.precio_venta ?? 0)),
      comision: contextoVenta.servicioId
        ? 0
        : pedido.mlAcompanamiento > 0 &&
            pedido.botellas === 0 &&
            pedido.shotsCliente === 0 &&
            pedido.shotsAnfitriona === 0
          ? 0
          : Math.floor(Number(presentacion.comision ?? 0)),
      usuario_id: contextoVenta.usuarioId,
      venta_id: contextoVenta.ventaId ?? null,
      ...(contextoVenta.servicioId ? { servicio_id: contextoVenta.servicioId } : {}),
      fecha_crea: contextoVenta.fecha
    };
    const columnas = Object.keys(movimiento);
    await trx(
      `INSERT INTO inventario_movimientos (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
      Object.values(movimiento)
    );

    // Qué unidades tocó este consumo y cuánta ml les quitó (migración 058). Sin
    // esta trazabilidad la anulación de la venta no puede devolver lo que salió:
    // solo sabría cuántas botellas vender, no cuáles ni cuánto les queda.
    const tocadas = plan.map(item => [movimiento.id, item.id, item.ml_consumido]);
    if (tocadas.length > 0) {
      const valores = tocadas.flat();
      const marcadores = tocadas.map(() => '(?, ?, ?)').join(',');
      await trx(
        `INSERT INTO inventario_movimiento_unidades (movimiento_id, unidad_id, ml_consumido)
         VALUES ${marcadores}`,
        valores
      );
    }
  }

  return alertas;
}

/** Valida botellas, cortos y bebidas acumulados sin reservar ni modificar existencias. */
export async function validarStockPedido(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[]
) {
  await consumirStock(trx, detalles, { usuarioId: null, fecha: '' }, true);
}

export interface ConsumoColacionDetalle {
  presentacion_id: string;
  /** Ml que se descuentan de la bebida servida (0 = no se descuenta ml). */
  ml?: number;
  /** Unidades completas que se descuentan del acompañamiento. */
  unidades?: number;
}

/**
 * Descuenta del bar lo que entregó una colación: los ml de la bebida servida y
 * el acompañamiento (unidades completas o sus ml, según la configuración).
 *
 * Usa la misma mecánica que la venta —primero lo que queda en botellas
 * abiertas, después abrir una cerrada y marcar vendida la que quedó vacía—,
 * pero registra el movimiento como `colacion` y con precio 0, para que no
 * cuente como venta ni como shot servido. Sin esto la colación solo dejaba una
 * fila en `colaciones`: la botella seguía llena y el ml abierto nunca bajaba.
 */
export async function consumirColacion(
  detalles: ConsumoColacionDetalle[],
  usuarioId: string,
  fecha: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  const pedidos = detalles
    .map(detalle => ({
      presentacionId: String(detalle.presentacion_id ?? '').trim(),
      ml: Math.max(0, Math.floor(Number(detalle.ml ?? 0))),
      unidades: Math.max(0, Math.floor(Number(detalle.unidades ?? 0)))
    }))
    .filter(pedido => pedido.presentacionId && (pedido.ml > 0 || pedido.unidades > 0));
  if (pedidos.length === 0) return;

  const { botellaMl } = await getBarMlConfig(trx);

  // Orden estable de bloqueo: dos colaciones simultáneas que comparten la misma
  // botella de acompañamiento no pueden planificar sobre las mismas unidades.
  for (const pedido of [...pedidos].sort((a, b) =>
    a.presentacionId.localeCompare(b.presentacionId)
  )) {
    const presentaciones = await trx<
      { id: string; producto_id: string; nombre: string; ml_botella: number | null }[]
    >(
      `SELECT p.id, p.producto_id, p.nombre, p.ml_botella
         FROM inventario_presentaciones p
        WHERE p.id = ? FOR UPDATE OF p`,
      [pedido.presentacionId]
    );
    const presentacion = presentaciones[0];
    if (!presentacion) throw new BusinessError('La presentación de la colación ya no existe');

    const capacidadMl = resolveBotellaMl(presentacion.ml_botella, presentacion.nombre, botellaMl);
    const unidades = await trx<UnidadConsumo[]>(
      `SELECT id, ml_restante FROM inventario_unidades
        WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
        ORDER BY CASE WHEN ml_restante > 0 THEN 0 ELSE 1 END, fecha_crea ASC, codigo ASC
        FOR UPDATE`,
      [pedido.presentacionId]
    );

    const plan: { id: string; ml_restante: number; ml_consumido: number }[] = [];
    let mlPendiente = pedido.ml;
    let unidadesPendientes = pedido.unidades;

    for (const unidad of unidades) {
      if (mlPendiente <= 0) break;
      const restante = Math.floor(Number(unidad.ml_restante ?? 0));
      if (restante <= 0) continue;
      const consumido = Math.min(restante, mlPendiente);
      mlPendiente -= consumido;
      plan.push({ id: unidad.id, ml_restante: restante - consumido, ml_consumido: consumido });
    }

    for (const unidad of unidades) {
      if (Number(unidad.ml_restante ?? 0) > 0) continue;
      if (mlPendiente > 0) {
        const consumido = Math.min(capacidadMl, mlPendiente);
        mlPendiente -= consumido;
        plan.push({ id: unidad.id, ml_restante: capacidadMl - consumido, ml_consumido: consumido });
        continue;
      }
      if (unidadesPendientes > 0) {
        unidadesPendientes -= 1;
        // La unidad entera sale del bar: esos ml también salen, y hay que
        // registrarlos o el stock desaparece del resumen.
        plan.push({ id: unidad.id, ml_restante: 0, ml_consumido: capacidadMl });
        continue;
      }
      break;
    }

    if (mlPendiente > 0 || unidadesPendientes > 0) {
      throw new BusinessError(
        `No alcanza el stock de "${presentacion.nombre}" en el bar: faltan ${
          mlPendiente > 0 ? `${mlPendiente} ml` : `${unidadesPendientes} unidad(es)`
        }`,
        'INSUFFICIENT_BAR_STOCK',
        {
          presentacion_id: pedido.presentacionId,
          ml_requeridos: pedido.ml,
          ml_disponibles: unidades.reduce(
            (total, unidad) =>
              total +
              (Number(unidad.ml_restante ?? 0) > 0
                ? Math.floor(Number(unidad.ml_restante))
                : capacidadMl),
            0
          ),
          botellas_abiertas: unidades.filter(unidad => Number(unidad.ml_restante ?? 0) > 0).length
        }
      );
    }

    const vendidas: string[] = [];
    for (const item of plan) {
      if (item.ml_restante > 0) {
        await trx(
          'UPDATE inventario_unidades SET ml_restante = ?, abierta_por_shots = true WHERE id = ?',
          [item.ml_restante, item.id]
        );
      } else {
        vendidas.push(item.id);
      }
    }
    if (vendidas.length > 0) {
      const placeholders = vendidas.map(() => '?').join(',');
      await trx(
        `UPDATE inventario_unidades SET estado = '${ESTADO_UNIDAD_VENDIDA}', ml_restante = 0 WHERE id IN (${placeholders})`,
        vendidas
      );
    }

    const mlConsumido = plan.reduce((total, item) => total + item.ml_consumido, 0);
    const movimientoId = generateUUID();
    await trx(
      `INSERT INTO inventario_movimientos
        (id, tipo, estado, producto_id, presentacion_id, cantidad, precio_venta, comision, usuario_id, ml, fecha_crea)
       VALUES (?, 'colacion', 'completada', ?, ?, ?, 0, 0, ?, ?, ?)`,
      [
        movimientoId,
        presentacion.producto_id,
        pedido.presentacionId,
        vendidas.length,
        usuarioId,
        mlConsumido,
        fecha
      ]
    );
    if (plan.length > 0) {
      const valores = plan.flatMap(item => [movimientoId, item.id, item.ml_consumido]);
      const marcadores = plan.map(() => '(?, ?, ?)').join(',');
      await trx(
        `INSERT INTO inventario_movimiento_unidades (movimiento_id, unidad_id, ml_consumido)
         VALUES ${marcadores}`,
        valores
      );
    }
    await sincronizarStockTotal(trx, presentacion.producto_id);
  }
}

/** Descuenta del bar una botella analcohólica entregada como cover. */
export async function consumirCover(
  presentacionId: string,
  usuarioId: string,
  fecha: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  const presentaciones = await trx<{ id: string; producto_id: string; estado: number | null }[]>(
    `SELECT p.id, p.producto_id, pr.estado
       FROM inventario_presentaciones p
       JOIN productos pr ON pr.id_producto = p.producto_id
       JOIN categorias c ON c.id_categoria = pr.categoria_id
      WHERE p.id = ? AND c.system_key = 'bebidas_analcoholicas' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.opciones_venta::jsonb, '[]'::jsonb)) opcion
        WHERE opcion->>'tipo' = 'botella' AND opcion->>'cover_habilitado' = 'true'
      ) FOR UPDATE OF p`,
    [presentacionId]
  );
  const presentacion = presentaciones[0];
  if (!presentacion) throw new BusinessError('La bebida no está habilitada para cover');
  // Un producto desactivado a mano no se consume del bar.
  if (productoDesactivado(presentacion.estado))
    throw new BusinessError('La bebida del cover no esta disponible');
  const unidades = await trx<{ id: string }[]>(
    `SELECT id FROM inventario_unidades
      WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
      ORDER BY fecha_crea ASC, codigo ASC LIMIT 1 FOR UPDATE`,
    [presentacionId]
  );
  if (!unidades.length) throw new BusinessError('No hay stock en el bar para entregar este cover');

  const unidadId = unidades[0].id;
  await trx(
    `UPDATE inventario_unidades SET estado = '${ESTADO_UNIDAD_VENDIDA}', ml_restante = 0 WHERE id = ?`,
    [unidadId]
  );
  const movimientoId = generateUUID();
  await trx(
    `INSERT INTO inventario_movimientos
      (id, tipo, estado, producto_id, presentacion_id, cantidad, precio_venta, comision, usuario_id, ml, fecha_crea)
     VALUES (?, 'cover', 'completada', ?, ?, 1, 0, 0, ?, 0, ?)`,
    [movimientoId, presentacion.producto_id, presentacionId, usuarioId, fecha]
  );
  await trx(
    `INSERT INTO inventario_movimiento_unidades (movimiento_id, unidad_id, ml_consumido)
     VALUES (?, ?, 0)`,
    [movimientoId, unidadId]
  );
  await sincronizarStockTotal(trx, presentacion.producto_id);
}

/** Descuenta una unidad de un producto elegido como cortesía en el registro de entradas. */
export async function consumirProductoCortesia(
  presentacionId: string,
  usuarioId: string,
  fecha: string,
  contexto: ContextoOperacion,
  montoMaximo?: number,
  acompanamientoPresentacionId?: string | null
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  const configs = await trx<{ valor: string }[]>(
    "SELECT valor FROM configuraciones WHERE clave = 'monto_base_trago_cortesia_cliente' LIMIT 1"
  );
  const valorBase = Number(configs[0]?.valor ?? 10000);
  const montoBaseConfigurado =
    Number.isFinite(valorBase) && valorBase >= 0 ? Math.floor(valorBase) : 10000;
  const montoPermitido =
    montoMaximo === undefined
      ? montoBaseConfigurado
      : Number.isFinite(montoMaximo) && montoMaximo >= 0
        ? Math.floor(montoMaximo)
        : -1;
  const presentaciones = await trx<
    {
      id: string;
      producto_id: string;
      opciones_venta: unknown;
      estado: number | null;
    }[]
  >(
    `SELECT p.id, p.producto_id, p.opciones_venta, pr.estado
       FROM inventario_presentaciones p
       LEFT JOIN productos pr ON pr.id_producto = p.producto_id
      WHERE p.id = ? AND p.precio_venta <= ? FOR UPDATE OF p`,
    [presentacionId, montoPermitido]
  );
  const presentacion = presentaciones[0];
  if (!presentacion)
    throw new BusinessError('El precio de la bebida supera el monto de entrada más el adicional');
  // Un producto desactivado a mano no se consume del bar.
  if (productoDesactivado(presentacion.estado))
    throw new BusinessError('La bebida de cortesia no esta disponible');
  const opciones = parseOpcionesVenta(presentacion.opciones_venta) ?? [];
  const unidadesIncluidas = Number(
    opciones.find(opcion => opcion.tipo === 'botella')?.acompanamiento?.unidades ?? 0
  );
  if (unidadesIncluidas > 0 && !acompanamientoPresentacionId)
    throw new BusinessError('Selecciona el acompañamiento incluido en esta bebida');
  if (unidadesIncluidas <= 0 && acompanamientoPresentacionId)
    throw new BusinessError('La bebida seleccionada no tiene acompañamiento configurado');
  if (acompanamientoPresentacionId === presentacionId)
    throw new BusinessError('La bebida y su acompañamiento deben ser distintos');

  let productoAcompanamientoId: string | null = null;
  if (acompanamientoPresentacionId) {
    const acompanamientos = await trx<{ id: string; producto_id: string }[]>(
      `SELECT p.id, p.producto_id
         FROM inventario_presentaciones p
         JOIN productos pr ON pr.id_producto = p.producto_id
         JOIN categorias c ON c.id_categoria = pr.categoria_id
        WHERE p.id = ? AND c.system_key = 'bebidas_analcoholicas' AND pr.estado = 1
        FOR UPDATE OF p`,
      [acompanamientoPresentacionId]
    );
    if (!acompanamientos.length)
      throw new BusinessError('Selecciona una bebida analcohólica válida como acompañamiento');
    productoAcompanamientoId = acompanamientos[0].producto_id;
  }

  const consumirUnidades = async (idPresentacion: string, idProducto: string, cantidad: number) => {
    const unidades = await trx<{ id: string }[]>(
      `SELECT id FROM inventario_unidades
        WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
        ORDER BY fecha_crea ASC, codigo ASC LIMIT ? FOR UPDATE`,
      [idPresentacion, cantidad]
    );
    if (unidades.length < cantidad)
      throw new BusinessError('No hay suficiente stock en el bar para entregar la bebida');
    for (const unidad of unidades) {
      await trx(
        `UPDATE inventario_unidades SET estado = '${ESTADO_UNIDAD_VENDIDA}', ml_restante = 0 WHERE id = ?`,
        [unidad.id]
      );
      const movimientoId = generateUUID();
      await trx(
        `INSERT INTO inventario_movimientos
          (id, tipo, estado, producto_id, presentacion_id, cantidad, precio_venta, comision, usuario_id, ml, fecha_crea)
         VALUES (?, 'cortesia', 'completada', ?, ?, 1, 0, 0, ?, 0, ?)`,
        [movimientoId, idProducto, idPresentacion, usuarioId, fecha]
      );
      await trx(
        `INSERT INTO inventario_movimiento_unidades (movimiento_id, unidad_id, ml_consumido)
         VALUES (?, ?, 0)`,
        [movimientoId, unidad.id]
      );
    }
    await sincronizarStockTotal(trx, idProducto);
  };

  await consumirUnidades(presentacionId, presentacion.producto_id, 1);
  if (acompanamientoPresentacionId && productoAcompanamientoId)
    await consumirUnidades(
      acompanamientoPresentacionId,
      productoAcompanamientoId,
      unidadesIncluidas
    );
}
