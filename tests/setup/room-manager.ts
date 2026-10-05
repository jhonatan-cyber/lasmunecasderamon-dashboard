import type { TransactionQuery } from '@/lib/database/db';
import { conContextoOperacionExistente } from './contexto-operacion';
import {
  pausarConflictos,
  liberarHabitacionPorAnulacion
} from '@/modules/operacion/facturacion/servicio';

/** Conserva las pruebas de comportamiento heredadas sobre los casos de uso actuales. */
export class RoomManager {
  static pauseConflictingServices(
    trx: TransactionQuery,
    ids: string[],
    servicioId?: string,
    ventaId?: string
  ) {
    return conContextoOperacionExistente(trx, contexto =>
      pausarConflictos(ids, contexto, servicioId, ventaId)
    );
  }
  static resumeRoomLogic(
    trx: TransactionQuery,
    habitacionId: string,
    servicioId?: string,
    ventaId?: string
  ) {
    return conContextoOperacionExistente(trx, contexto =>
      liberarHabitacionPorAnulacion(habitacionId, contexto, ventaId, servicioId)
    );
  }
}
