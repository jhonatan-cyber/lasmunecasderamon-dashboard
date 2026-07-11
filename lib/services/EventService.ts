import { EventRepository } from '@/lib/repositories/EventRepository';

export class EventService {
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
