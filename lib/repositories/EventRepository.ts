import { EventQueries } from './event/EventQueries';

export class EventRepository {
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
