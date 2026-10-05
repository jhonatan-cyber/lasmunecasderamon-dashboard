import { type StatsGeneralType } from '@/lib/business/schemas';
import { StatsQueries } from '@/modules/reportes/dashboard/consultas';

export class StatsRepository {
  static async getDashboardAlerts() {
    return await StatsQueries.getDashboardAlerts();
  }

  static async getDashboardPendingItems() {
    return await StatsQueries.getDashboardPendingItems();
  }

  static async getDashboardInsights() {
    return await StatsQueries.getDashboardInsights();
  }

  static async getRecentActivity(limit: number = 8) {
    return await StatsQueries.getRecentActivity(limit);
  }

  static async getHabitacionesStats(cajaId: string) {
    return await StatsQueries.getHabitacionesStats(cajaId);
  }

  static async getCajaGeneralStats(): Promise<any> {
    return await StatsQueries.getCajaGeneralStats();
  }

  static async getLoggedUsers() {
    return await StatsQueries.getLoggedUsers();
  }

  static async getSalesByMonth(offset: number = 0) {
    return await StatsQueries.getSalesByMonth(offset);
  }

  static async getSalesByWeek(offset: number = 0) {
    return await StatsQueries.getSalesByWeek(offset);
  }

  static async getDashboardComposite() {
    return await StatsQueries.getDashboardComposite();
  }

  static async getUserDashboardSummary(userId: string, role: string) {
    return await StatsQueries.getUserDashboardSummary(userId, role);
  }
}
