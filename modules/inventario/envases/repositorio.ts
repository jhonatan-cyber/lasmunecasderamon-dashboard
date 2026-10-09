/**
 * Escaneo y devolución de envases: la botella vacía que vuelve del local.
 * Infraestructura privada del módulo: nadie fuera de `modules/inventario`
 * importa este archivo (§5).
 *
 * Distingue el escaneo en el punto de venta del ingreso a almacén, y ambos
 * casos registran por qué la unidad ya no está activa. Mismo SQL, mismos
 * bloqueos `FOR UPDATE` y mismas validaciones que la capa heredada
 * (`EnvaseQueries`): este corte mueve código, no cambia reglas.
 */
import { query, type TransactionQuery } from '@/lib/database/db';
import { fechaDevolucionLegible, mapearEnvase } from '../helpers';
import { ESTADO_UNIDAD_VENDIDA } from '../estados';
import type { EnvaseFila } from '../tipos';
import type {
  DevolucionEnvaseRegistro,
  DevolucionEnvaseResultado,
  ResumenEnvases
} from '../contracts';
import { BusinessError, ValidationError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

/** Horas que un envase puede estar entregado sin recibir antes de avisar. */
export const HORAS_ENVASE_SIN_CONFIRMAR = 2;

async function buscarEnvase(trx: TransactionQuery, escaneo: string): Promise<EnvaseFila | null> {
  // Cada columna tiene un índice UNIQUE propio. Buscar por igualdad exacta
  // permite usarlo incluso con millones de unidades y evita el OR sobre ambas.
  // Prioriza el formato más probable para hacer una sola consulta en el caso normal.
  const campos: Array<'codigo_barras' | 'codigo'> = /^\d{8,20}$/.test(escaneo)
    ? ['codigo_barras', 'codigo']
    : ['codigo', 'codigo_barras'];
  for (const campo of campos) {
    const filas = await trx<any[]>(
      `SELECT u.id, u.codigo, u.codigo_barras, u.estado, u.fecha_devolucion, u.devuelto_por,
              u.fecha_confirmacion, u.confirmado_por, u.abierta_por_shots,
              p.nombre AS producto_nombre, pr.nombre AS presentacion_nombre, c.folio AS compra_folio
         FROM inventario_unidades u
         LEFT JOIN productos p ON p.id_producto = u.producto_id
         LEFT JOIN inventario_presentaciones pr ON pr.id = u.presentacion_id
         LEFT JOIN compras c ON c.id = u.compra_id
        WHERE u.${campo} = ?
        LIMIT 1
        FOR UPDATE OF u`,
      [escaneo]
    );
    if (filas[0]) return filas[0];
  }
  return null;
}

/**
 * Verifica un código escaneado contra las unidades que nosotros registramos
 * (EAN-13 interno `codigo_barras` o SKU `LM-…` en `codigo`) y, si el envase
 * es nuestro, está vacío (`vendida`) y todavía no se entregó, lo marca con
 * `fecha_devolucion` + `devuelto_por` en el mismo paso (migración 032). Esta
 * es la mitad del bar del control bar → almacén; la recepción la confirma
 * `confirmarRecepcionEnvase`.
 *
 * No crea movimientos de inventario: la botella ya salió con la venta; el
 * control es solo la entrega física del envase vacío. La marca es además lo
 * que permite detectar re-escaneos. Corre en una transacción para que el
 * bloqueo `FOR UPDATE` cubra la lectura y la marca juntas: dos escaneos
 * simultáneos del mismo envase no pueden marcarlo dos veces.
 */
export async function verificarYMarcarEnvase(
  trx: TransactionQuery,
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

  const fila = await buscarEnvase(trx, escaneo);
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
export async function confirmarRecepcionEnvase(
  trx: TransactionQuery,
  codigoEscaneado: unknown,
  usuarioId: string | null
): Promise<DevolucionEnvaseResultado> {
  const escaneo = String(codigoEscaneado ?? '')
    .trim()
    .toUpperCase();
  if (!escaneo) throw new ValidationError('Escanea o digita el código del envase');

  const fila = await buscarEnvase(trx, escaneo);
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
 * entrega y la recepción en almacén de cada uno. Lectura: va por el pool.
 */
export async function listarDevoluciones(
  limite: number = 100
): Promise<DevolucionEnvaseRegistro[]> {
  const tope = Math.min(Math.max(Math.floor(Number(limite) || 100), 1), 500);
  const rows = await query<any[]>(
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

/**
 * Contadores del control de envases: los consumen la alerta del almacén y el
 * panel de devoluciones.
 *
 * `fecha_devolucion` es naive y la escribe la aplicación con la hora del
 * negocio, así que la comparación también se hace con esa hora y no con
 * `now()` de Postgres (que iría en la zona del servidor).
 */
export async function obtenerResumenEnvases(): Promise<ResumenEnvases> {
  const [fila] = await query<Array<{ pendientes: unknown; vencidos: unknown }>>(
    `SELECT
       COUNT(*) FILTER (WHERE u.fecha_confirmacion IS NULL) AS pendientes,
       COUNT(*) FILTER (
         WHERE u.fecha_confirmacion IS NULL
           AND u.fecha_devolucion <= (?::timestamp - interval '${HORAS_ENVASE_SIN_CONFIRMAR} hours')
       ) AS vencidos
     FROM inventario_unidades u
     WHERE u.fecha_devolucion IS NOT NULL`,
    [getNowInBusinessTimezone()]
  );
  return {
    pendientes: Number(fila?.pendientes ?? 0),
    vencidos: Number(fila?.vencidos ?? 0)
  };
}
