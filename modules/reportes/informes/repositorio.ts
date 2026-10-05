import { getSalesReport } from '@/modules/reportes/informes/ventas';
import { getCommissionsReport } from '@/modules/reportes/informes/comisiones';
import { getCashRegisterReport } from '@/modules/reportes/informes/caja';

export class ReportRepository {
  static getSalesReport = getSalesReport;
  static getCommissionsReport = getCommissionsReport;
  static getCashRegisterReport = getCashRegisterReport;
}
