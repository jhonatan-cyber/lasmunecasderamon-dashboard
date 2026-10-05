import { generateUUID, type TransactionQuery } from '@/lib/database/db';
import {
  DEFAULT_BOTTLE_ML,
  DEFAULT_SHOT_ML,
  DEFAULT_SHOTS_ALERTA,
  getBarMlConfig
} from './configuracion';
import {
  ESTADO_UNIDAD_ACTIVA,
  ESTADO_UNIDAD_VENDIDA
} from '@/lib/repositories/inventory/inventoryHelpers';
import { BusinessError } from '@/lib/errors/errors';
import { resolveBotellaMl, resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import type { ConsumoInventarioDetalle, ShotAlert } from '../contracts';

interface PedidoPresentacion {
  botellas: number;
  shotsCliente: number;
  shotsAnfitriona: number;
  tieneShots: boolean;
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
}

interface UnidadConsumo {
  id: string;
  ml_restante: number | null;
}

export async function consumirStock(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[],
  contextoVenta: { usuarioId: string | null; fecha: string }
): Promise<ShotAlert[]> {
  const alertas: ShotAlert[] = [];
  const requerido = new Map<string, PedidoPresentacion>();

  for (const detalle of detalles) {
    const presentacionId = detalle.presentacion_id?.trim();
    const unidades = Math.max(0, Math.floor(Number(detalle.cantidad ?? 0)));
    if (!presentacionId || unidades === 0) continue;

    const acumulado = requerido.get(presentacionId) ?? {
      botellas: 0,
      shotsCliente: 0,
      shotsAnfitriona: 0,
      tieneShots: false
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
    pedido => pedido.shotsCliente > 0 || pedido.shotsAnfitriona > 0
  );
  const { shotMl, botellaMl, shotsAlerta } = hayShots
    ? await getBarMlConfig(trx)
    : {
        shotMl: DEFAULT_SHOT_ML,
        botellaMl: DEFAULT_BOTTLE_ML,
        shotsAlerta: DEFAULT_SHOTS_ALERTA
      };

  for (const [presentacionId, pedido] of requerido) {
    const presentaciones = await trx<PresentacionConsumo[]>(
      `SELECT p.id, p.producto_id, p.nombre, p.precio_venta, p.comision, p.ml_botella, pr.ml_shot,
        pr.ml_shot_anfitriona
       FROM inventario_presentaciones p
       INNER JOIN productos pr ON pr.id_producto = p.producto_id
       WHERE p.id = ? FOR UPDATE OF p`,
      [presentacionId]
    );
    const presentacion = presentaciones[0];
    if (!presentacion) continue;

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

    const plan: { id: string; ml_restante: number }[] = [];
    let mlPendiente =
      pedido.shotsCliente * shotMlPresentacion + pedido.shotsAnfitriona * shotMlAnfitriona;
    let botellasPendientes = pedido.botellas;

    for (const unidad of unidades) {
      if (mlPendiente <= 0) break;
      const restante = Math.floor(Number(unidad.ml_restante ?? 0));
      if (restante <= 0) continue;
      const consumido = Math.min(restante, mlPendiente);
      mlPendiente -= consumido;
      plan.push({ id: unidad.id, ml_restante: restante - consumido });
    }

    for (const unidad of unidades) {
      if (Number(unidad.ml_restante ?? 0) > 0) continue;
      if (mlPendiente > 0) {
        const consumido = Math.min(capacidadMl, mlPendiente);
        mlPendiente -= consumido;
        plan.push({ id: unidad.id, ml_restante: capacidadMl - consumido });
        continue;
      }
      if (botellasPendientes > 0) {
        botellasPendientes -= 1;
        plan.push({ id: unidad.id, ml_restante: 0 });
        continue;
      }
      break;
    }

    if (mlPendiente > 0 || botellasPendientes > 0) {
      const abiertas = unidades.filter(unidad => Number(unidad.ml_restante ?? 0) > 0).length;
      const totalShots = pedido.shotsCliente + pedido.shotsAnfitriona;
      const mlRequeridos =
        pedido.shotsCliente * shotMlPresentacion + pedido.shotsAnfitriona * shotMlAnfitriona;
      const mensaje =
        totalShots === 0
          ? `Quedan ${unidades.length} de ${pedido.botellas} botellas de "${presentacion.nombre}" en el bar`
          : `No alcanza el stock de "${presentacion.nombre}" en el bar: faltan ${
              mlPendiente > 0 ? `${mlPendiente} ml` : `${botellasPendientes} botella(s)`
            }`;
      throw new BusinessError(mensaje, 'INSUFFICIENT_BAR_STOCK', {
        presentacion_id: presentacionId,
        disponibles: unidades.length,
        requeridas: pedido.botellas + totalShots,
        ml_requeridos: totalShots > 0 ? mlRequeridos : 0,
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
        pedido.shotsCliente + pedido.shotsAnfitriona > 0
          ? pedido.shotsCliente * shotMlPresentacion + pedido.shotsAnfitriona * shotMlAnfitriona
          : null,
      precio_venta: Math.floor(Number(presentacion.precio_venta ?? 0)),
      comision: Math.floor(Number(presentacion.comision ?? 0)),
      usuario_id: contextoVenta.usuarioId,
      fecha_crea: contextoVenta.fecha
    };
    const columnas = Object.keys(movimiento);
    await trx(
      `INSERT INTO inventario_movimientos (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
      Object.values(movimiento)
    );
  }

  return alertas;
}
