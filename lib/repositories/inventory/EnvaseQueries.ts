/**
 * Escaneo y devolución de envases: la botella vacía que vuelve del local. Distingue el
 * escaneo en el punto de venta del ingreso a almacén, y ambos casos registran por qué la
 * unidad ya no está activa.
 */
import { query, withTransaction } from '@/lib/database/db';
import { mapearEnvase, fechaDevolucionLegible } from './inventoryHelpers';
import { ESTADO_UNIDAD_VENDIDA } from './inventoryHelpers';
import type {
  DevolucionEnvaseRegistro,
  DevolucionEnvaseResultado,
  EnvaseFila
} from './inventoryTypes';
import { BusinessError, ValidationError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type { Queryable } from './inventoryTypes';

export class EnvaseQueries {
  private static async buscarEnvase(trx: Queryable, escaneo: string): Promise<EnvaseFila | null> {
    const filas = await trx<any[]>(
      `SELECT u.id, u.codigo, u.codigo_barras, u.estado, u.fecha_devolucion, u.devuelto_por,
              u.fecha_confirmacion, u.confirmado_por, u.abierta_por_shots,
              p.nombre AS producto_nombre, pr.nombre AS presentacion_nombre, c.folio AS compra_folio
         FROM inventario_unidades u
         LEFT JOIN productos p ON p.id_producto = u.producto_id
         LEFT JOIN inventario_presentaciones pr ON pr.id = u.presentacion_id
         LEFT JOIN compras c ON c.id = u.compra_id
        WHERE u.codigo_barras = ? OR u.codigo = ?
        LIMIT 1
        FOR UPDATE OF u`,
      [escaneo, escaneo]
    );
    return filas[0] ?? null;
  }

  /**
   * Verifica un código escaneado contra las unidades que nosotros registramos
   * (EAN-13 interno `codigo_barras` o SKU `LM-…` en `codigo`) y, si el envase
   * es nuestro, está vacío (`vendida`) y todavía no se entregó, lo marca con
   * `fecha_devolucion` + `devuelto_por` en el mismo paso (migración 032). Esta
   * es la mitad del bar del control bar → almacén; la recepción la confirma
   * `confirmContainerReturn`.
   *
   * No crea movimientos de inventario: la botella ya salió con la venta; el
   * control es solo la entrega física del envase vacío. La marca es además lo
   * que permite detectar re-escaneos. Corre en una transacción para que el
   * bloqueo `FOR UPDATE` cubra la lectura y la marca juntas: dos escaneos
   * simultáneos del mismo envase no pueden marcarlo dos veces.
   */
  static async verifyAndReturnContainer(
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    return await withTransaction(trx =>
      this.verificarYMarcarEnvase(trx, codigoEscaneado, usuarioId)
    );
  }

  /** Núcleo transaccional de `verifyAndReturnContainer` (ver su doc). */
  static async verificarYMarcarEnvase(
    trx: Queryable,
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    const escaneo = String(codigoEscaneado ?? '')
      .trim()
      .toUpperCase();
    if (!escaneo) throw new ValidationError('Escanea o digita el código del envase');

    const clasificar = (fila: EnvaseFila): DevolucionEnvaseResultado | null => {
      if (fila.fecha_devolucion) {
        return {
          ok: false,
          motivo: 'ya_devuelto',
          mensaje: `Este envase ya fue devuelto el ${fechaDevolucionLegible(fila.fecha_devolucion)}.`,
          unidad: mapearEnvase(fila)
        };
      }
      if (fila.estado !== ESTADO_UNIDAD_VENDIDA) {
        return {
          ok: false,
          motivo: 'no_esta_vacia',
          mensaje: `El envase es nuestro pero no está vacío (estado '${fila.estado}'); solo se devuelven botellas ya consumidas.`,
          unidad: mapearEnvase(fila)
        };
      }
      // Solo vuelven los envases de botellas que el bar sirvió por shots: la
      // venta entera se llevó el envase cerrado el cliente (migración 042).
      if (!fila.abierta_por_shots) {
        return {
          ok: false,
          motivo: 'venta_entera',
          mensaje:
            'Esta botella se vendió entera: su envase se lo llevó el cliente y no entra al control de envases del bar.',
          unidad: mapearEnvase(fila)
        };
      }
      return null;
    };

    const fila = await this.buscarEnvase(trx, escaneo);
    if (!fila) {
      return {
        ok: false,
        motivo: 'no_es_nuestro',
        mensaje: 'El código no corresponde a ningún envase de nuestro inventario.',
        unidad: null
      };
    }

    const rechazo = clasificar(fila);
    if (rechazo) return rechazo;

    const ahora = getNowInBusinessTimezone();
    const marcadas = await trx<any[]>(
      `UPDATE inventario_unidades
          SET fecha_devolucion = ?, devuelto_por = ?
        WHERE id = ? AND estado = ? AND fecha_devolucion IS NULL
        RETURNING id`,
      [ahora, usuarioId, fila.id, ESTADO_UNIDAD_VENDIDA]
    );
    if (marcadas.length === 0) {
      // La fila estaba bloqueada con FOR UPDATE, así que esto no debería pasar:
      // otro escaneo no pudo haberse colado entre la lectura y la marca.
      throw new BusinessError('No se pudo marcar la devolución. Intenta de nuevo.');
    }

    return {
      ok: true,
      mensaje: 'Envase verificado: es nuestro, estaba vacío y quedó marcado como devuelto.',
      unidad: { ...mapearEnvase(fila), fecha_devolucion: ahora }
    };
  }

  /**
   * Confirma la recepción en almacén de un envase que el bar ya entregó
   * (`fecha_devolucion` marcada en 032) y que todavía no se confirmó (033).
   *
   * Es el segundo paso del control bar → almacén: el barman escanea el vacío al
   * entregarlo y el almacén escanea al recibirlo. Quien entrega no puede
   * confirmar porque el permiso es distinto (`confirm_container_return`), y el
   * almacén no puede dar por recibido un envase que el bar nunca entregó.
   *
   * Como la entrega, no crea movimientos de inventario ni repone stock: solo
   * deja la marca de recepción. Corre en una transacción con `FOR UPDATE` para
   * que dos confirmaciones simultáneas no puedan colarse.
   */
  static async confirmContainerReturn(
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    return await withTransaction(trx =>
      this.confirmarRecepcionEnvase(trx, codigoEscaneado, usuarioId)
    );
  }

  /** Núcleo transaccional de `confirmContainerReturn` (ver su doc). */
  static async confirmarRecepcionEnvase(
    trx: Queryable,
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    const escaneo = String(codigoEscaneado ?? '')
      .trim()
      .toUpperCase();
    if (!escaneo) throw new ValidationError('Escanea o digita el código del envase');

    const fila = await this.buscarEnvase(trx, escaneo);
    if (!fila) {
      return {
        ok: false,
        motivo: 'no_es_nuestro',
        mensaje: 'El código no corresponde a ningún envase de nuestro inventario.',
        unidad: null
      };
    }
    if (!fila.fecha_devolucion) {
      return {
        ok: false,
        motivo: 'no_entregado',
        mensaje: 'El bar todavía no entregó este envase: primero debe escanearlo en el bar.',
        unidad: mapearEnvase(fila)
      };
    }
    if (fila.fecha_confirmacion) {
      return {
        ok: false,
        motivo: 'ya_confirmado',
        mensaje: `Este envase ya fue recibido en almacén el ${fechaDevolucionLegible(
          fila.fecha_confirmacion
        )}.`,
        unidad: mapearEnvase(fila)
      };
    }

    const ahora = getNowInBusinessTimezone();
    const confirmadas = await trx<any[]>(
      `UPDATE inventario_unidades
          SET fecha_confirmacion = ?, confirmado_por = ?
        WHERE id = ? AND fecha_devolucion IS NOT NULL AND fecha_confirmacion IS NULL
        RETURNING id`,
      [ahora, usuarioId, fila.id]
    );
    if (confirmadas.length === 0) {
      // La fila estaba bloqueada con FOR UPDATE, así que esto no debería pasar:
      // otra confirmación no pudo haberse colado entre la lectura y la marca.
      throw new BusinessError('No se pudo confirmar la recepción. Intenta de nuevo.');
    }

    return {
      ok: true,
      mensaje: 'Recepción confirmada: el envase entregado por el bar quedó recibido en almacén.',
      unidad: { ...mapearEnvase(fila), fecha_confirmacion: ahora }
    };
  }

  /**
   * Historial de envases entregados por el bar, lo más reciente primero, con la
   * entrega y la recepción en almacén de cada uno.
   */
  static async listContainerReturns(
    limite: number = 100,
    trx: Queryable = query
  ): Promise<DevolucionEnvaseRegistro[]> {
    const tope = Math.min(Math.max(Math.floor(Number(limite) || 100), 1), 500);
    const rows = await trx<any[]>(
      `SELECT u.id, u.codigo, u.codigo_barras, u.estado, u.fecha_devolucion, u.devuelto_por,
              u.fecha_confirmacion, u.confirmado_por,
              p.nombre AS producto_nombre, pr.nombre AS presentacion_nombre, c.folio AS compra_folio,
              us.nombre AS usuario_nombre, us.apellido AS usuario_apellido, us.nick AS usuario_nick,
              cf.nombre AS confirmado_nombre, cf.apellido AS confirmado_apellido, cf.nick AS confirmado_nick
         FROM inventario_unidades u
         LEFT JOIN productos p ON p.id_producto = u.producto_id
         LEFT JOIN inventario_presentaciones pr ON pr.id = u.presentacion_id
         LEFT JOIN compras c ON c.id = u.compra_id
         LEFT JOIN usuarios us ON us.id_usuario = u.devuelto_por
         LEFT JOIN usuarios cf ON cf.id_usuario = u.confirmado_por
        WHERE u.fecha_devolucion IS NOT NULL
        ORDER BY u.fecha_devolucion DESC, u.codigo ASC
        LIMIT ?`,
      [tope]
    );
    return rows.map(fila => ({
      ...mapearEnvase(fila),
      devuelto_por: fila.devuelto_por ?? null,
      usuario_nombre: fila.usuario_nombre ?? null,
      usuario_apellido: fila.usuario_apellido ?? null,
      usuario_nick: fila.usuario_nick ?? null,
      confirmado_por: fila.confirmado_por ?? null,
      confirmado_nombre: fila.confirmado_nombre ?? null,
      confirmado_apellido: fila.confirmado_apellido ?? null,
      confirmado_nick: fila.confirmado_nick ?? null,
      pendiente_confirmacion: !fila.fecha_confirmacion
    }));
  }
}
