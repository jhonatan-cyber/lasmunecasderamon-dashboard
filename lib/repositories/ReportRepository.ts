import { getSalesReport } from './report/SalesReportQueries';
import { getCommissionsReport } from './report/CommissionReportQueries';
import { getCashRegisterReport } from './report/CashReportQueries';

export class ReportRepository {
  static getSalesReport = getSalesReport;
  static getCommissionsReport = getCommissionsReport;
  static getCashRegisterReport = getCashRegisterReport;
}
