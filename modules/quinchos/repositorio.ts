import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { formatFechaISO } from '@/lib/utils/fechaSql';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import { ConflictError, NotFoundError } from '@/lib/errors/errors';
import type {
  EstadoReservaQuincho,
  MetodoPagoReservaQuincho,
  ReservaQuincho
} from '@/types/quincho';

/** Columnas de la reserva junto al cliente, compartidas por la lectura y el alta. */
const SELECT_RESERVA = `
  SELECT r.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.run AS cliente_run
  FROM reservas_quincho r
  INNER JOIN clientes c ON c.id_cliente = r.cliente_id
`;

function timestampISO(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  return String(valor);
}

function mapReserva(row: Record<string, unknown>): ReservaQuincho {
  return {
    id: String(row.id),
    cliente_id: String(row.cliente_id),
    cliente_nombre: String(row.cliente_nombre ?? ''),
    cliente_apellido: String(row.cliente_apellido ?? ''),
    cliente_run: row.cliente_run ? String(row.cliente_run) : null,
    fecha_reserva: formatFechaISO(row.fecha_reserva as string | Date | null) ?? '',
    cantidad_personas: Number(row.cantidad_personas),
    monto_por_persona: Number(row.monto_por_persona),
    total: Number(row.total),
    metodo_pago: String(row.metodo_pago) as MetodoPagoReservaQuincho,
    observaciones: row.observaciones ? String(row.observaciones) : null,
    estado: String(row.estado) as EstadoReservaQuincho,
    usuario_id: row.usuario_id ? String(row.usuario_id) : null,
    fecha_crea: timestampISO(row.fecha_crea) ?? '',
    fecha_anulacion: timestampISO(row.fecha_anulacion),
    anulada_por: row.anulada_por ? String(row.anulada_por) : null
  };
}

export interface NuevaReservaQuincho {
  cliente_id: string;
  fecha_reserva: string;
  cantidad_personas: number;
  monto_por_persona: number;
  total: number;
  metodo_pago: MetodoPagoReservaQuincho;
  observaciones: string | null;
}

/** Todas las reservas, de la fecha más reciente a la más antigua. */
export async function listarReservasQuincho(): Promise<ReservaQuincho[]> {
  const rows = await query<Record<string, unknown>[]>(
    `${SELECT_RESERVA} ORDER BY r.fecha_reserva DESC, r.fecha_crea DESC`
  );
  return rows.map(mapReserva);
}

export async function insertarReservaQuincho(
  entrada: NuevaReservaQuincho,
  usuarioId: string | null,
  contexto: ContextoOperacion
): Promise<ReservaQuincho> {
  const trx = resolverTransaccion(contexto);
  const id = generateUUID();
  await trx(
    `INSERT INTO reservas_quincho
       (id, cliente_id, fecha_reserva, cantidad_personas, monto_por_persona, total,
        metodo_pago, observaciones, estado, usuario_id, fecha_crea)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'activa', ?, ?)`,
    [
      id,
      entrada.cliente_id,
      entrada.fecha_reserva,
      entrada.cantidad_personas,
      entrada.monto_por_persona,
      entrada.total,
      entrada.metodo_pago,
      entrada.observaciones,
      usuarioId,
      getNowInBusinessTimezone()
    ]
  );
  const rows = await trx<Record<string, unknown>[]>(`${SELECT_RESERVA} WHERE r.id = ?`, [id]);
  return mapReserva(rows[0]);
}

/**
 * Bloquea la reserva para anularla dentro de la unidad: si ya está anulada no
 * hay nada que devolver y se corta antes de mover saldo.
 */
export async function reclamarReservaParaAnular(
  id: string,
  contexto: ContextoOperacion
): Promise<ReservaQuincho> {
  const rows = await resolverTransaccion(contexto)<Record<string, unknown>[]>(
    `${SELECT_RESERVA} WHERE r.id = ? FOR UPDATE OF r`,
    [id]
  );
  if (!rows[0]) throw new NotFoundError('Reserva de quincho', id);
  const reserva = mapReserva(rows[0]);
  if (reserva.estado === 'anulada')
    throw new ConflictError('La reserva ya está anulada', { reserva_id: id });
  return reserva;
}

export async function marcarReservaAnulada(
  id: string,
  usuarioId: string | null,
  contexto: ContextoOperacion
): Promise<ReservaQuincho> {
  const trx = resolverTransaccion(contexto);
  await trx(
    'UPDATE reservas_quincho SET estado = ?, fecha_anulacion = ?, anulada_por = ? WHERE id = ?',
    ['anulada', getNowInBusinessTimezone(), usuarioId, id]
  );
  const rows = await trx<Record<string, unknown>[]>(`${SELECT_RESERVA} WHERE r.id = ?`, [id]);
  return mapReserva(rows[0]);
}
