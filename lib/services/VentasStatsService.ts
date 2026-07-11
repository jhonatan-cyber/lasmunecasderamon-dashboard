import { VentasStatsRepository } from '@/lib/repositories/VentasStatsRepository';

export class VentasStatsService {
  static async getVentasBarras(caja_id: string) {
    return await VentasStatsRepository.getVentasBarras(caja_id);
  }

  static async getVentasChampagne(caja_id: string) {
    return await VentasStatsRepository.getVentasChampagne(caja_id);
  }

  static async getVentasTragosChicas(caja_id: string) {
    return await VentasStatsRepository.getVentasTragosChicas(caja_id);
  }
}
