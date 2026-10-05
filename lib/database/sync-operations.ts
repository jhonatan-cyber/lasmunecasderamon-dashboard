import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { DatabaseError } from '@/lib/errors/errors';
import logger from '@/lib/utils/logger';

/**
 * Estados de una operación diferida. Ver migrations/040_sync_operations.sql:
 * solo `pendiente` significa "todavía no resuelta".
 */
export type SyncOperationEstado = 'pendiente' | 'aplicada' | 'rechazada' | 'fallida';

export interface SyncOperation {
  id_cliente: string;
  usuario_id: string | null;
  endpoint: string;
  estado: SyncOperationEstado;
  respuesta: string | null;
  intentos: number;
  creado_en: string;
  aplicado_en: string | null;
}

/** Respuesta que se replica cuando llega de nuevo la misma clave. */
export interface SyncOperationResponse {
  status: number;
  body: unknown;
}

export interface ClaimResult {
  /** `true` solo si esta llamada creó la fila (nadie la había visto antes). */
  claimed: boolean;
  operation: SyncOperation | null;
}

const ESTADOS: SyncOperationEstado[] = ['pendiente', 'aplicada', 'rechazada', 'fallida'];

function mapRow(row: Record<string, unknown>): SyncOperation {
  const estado = String(row.estado) as SyncOperationEstado;

  return {
    id_cliente: String(row.id_cliente),
    usuario_id: row.usuario_id ? String(row.usuario_id) : null,
    endpoint: String(row.endpoint),
    estado: ESTADOS.includes(estado) ? estado : 'fallida',
    respuesta: row.respuesta ? String(row.respuesta) : null,
    intentos: Number(row.intentos ?? 0),
    creado_en: String(row.creado_en ?? ''),
    aplicado_en: row.aplicado_en ? String(row.aplicado_en) : null
  };
}

export class SyncOperationRepository {
  static async get(idCliente: string): Promise<SyncOperation | null> {
    try {
      const rows = await query<Record<string, unknown>[]>(
        'SELECT * FROM sync_operations WHERE id_cliente = ?',
        [idCliente]
      );
      return rows.length > 0 ? mapRow(rows[0]) : null;
    } catch (err) {
      throw new DatabaseError('Error al leer la operación sincronizada', err);
    }
  }

  /**
   * Reclama la clave. Devuelve `claimed: true` únicamente en la primera vez;
   * si ya existía, devuelve la fila para poder decidir qué responder.
   *
   * El INSERT es la operación atómica: `ON CONFLICT DO NOTHING` no puede crear
   * dos filas para la misma clave ni siquiera con dos reintentos simultáneos.
   * Cuando el conflicto es contra una fila sin commitear, Postgres espera al
   * commit y recién ahí resuelve, así que la fila siempre es visible después.
   */
  static async claim(
    idCliente: string,
    input: { endpoint: string; usuarioId?: string | null; deviceDate?: string }
  ): Promise<ClaimResult> {
    try {
      const ahora = getNowInBusinessTimezone(input.deviceDate);
      const inserted = await query<Record<string, unknown>[]>(
        `INSERT INTO sync_operations (id_cliente, usuario_id, endpoint, estado, intentos, creado_en)
         VALUES (?, ?, ?, 'pendiente', 1, ?)
         ON CONFLICT (id_cliente) DO NOTHING
         RETURNING id_cliente`,
        [idCliente, input.usuarioId ?? null, input.endpoint, ahora]
      );

      if (inserted.length > 0) {
        return { claimed: true, operation: null };
      }

      const existente = await SyncOperationRepository.get(idCliente);
      if (!existente) {
        // Carrera con una fila borrada entre el INSERT y el SELECT: se trata
        // como nueva ejecución en vez de bloquear la operación.
        return { claimed: true, operation: null };
      }

      await query('UPDATE sync_operations SET intentos = intentos + 1 WHERE id_cliente = ?', [
        idCliente
      ]);

      return { claimed: false, operation: existente };
    } catch (err) {
      throw new DatabaseError('Error al reclamar la operación sincronizada', err);
    }
  }

  /**
   * Cierra la operación con la respuesta que hay que replicar. `fallida` se usa
   * cuando el servidor respondió 5xx: se guarda su respuesta real (más útil para
   * revisar que un texto genérico) y no se reintenta sola.
   */
  static async resolve(
    idCliente: string,
    estado: Extract<SyncOperationEstado, 'aplicada' | 'rechazada' | 'fallida'>,
    response: SyncOperationResponse
  ): Promise<void> {
    try {
      await query(
        `UPDATE sync_operations
            SET estado = ?, respuesta = ?, aplicado_en = ?
          WHERE id_cliente = ?`,
        [estado, JSON.stringify(response), getNowInBusinessTimezone(), idCliente]
      );
    } catch (err) {
      // La operación de negocio ya se resolvió: no se puede tirar el request
      // por no poder auditar el intento.
      logger.captureException(err, { context: 'SyncOperationRepository:resolve', idCliente });
    }
  }

  /** Marca el intento como fallido (el handler lanzó). */
  static async fail(idCliente: string, message: string): Promise<void> {
    try {
      await query(
        `UPDATE sync_operations
            SET estado = 'fallida', respuesta = ?, aplicado_en = ?
          WHERE id_cliente = ?`,
        [
          JSON.stringify({ status: 500, body: { success: false, message } }),
          getNowInBusinessTimezone(),
          idCliente
        ]
      );
    } catch (err) {
      logger.captureException(err, { context: 'SyncOperationRepository:fail', idCliente });
    }
  }

  /** Operaciones sin resolver, para el panel de revisión. */
  static async getPendientes(limit: number = 100): Promise<SyncOperation[]> {
    try {
      const rows = await query<Record<string, unknown>[]>(
        `SELECT * FROM sync_operations
          WHERE estado IN ('pendiente', 'fallida')
          ORDER BY creado_en DESC
          LIMIT ?`,
        [limit]
      );
      return rows.map(mapRow);
    } catch (err) {
      throw new DatabaseError('Error al listar las operaciones pendientes', err);
    }
  }

  /** Lectura tolerante de la respuesta guardada. */
  static parseResponse(operation: Pick<SyncOperation, 'respuesta'>): SyncOperationResponse | null {
    if (!operation.respuesta) return null;

    try {
      const parsed = JSON.parse(operation.respuesta) as Partial<SyncOperationResponse>;
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        status: Number(parsed.status ?? 200),
        body: parsed.body ?? {}
      };
    } catch {
      return null;
    }
  }
}
