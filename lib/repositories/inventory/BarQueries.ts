/**
 * La barra: traspaso desde almacén, venta por shots con descuento de ml, stock abierto y
 * resumen del turno. Es el módulo que depende de unidades (`syncStockTotal`), porque cada
 * venta o traspaso deja el stock del producto desfasado hasta recalcularlo.
 */
import { query, withTransaction, generateUUID } from '@/lib/database/db';
import { mapPresentacion, parseOpcionesVenta } from './inventoryHelpers';
import {
  getBarMlConfig,
  getTopeSimple,
  DEFAULT_SHOT_ML,
  DEFAULT_BOTTLE_ML,
  DEFAULT_SHOTS_ALERTA
} from './inventoryConfig';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from './inventoryHelpers';
import type { TraspasoInput, ShotAlert, ShotsSummary, PresentacionRow } from './inventoryTypes';
import { BusinessError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { resolveBotellaMl, resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { BaseRepository } from '../BaseRepository';
import type { Queryable } from './inventoryTypes';
import { UnidadQueries } from './UnidadQueries';

export class BarQueries {
  static async traspasarAlBar(
    trx: Queryable,
    input: TraspasoInput
  ): Promise<{ trasladadas: number; stock_bar: number }> {
    // Serializa traspasos del mismo producto, incluso entre distintas presentaciones.
    await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
      input.producto_id
    ]);
    const candidatas = await trx<any[]>(
      `SELECT id FROM inventario_unidades
       WHERE producto_id = ? AND presentacion_id = ?
         AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'almacen'
       ORDER BY fecha_crea ASC, codigo ASC
       LIMIT ?
       FOR UPDATE`,
      [input.producto_id, input.presentacion_id, input.cantidad]
    );
    if (candidatas.length < input.cantidad) {
      throw new BusinessError(
        `Stock insuficiente en almacén: hay ${candidatas.length} y se pidieron ${input.cantidad}`
      );
    }
    const ids = candidatas.map(r => String(r.id));
    const placeholders = ids.map(() => '?').join(',');
    if (!input.usuario_id)
      throw new BusinessError('Se requiere el usuario que realiza la transferencia');
    const movimientoId = generateUUID();
    // Si no se envían precio/comisión, reutiliza la configuración guardada de la presentación.
    let opciones = input.opciones_venta;
    let precioVenta = input.precio_venta;
    let comision = input.comision;
    if (!opciones || opciones.length === 0) {
      const presRows = await trx<any[]>(
        'SELECT opciones_venta, precio_venta, comision FROM inventario_presentaciones WHERE id = ? LIMIT 1',
        [input.presentacion_id]
      );
      const guardadas =
        parseOpcionesVenta(presRows[0]?.opciones_venta) ??
        (presRows[0]
          ? [
              {
                tipo: 'botella' as const,
                precio: Number(presRows[0].precio_venta ?? 0),
                comision: Number(presRows[0].comision ?? 0)
              }
            ]
          : undefined);
      if (precioVenta === undefined && comision === undefined) {
        opciones = guardadas;
      } else {
        opciones = [
          {
            tipo: 'botella' as const,
            precio: Number(precioVenta ?? 0),
            comision: Number(comision ?? 0)
          }
        ];
      }
    }
    if (!opciones || opciones.length === 0) {
      throw new BusinessError(
        'La presentación no tiene precio ni comisión configurados: indícalos para la primera transferencia'
      );
    }
    const botella = opciones.find(o => o.tipo === 'botella');
    precioVenta = botella?.precio ?? opciones[0].precio ?? 0;
    comision = botella?.comision ?? opciones[0].comision ?? 0;
    if (
      !Number.isFinite(precioVenta) ||
      precioVenta < 0 ||
      !Number.isFinite(comision) ||
      comision < 0
    ) {
      throw new BusinessError(
        'La presentación no tiene precio ni comisión configurados: indícalos para la primera transferencia'
      );
    }
    const opcionesVenta = JSON.stringify(opciones);
    await BaseRepository.insert(trx, 'inventario_movimientos', {
      id: movimientoId,
      tipo: 'traspaso',
      estado: 'pendiente',
      opciones_venta: opcionesVenta,
      producto_id: input.producto_id,
      presentacion_id: input.presentacion_id,
      cantidad: input.cantidad,
      precio_venta: Math.floor(precioVenta),
      comision: Math.floor(comision),
      usuario_id: input.usuario_id,
      fecha_crea: getNowInBusinessTimezone()
    });
    await trx(
      `UPDATE inventario_unidades SET ubicacion = 'transito', transferencia_id = ? WHERE id IN (${placeholders})`,
      [movimientoId, ...ids]
    );
    await UnidadQueries.syncStockTotal(trx, input.producto_id);
    const enBar = await trx<any[]>(
      `SELECT COUNT(*) AS total FROM inventario_unidades
       WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'`,
      [input.presentacion_id]
    );
    return { trasladadas: input.cantidad, stock_bar: Number(enBar[0]?.total ?? 0) };
  }

  static async traspasarAlBarStandalone(
    input: TraspasoInput
  ): Promise<{ trasladadas: number; stock_bar: number }> {
    let resultado = { trasladadas: 0, stock_bar: 0 };
    await withTransaction(async trx => {
      resultado = await this.traspasarAlBar(trx, input);
    });
    // Solo después de confirmar la transacción: el módulo Transferencias se refresca en vivo.
    sendNotificationToAll('transfers_updated', {
      action: 'created',
      producto_id: input.producto_id,
      presentacion_id: input.presentacion_id
    });
    return resultado;
  }

  /**
   * Descuenta del bar las botellas de una venta registrada.
   *
   * Se invoca dentro de la transacción de la venta: si algo falla después, el descuento
   * se revierte junto con la venta, y si esto falla, la venta entera se revierte. Cada
   * presentación se bloquea con `FOR UPDATE` para que dos ventas simultáneas no
   * descuenten las mismas botellas (docs/INVENTARIO.md).
   *
   * Los detalles sin `presentacion_id` no se tocan: son del catálogo anterior, que no
   * tiene inventario vinculado y conserva su comportamiento.
   *
   * Un detalle con `tipo_venta: 'shot'` no gasta una botella entera: descuenta ml. Se sigue
   * sirviendo de la botella que ya está abierta y, si no alcanza, se abre la siguiente
   * (la unidad queda activa con `ml_restante`, visible en el inventario del bar). Cuando el
   * contenido llega a 0 la botella pasa a 'vendida' como cualquier otra.
   *
   * Devuelve las botellas que con esta venta quedaron bajo el umbral de alerta
   * (`shots_alerta` shots restantes) sin haber estado antes: el aviso para el barman se
   * emite fuera de la transacción, para no notificar una venta que después se revierte.
   */

  static async consume(
    trx: Queryable,
    detalles: {
      presentacion_id?: string | null;
      cantidad?: number | null;
      tipo_venta?: string | null;
      shot_anfitriona?: boolean | null;
    }[],
    contexto: { usuarioId: string | null; fecha: string }
  ): Promise<ShotAlert[]> {
    const alertas: ShotAlert[] = [];
    const requerido = new Map<
      string,
      { botellas: number; shotsCliente: number; shotsAnfitriona: number; tieneShots: boolean }
    >();
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
      } else acumulado.botellas += unidades;
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
      const presentacion = await trx<any[]>(
        `SELECT p.id, p.producto_id, p.nombre, p.precio_venta, p.comision, p.ml_botella, pr.ml_shot,
          pr.ml_shot_anfitriona
         FROM inventario_presentaciones p
         INNER JOIN productos pr ON pr.id_producto = p.producto_id
         WHERE p.id = ? FOR UPDATE OF p`,
        [presentacionId]
      );
      // Presentación borrada: las unidades quedaron huérfanas, no hay nada que descontar.
      if (presentacion.length === 0) continue;

      // Capacidad de la botella: la de la presentación, la que declara su nombre
      // ("1000 ml") o, si no dice volumen, la de Configuraciones.
      const capacidadMl = resolveBotellaMl(
        presentacion[0].ml_botella,
        presentacion[0].nombre,
        botellaMl
      );
      // Ml por shot del producto (null o 0 = el global de Configuraciones) y ml del
      // shot de anfitriona (null o 0 = igual que el de cliente).
      const shotMlPresentacion = resolveShotMl(presentacion[0].ml_shot, shotMl);
      const shotMlAnfitriona = resolveShotMlAnfitriona(
        presentacion[0].ml_shot_anfitriona,
        shotMlPresentacion
      );
      const umbralAlertaPresentacion = shotMlPresentacion * shotsAlerta;

      // Botellas abiertas primero (se termina la que ya está servida), luego las llenas
      // en FIFO. Se leen todas para poder rechazar la venta antes de escribir nada.
      const unidades = await trx<any[]>(
        `SELECT id, ml_restante FROM inventario_unidades
          WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
          ORDER BY CASE WHEN ml_restante > 0 THEN 0 ELSE 1 END, fecha_crea ASC, codigo ASC
          FOR UPDATE`,
        [presentacionId]
      );

      // Plan de consumo: ml pendientes de shots (cliente y anfitriona por separado)
      // y botellas completas por separado.
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
        const abiertas = unidades.filter(u => Number(u.ml_restante ?? 0) > 0).length;
        const totalShots = pedido.shotsCliente + pedido.shotsAnfitriona;
        const mlRequeridos =
          pedido.shotsCliente * shotMlPresentacion + pedido.shotsAnfitriona * shotMlAnfitriona;
        const mensaje =
          totalShots === 0
            ? `Quedan ${unidades.length} de ${pedido.botellas} botellas de "${presentacion[0].nombre}" en el bar`
            : `No alcanza el stock de "${presentacion[0].nombre}" en el bar: faltan ${
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
      // Botellas que este pedido dejó vacías **por shots**: son las únicas cuyo
      // envase vuelve a almacén (la venta entera se lleva el envase cerrado).
      const vaciadasPorShots: string[] = [];
      const mlAnterior = new Map(
        unidades.map(unidad => [unidad.id, Math.floor(Number(unidad.ml_restante ?? 0))])
      );
      for (const item of plan) {
        if (item.ml_restante > 0) {
          await trx(
            `UPDATE inventario_unidades SET ml_restante = ?, abierta_por_shots = true WHERE id = ?`,
            [item.ml_restante, item.id]
          );
          // Le queda poco y **no** estaba en alerta: avisa sólo en el cruce (o al abrir
          // una botella que ya arranca bajo el umbral), para no repetir por cada shot.
          const antes = mlAnterior.get(item.id) ?? 0;
          const estabaEnAlerta = antes > 0 && antes <= umbralAlertaPresentacion;
          if (!estabaEnAlerta && item.ml_restante <= umbralAlertaPresentacion) {
            alertas.push({
              presentacion_id: presentacionId,
              nombre: presentacion[0].nombre,
              ml_restante: item.ml_restante,
              shots_restantes: Math.floor(item.ml_restante / shotMlPresentacion)
            });
          }
        } else if (pedido.tieneShots) {
          // Llegó a 0 ml dentro de este mismo pedido: su contenido se sirvió por
          // shots, así que su envase es de los que vuelven.
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
        const placeholdersShots = vaciadasPorShots.map(() => '?').join(',');
        await trx(
          `UPDATE inventario_unidades SET abierta_por_shots = true WHERE id IN (${placeholdersShots})`,
          vaciadasPorShots
        );
      }

      // Deja la venta en el historial de la presentación: es el tercer tipo de
      // movimiento que promete el documento junto a ingresos y traspasos. `cantidad`
      // cuenta las botellas que salieron del bar (una botella abierta sigue en stock y
      // su contenido queda en `ml`).
      await BaseRepository.insert(trx, 'inventario_movimientos', {
        id: generateUUID(),
        tipo: 'venta',
        estado: 'completada',
        producto_id: presentacion[0].producto_id,
        presentacion_id: presentacionId,
        cantidad: vendidas.length,
        ml:
          pedido.shotsCliente + pedido.shotsAnfitriona > 0
            ? pedido.shotsCliente * shotMlPresentacion + pedido.shotsAnfitriona * shotMlAnfitriona
            : null,
        precio_venta: Math.floor(Number(presentacion[0].precio_venta ?? 0)),
        comision: Math.floor(Number(presentacion[0].comision ?? 0)),
        usuario_id: contexto.usuarioId,
        fecha_crea: contexto.fecha
      });
    }

    return alertas;
  }

  static async getMaxAnfitrionasMap(productoIds: string[]): Promise<Record<string, number | null>> {
    const ids = [...new Set(productoIds.filter(Boolean))];
    if (ids.length === 0) return {};
    try {
      const placeholders = ids.map(() => '?').join(',');
      const rows = await query<any[]>(
        `SELECT id_producto AS producto_id, max_anfitrionas FROM productos WHERE id_producto IN (${placeholders})`,
        ids
      );
      const map: Record<string, number | null> = {};
      for (const r of rows) {
        map[String(r.producto_id)] =
          r.max_anfitrionas === null || r.max_anfitrionas === undefined
            ? null
            : Number(r.max_anfitrionas);
      }
      return map;
    } catch {
      return {};
    }
  }

  static async listBarStock(productoId?: string): Promise<
    (PresentacionRow & {
      producto_nombre: string;
      producto_codigo: string;
      producto_foto: string | null;
      categoria_nombre: string | null;
    })[]
  > {
    const rows = await query<any[]>(
      `SELECT p.*,
        (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'almacen') AS stock,
        (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar,
        (SELECT COALESCE(SUM(u.ml_restante), 0) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS ml_abierta,
        (SELECT COALESCE(SUM(m.ml), 0) FROM inventario_movimientos m WHERE m.presentacion_id = p.id AND m.tipo = 'venta' AND m.ml > 0) AS ml_servidos,
        pr.nombre AS producto_nombre, pr.codigo AS producto_codigo, pr.foto AS producto_foto,
        pr.precio AS producto_precio, pr.comision AS producto_comision, pr.ml_shot,
        pr.ml_shot_anfitriona,
        c.nombre AS categoria_nombre
       FROM inventario_presentaciones p
       INNER JOIN productos pr ON pr.id_producto = p.producto_id
       LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
       ${productoId ? 'WHERE p.producto_id = ?' : ''}
       ORDER BY pr.nombre ASC, p.fecha_crea ASC, p.id ASC`,
      productoId ? [productoId] : []
    );
    // `productos.max_anfitrionas` puede no existir si falta la migración 017.
    // Se carga aparte y tolerante para no romper el listado del bar.
    const maxMap = await this.getMaxAnfitrionasMap([
      ...new Set(rows.map(r => String(r.producto_id)).filter(Boolean))
    ]);
    const topeSimple = await getTopeSimple();
    return rows.map(row => ({
      ...mapPresentacion(
        { ...row, max_anfitrionas: maxMap[String(row.producto_id)] ?? null },
        topeSimple
      ),
      producto_nombre: row.producto_nombre,
      producto_codigo: row.producto_codigo,
      producto_foto: row.producto_foto ?? null,
      categoria_nombre: row.categoria_nombre ?? null
    }));
  }

  /**
   * Resumen para el panel de shots del bar: lo servido hoy, los ml que quedan en las
   * botellas abiertas y cuántas están por agotarse (≤ `shots_alerta` shots restantes).
   *
   * Los ml por shot pueden variar por producto (`productos.ml_shot`): los conteos se
   * calculan producto por producto y sólo se recurre al `shot_ml` global cuando el
   * producto no define los suyos.
   */
  static async getShotsSummary(): Promise<ShotsSummary> {
    const { shotMl, shotsAlerta } = await getBarMlConfig();
    const inicioDia = `${getNowInBusinessTimezone().slice(0, 10)} 00:00:00`;

    const [hoy] = await query<any[]>(
      `SELECT COALESCE(SUM(m.ml), 0) AS ml,
              COALESCE(SUM(m.ml / COALESCE(NULLIF(pr.ml_shot, 0), ?)), 0) AS shots
         FROM inventario_movimientos m
         LEFT JOIN productos pr ON pr.id_producto = m.producto_id
        WHERE m.tipo = 'venta' AND m.ml > 0 AND m.fecha_crea >= ?`,
      [shotMl, inicioDia]
    );
    const [abiertas] = await query<any[]>(
      `SELECT COUNT(*) AS botellas,
              COALESCE(SUM(u.ml_restante), 0) AS ml,
              COALESCE(SUM(CASE WHEN u.ml_restante <= (COALESCE(NULLIF(pr.ml_shot, 0), ?) * ?)
                               THEN 1 ELSE 0 END), 0) AS por_agotarse
         FROM inventario_unidades u
         LEFT JOIN productos pr ON pr.id_producto = u.producto_id
        WHERE u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar' AND u.ml_restante > 0`,
      [shotMl, shotsAlerta]
    );

    const mlServidosHoy = Number(hoy?.ml ?? 0);
    return {
      shotMl,
      shotsAlerta,
      mlServidosHoy,
      shotsServidosHoy: Number(hoy?.shots ?? 0),
      mlRestantesTotales: Number(abiertas?.ml ?? 0),
      botellasAbiertas: Number(abiertas?.botellas ?? 0),
      botellasPorAgotarse: Number(abiertas?.por_agotarse ?? 0)
    };
  }
}
