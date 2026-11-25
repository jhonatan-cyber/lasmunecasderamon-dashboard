import { getCashRegisterReport } from './caja';
import { getCommissionsReport } from './comisiones';
import { getSalesReport } from './ventas';

export class ReportService {
  static getSalesReport = getSalesReport;
  static getCommissionsReport = getCommissionsReport;
  static getCashRegisterReport = getCashRegisterReport;
}
