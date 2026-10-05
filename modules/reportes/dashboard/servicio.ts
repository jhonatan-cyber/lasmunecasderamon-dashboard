import { StatsRepository } from '@/modules/reportes/dashboard/repositorio';

export class StatsService {
  static async getDashboardAlerts() {
    return await StatsRepository.getDashboardAlerts();
  }

  static async getDashboardPendingItems() {
    return await StatsRepository.getDashboardPendingItems();
  }

  static async getDashboardInsights() {
    return await StatsRepository.getDashboardInsights();
  }

  static async getRecentActivity(limit: number = 8) {
    return await StatsRepository.getRecentActivity(limit);
  }

  static async getHabitacionesStats(cajaId: string) {
    return await StatsRepository.getHabitacionesStats(cajaId);
  }

  static async getCajaGeneralStats() {
    return await StatsRepository.getCajaGeneralStats();
  }

  static async getLoggedUsers() {
    return await StatsRepository.getLoggedUsers();
  }

  static async getSalesByMonth(offset: number = 0) {
    return await StatsRepository.getSalesByMonth(offset);
  }

  static async getSalesByWeek(offset: number = 0) {
    return await StatsRepository.getSalesByWeek(offset);
  }

  static async getDashboardComposite() {
    return await StatsRepository.getDashboardComposite();
  }

  static async getUserDashboardSummary(userId: string, role: string) {
    return await StatsRepository.getUserDashboardSummary(userId, role);
  }
}
