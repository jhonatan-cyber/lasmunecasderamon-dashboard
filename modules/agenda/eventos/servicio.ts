import { EventRepository } from '@/modules/agenda/eventos/repositorio';

/**
 * Feed de eventos del usuario (ventas, propinas, asistencia, anticipos, comisiones...).
 *
 * El dashboard web consume `composite.recentActivity`, pero la app móvil sigue usando
 * estos endpoints con filtro por fechas y detalle por tipo, por lo que se restauran
 * (se habían borrado en a414a7e como "rutas muertas" solo desde la perspectiva del web).
 */
export class EventService {
  static canReadEvent = EventRepository.canReadEvent;
  static async getStats(userId: string) {
    return await EventRepository.getStats(userId);
  }

  static async getUserEvents(userId: string, startDate?: string, endDate?: string) {
    return await EventRepository.getUserEvents(userId, startDate, endDate);
  }

  static async getEventDetail(id: string, type: string) {
    return await EventRepository.getEventDetail(id, type);
  }
}
