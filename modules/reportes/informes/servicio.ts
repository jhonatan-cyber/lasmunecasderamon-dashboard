import { ReportRepository } from './repositorio';

export class ReportService {
  static getSalesReport(...args: Parameters<typeof ReportRepository.getSalesReport>) {
    return ReportRepository.getSalesReport(...args);
  }

  static getCommissionsReport(...args: Parameters<typeof ReportRepository.getCommissionsReport>) {
    return ReportRepository.getCommissionsReport(...args);
  }

  static getCashRegisterReport(...args: Parameters<typeof ReportRepository.getCashRegisterReport>) {
    return ReportRepository.getCashRegisterReport(...args);
  }
}
