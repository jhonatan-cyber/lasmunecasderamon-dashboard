import { CalendarRepository } from '@/modules/agenda/calendario/repositorio';

export class CalendarService {
  static async getData(startDate: string, endDate: string, type: 'servicios' | 'ventas') {
    return await CalendarRepository.getData(startDate, endDate, type);
  }

  static async getActions(startDate: string, endDate: string) {
    return await CalendarRepository.getActions(startDate, endDate);
  }
}
