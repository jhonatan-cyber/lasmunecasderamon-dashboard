import { EventQueries } from '@/modules/agenda/eventos/consultas';

export class EventRepository {
  static canReadEvent = EventQueries.canReadEvent;
  static async getStats(userId: string) {
    return await EventQueries.getStats(userId);
  }

  static async getUserEvents(userId: string, startDate?: string, endDate?: string) {
    return await EventQueries.getUserEvents(userId, startDate, endDate);
  }

  static async getEventDetail(id: string, type: string) {
    return await EventQueries.getEventDetail(id, type);
  }
}
