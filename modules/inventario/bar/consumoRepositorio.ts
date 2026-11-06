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
import { hoyDelNegocio, unidadVencida } from '@/lib/business/vencimiento';
import type { ContextoVentaInventario, ConsumoInventarioDetalle, ShotAlert } from '../contracts';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { sincronizarStockTotal } from '../unidades/repositorio';
import { parseOpcionesVenta } from '../helpers';
import {
  normalizarAcompanamientoBotella,
  type AcompanamientoBotella
} from '@/lib/sales/acompanamientoBotella';

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
  estado: number | null;
  fecha_vencimiento: string | null;
}

interface UnidadConsumo {
  id: string;
  ml_restante: number | null;
  fecha_vencimiento: string | null;
}

export interface OpcionesConsumoStock {
  tipo?: 'venta' | 'cortesia';
  precio?: number;
  comision?: number;
}

function separarVencidas(
  unidades: UnidadConsumo[],
  fechaPresentacion: string | null,
  hoy: string
): { vigentes: UnidadConsumo[]; vencidas: number } {
  const vigentes = unidades.filter(
    unidad => !unidadVencida(unidad.fecha_vencimiento, fechaPresentacion, hoy)
  );
  return { vigentes, vencidas: unidades.length - vigentes.length };
}

export async function consumirStock(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: ContextoVentaInventario,
  soloValidar = false,
  opciones?: OpcionesConsumoStock
): Promise<ShotAlert[]> {
  const presentacionesBloqueadas = contextoVenta.servicioId
    ? undefined
    : await bloquearYValidarConfiguracionVenta(trx, detalles);
  const alertas: ShotAlert[] = [];
  const requerido = new Map<string, PedidoPresentacion>();

  for (const detalle of detalles) {
    for (const mixer of normalizarAcompanamientoBotella(detalle.acompanamiento_botella)) {
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

  for (const [presentacionId, pedido] of [...requerido].sort(([a], [b]) => a.localeCompare(b))) {
    const bloqueada = !pedido.tieneShots
      ? presentacionesBloqueadas?.get(presentacionId)
      : undefined;
    const presentaciones = bloqueada
      ? [{ ...bloqueada, ml_shot: null, ml_shot_anfitriona: null }]
      : await trx<PresentacionConsumo[]>(
          `SELECT p.id, p.producto_id, p.nombre, p.precio_venta, p.comision, p.ml_botella, pr.ml_shot,
        pr.ml_shot_anfitriona, pr.estado, p.fecha_vencimiento
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
        detalles.some(d =>
          normalizarAcompanamientoBotella(d.acompanamiento_botella).some(
            sabor => sabor.presentacion_id === presentacionId
          )
        )
      )
        throw new BusinessError('El producto de acompa\u00f1amiento ya no existe');
      continue;
    }
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
      `SELECT id, ml_restante, fecha_vencimiento FROM inventario_unidades
        WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
        ORDER BY CASE WHEN ml_restante > 0 THEN 0 ELSE 1 END,
                 COALESCE(fecha_vencimiento, ?) ASC NULLS LAST, fecha_crea ASC, codigo ASC
        FOR UPDATE`,
      [presentacionId, presentacion.fecha_vencimiento ?? null]
    );
    const hoy = hoyDelNegocio();
    const { vigentes, vencidas } = separarVencidas(unidades, presentacion.fecha_vencimiento, hoy);

    if (vigentes.length === 0 && vencidas > 0) {
      throw new BusinessError(
        `"${presentacion.nombre}" está vencido: no se puede vender`,
        'PRODUCTO_VENCIDO',
        { presentacion_id: presentacionId, vencidas }
      );
    }

    const plan: { id: string; ml_restante: number; ml_consumido: number }[] = [];
    let mlPendiente =
      pedido.shotsCliente * shotMlPresentacion +
      pedido.shotsAnfitriona * shotMlAnfitriona +
      pedido.mlAcompanamiento;
    let botellasPendientes = pedido.botellas;

    for (const unidad of vigentes) {
      if (mlPendiente <= 0) break;
      const restante = Math.floor(Number(unidad.ml_restante ?? 0));
      if (restante <= 0) continue;
      const consumido = Math.min(restante, mlPendiente);
      mlPendiente -= consumido;
      plan.push({ id: unidad.id, ml_restante: restante - consumido, ml_consumido: consumido });
    }

    for (const unidad of vigentes) {
      if (Number(unidad.ml_restante ?? 0) > 0) continue;
      if (mlPendiente > 0) {
        const consumido = Math.min(capacidadMl, mlPendiente);
        mlPendiente -= consumido;
        plan.push({ id: unidad.id, ml_restante: capacidadMl - consumido, ml_consumido: consumido });
        continue;
      }
      if (botellasPendientes > 0) {
        botellasPendientes -= 1;
        plan.push({ id: unidad.id, ml_restante: 0, ml_consumido: 0 });
        continue;
      }
      break;
    }

    if (mlPendiente > 0 || botellasPendientes > 0) {
      const abiertas = vigentes.filter(unidad => Number(unidad.ml_restante ?? 0) > 0).length;
      const totalShots = pedido.shotsCliente + pedido.shotsAnfitriona;
      const mlRequeridos =
        pedido.shotsCliente * shotMlPresentacion +
        pedido.shotsAnfitriona * shotMlAnfitriona +
        pedido.mlAcompanamiento;
      const avisoVencidas = vencidas > 0 ? ` (${vencidas} botella(s) vencida(s) no se usan)` : '';
      const mensaje =
        totalShots === 0 && pedido.mlAcompanamiento === 0
          ? `Quedan ${vigentes.length} de ${pedido.botellas} botellas de "${presentacion.nombre}" en el bar${avisoVencidas}`
          : `No alcanza el stock de "${presentacion.nombre}" en el bar: faltan ${
              mlPendiente > 0 ? `${mlPendiente} ml` : `${botellasPendientes} botella(s)`
            }${avisoVencidas}`;
      throw new BusinessError(mensaje, 'INSUFFICIENT_BAR_STOCK', {
        presentacion_id: presentacionId,
        disponibles: vigentes.length,
        vencidas,
        requeridas: pedido.botellas + totalShots,
        ml_requeridos: mlRequeridos,
        ml_disponibles: vigentes.reduce(
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
      tipo: opciones?.tipo ?? 'venta',
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
      precio_venta:
        opciones?.precio ??
        (contextoVenta.servicioId
          ? 0
          : pedido.mlAcompanamiento > 0 &&
              pedido.botellas === 0 &&
              pedido.shotsCliente === 0 &&
              pedido.shotsAnfitriona === 0
            ? 0
            : Math.floor(Number(presentacion.precio_venta ?? 0))),
      comision:
        opciones?.comision ??
        (contextoVenta.servicioId
          ? 0
          : pedido.mlAcompanamiento > 0 &&
              pedido.botellas === 0 &&
              pedido.shotsCliente === 0 &&
              pedido.shotsAnfitriona === 0
            ? 0
            : Math.floor(Number(presentacion.comision ?? 0))),
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

export async function validarStockPedido(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[]
) {
  await consumirStock(trx, detalles, { usuarioId: null, fecha: '' }, true);
}

export interface ConsumoColacionDetalle {
  presentacion_id: string;
  ml?: number;
  unidades?: number;
}

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

  for (const pedido of [...pedidos].sort((a, b) =>
    a.presentacionId.localeCompare(b.presentacionId)
  )) {
    const presentaciones = await trx<
      {
        id: string;
        producto_id: string;
        nombre: string;
        ml_botella: number | null;
        fecha_vencimiento: string | null;
      }[]
    >(
      `SELECT p.id, p.producto_id, p.nombre, p.ml_botella, p.fecha_vencimiento
         FROM inventario_presentaciones p
        WHERE p.id = ? FOR UPDATE OF p`,
      [pedido.presentacionId]
    );
    const presentacion = presentaciones[0];
    if (!presentacion) throw new BusinessError('La presentación de la colación ya no existe');

    const capacidadMl = resolveBotellaMl(presentacion.ml_botella, presentacion.nombre, botellaMl);
    const unidades = await trx<UnidadConsumo[]>(
      `SELECT id, ml_restante, fecha_vencimiento FROM inventario_unidades
        WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
        ORDER BY CASE WHEN ml_restante > 0 THEN 0 ELSE 1 END,
                 COALESCE(fecha_vencimiento, ?) ASC NULLS LAST, fecha_crea ASC, codigo ASC
        FOR UPDATE`,
      [pedido.presentacionId, presentacion.fecha_vencimiento ?? null]
    );
    const { vigentes, vencidas } = separarVencidas(
      unidades,
      presentacion.fecha_vencimiento,
      hoyDelNegocio()
    );
    if (vigentes.length === 0 && vencidas > 0) {
      throw new BusinessError(
        `"${presentacion.nombre}" está vencido: no se puede servir`,
        'PRODUCTO_VENCIDO',
        { presentacion_id: pedido.presentacionId, vencidas }
      );
    }

    const plan: { id: string; ml_restante: number; ml_consumido: number }[] = [];
    let mlPendiente = pedido.ml;
    let unidadesPendientes = pedido.unidades;

    for (const unidad of vigentes) {
      if (mlPendiente <= 0) break;
      const restante = Math.floor(Number(unidad.ml_restante ?? 0));
      if (restante <= 0) continue;
      const consumido = Math.min(restante, mlPendiente);
      mlPendiente -= consumido;
      plan.push({ id: unidad.id, ml_restante: restante - consumido, ml_consumido: consumido });
    }

    for (const unidad of vigentes) {
      if (Number(unidad.ml_restante ?? 0) > 0) continue;
      if (mlPendiente > 0) {
        const consumido = Math.min(capacidadMl, mlPendiente);
        mlPendiente -= consumido;
        plan.push({ id: unidad.id, ml_restante: capacidadMl - consumido, ml_consumido: consumido });
        continue;
      }
      if (unidadesPendientes > 0) {
        unidadesPendientes -= 1;
        plan.push({ id: unidad.id, ml_restante: 0, ml_consumido: capacidadMl });
        continue;
      }
      break;
    }

    if (mlPendiente > 0 || unidadesPendientes > 0) {
      const avisoVencidas = vencidas > 0 ? ` (${vencidas} unidad(es) vencida(s) no se usan)` : '';
      throw new BusinessError(
        `No alcanza el stock de "${presentacion.nombre}" en el bar: faltan ${
          mlPendiente > 0 ? `${mlPendiente} ml` : `${unidadesPendientes} unidad(es)`
        }${avisoVencidas}`,
        'INSUFFICIENT_BAR_STOCK',
        {
          presentacion_id: pedido.presentacionId,
          vencidas,
          ml_requeridos: pedido.ml,
          ml_disponibles: vigentes.reduce(
            (total, unidad) =>
              total +
              (Number(unidad.ml_restante ?? 0) > 0
                ? Math.floor(Number(unidad.ml_restante))
                : capacidadMl),
            0
          ),
          botellas_abiertas: vigentes.filter(unidad => Number(unidad.ml_restante ?? 0) > 0).length
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

export async function consumirCover(
  presentacionId: string,
  usuarioId: string,
  fecha: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  const presentaciones = await trx<
    {
      id: string;
      producto_id: string;
      estado: number | null;
      fecha_vencimiento: string | null;
    }[]
  >(
    `SELECT p.id, p.producto_id, pr.estado, p.fecha_vencimiento
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
  if (productoDesactivado(presentacion.estado))
    throw new BusinessError('La bebida del cover no esta disponible');
  const unidades = await trx<{ id: string }[]>(
    `SELECT id FROM inventario_unidades
      WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
        AND (COALESCE(fecha_vencimiento, ?) IS NULL OR COALESCE(fecha_vencimiento, ?) >= ?)
      ORDER BY COALESCE(fecha_vencimiento, ?) ASC NULLS LAST, fecha_crea ASC, codigo ASC LIMIT 1 FOR UPDATE`,
    [
      presentacionId,
      presentacion.fecha_vencimiento ?? null,
      presentacion.fecha_vencimiento ?? null,
      hoyDelNegocio(),
      presentacion.fecha_vencimiento ?? null
    ]
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

export async function consumirProductoCortesia(
  presentacionId: string,
  usuarioId: string,
  fecha: string,
  contexto: ContextoOperacion,
  montoMaximo?: number,
  acompanamientos?: AcompanamientoBotella | null
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
      fecha_vencimiento: string | null;
    }[]
  >(
    `SELECT p.id, p.producto_id, p.opciones_venta, pr.estado, p.fecha_vencimiento
       FROM inventario_presentaciones p
       LEFT JOIN productos pr ON pr.id_producto = p.producto_id
      WHERE p.id = ? AND p.precio_venta <= ? FOR UPDATE OF p`,
    [presentacionId, montoPermitido]
  );
  const presentacion = presentaciones[0];
  if (!presentacion)
    throw new BusinessError('El precio de la bebida supera el monto de entrada más el adicional');
  if (productoDesactivado(presentacion.estado))
    throw new BusinessError('La bebida de cortesia no esta disponible');
  const opciones = parseOpcionesVenta(presentacion.opciones_venta) ?? [];
  const unidadesIncluidas = Number(
    opciones.find(opcion => opcion.tipo === 'botella')?.acompanamiento?.unidades ?? 0
  );
  const reparto = normalizarAcompanamientoBotella(acompanamientos);
  const totalReparto = reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
  if (unidadesIncluidas > 0 && reparto.length === 0)
    throw new BusinessError('Selecciona el acompañamiento incluido en esta bebida');
  if (unidadesIncluidas <= 0 && reparto.length > 0)
    throw new BusinessError('La bebida seleccionada no tiene acompañamiento configurado');
  if (reparto.some(sabor => sabor.presentacion_id === presentacionId))
    throw new BusinessError('La bebida y su acompañamiento deben ser distintos');
  if (reparto.length > 0 && totalReparto !== unidadesIncluidas)
    throw new BusinessError('Reparte el acompañamiento entre los sabores incluidos');

  const sabores = new Map<string, { producto_id: string; fecha_vencimiento: string | null }>();
  if (reparto.length > 0) {
    const ids = reparto.map(sabor => sabor.presentacion_id);
    const filas = await trx<
      { id: string; producto_id: string; fecha_vencimiento: string | null }[]
    >(
      `SELECT p.id, p.producto_id, p.fecha_vencimiento
         FROM inventario_presentaciones p
         JOIN productos pr ON pr.id_producto = p.producto_id
         JOIN categorias c ON c.id_categoria = pr.categoria_id
        WHERE p.id IN (${ids.map(() => '?').join(',')})
          AND c.system_key = 'bebidas_analcoholicas' AND pr.estado = 1
        FOR UPDATE OF p`,
      ids
    );
    if (filas.length !== ids.length)
      throw new BusinessError('Selecciona una bebida analcohólica válida como acompañamiento');
    for (const fila of filas)
      sabores.set(fila.id, {
        producto_id: fila.producto_id,
        fecha_vencimiento: fila.fecha_vencimiento
      });
  }

  const consumirUnidades = async (
    idPresentacion: string,
    idProducto: string,
    cantidad: number,
    fechaPresentacion: string | null
  ) => {
    const unidades = await trx<{ id: string }[]>(
      `SELECT id FROM inventario_unidades
        WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
          AND (COALESCE(fecha_vencimiento, ?) IS NULL OR COALESCE(fecha_vencimiento, ?) >= ?)
        ORDER BY COALESCE(fecha_vencimiento, ?) ASC NULLS LAST, fecha_crea ASC, codigo ASC LIMIT ? FOR UPDATE`,
      [
        idPresentacion,
        fechaPresentacion ?? null,
        fechaPresentacion ?? null,
        hoyDelNegocio(),
        fechaPresentacion ?? null,
        cantidad
      ]
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

  await consumirUnidades(
    presentacionId,
    presentacion.producto_id,
    1,
    presentacion.fecha_vencimiento
  );
  for (const sabor of reparto) {
    const fila = sabores.get(sabor.presentacion_id);
    if (!fila) continue;
    await consumirUnidades(
      sabor.presentacion_id,
      fila.producto_id,
      sabor.unidades,
      fila.fecha_vencimiento
    );
  }
}

export async function consumirCorteCortesia(
  presentacionId: string,
  usuarioId: string,
  fecha: string,
  contexto: ContextoOperacion,
  acompanamientos?: AcompanamientoBotella | null
): Promise<void> {
  if (!presentacionId) throw new BusinessError('Selecciona la bebida a entregar');
  const reparto = normalizarAcompanamientoBotella(acompanamientos);
  if (reparto.length > 1)
    throw new BusinessError('El corte lleva una sola bebida de acompañamiento');
  if (reparto.some(sabor => sabor.presentacion_id === presentacionId))
    throw new BusinessError('La bebida y su acompañamiento deben ser distintos');
  const trx = resolverTransaccion(contexto);
  if (reparto.length) {
    const ids = reparto.map(sabor => sabor.presentacion_id);
    const filas = await trx<{ id: string }[]>(
      `SELECT p.id
         FROM inventario_presentaciones p
         JOIN productos pr ON pr.id_producto = p.producto_id
         JOIN categorias c ON c.id_categoria = pr.categoria_id
        WHERE p.id IN (${ids.map(() => '?').join(',')})
          AND c.system_key = 'bebidas_analcoholicas' AND pr.estado = 1`,
      ids
    );
    if (filas.length !== ids.length)
      throw new BusinessError('Selecciona una bebida analcohólica válida como acompañamiento');
  }
  await consumirStock(
    trx,
    [
      {
        presentacion_id: presentacionId,
        tipo_venta: 'shot',
        cantidad: 1,
        ...(reparto.length
          ? {
              acompanamiento_corto: {
                presentacion_id: reparto[0].presentacion_id,
                unidades: 1
              }
            }
          : {})
      }
    ],
    { usuarioId, fecha },
    false,
    { tipo: 'cortesia', precio: 0, comision: 0 }
  );

  const ids = [presentacionId, ...reparto.map(sabor => sabor.presentacion_id)].filter(
    (id): id is string => Boolean(id)
  );
  const productos = await trx<{ producto_id: string }[]>(
    `SELECT DISTINCT producto_id FROM inventario_presentaciones
      WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  for (const fila of productos) await sincronizarStockTotal(trx, fila.producto_id);
}
