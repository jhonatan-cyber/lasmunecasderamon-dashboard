'use client';
import {
  ReportToolbar,
  DAILY_REPORT_PERIODS,
  type ReportToolbarProps
} from '@/components/shared/ReportToolbar';
import type { SalesPeriod } from './hooks/useSalesReport';
export function SalesReportHeader(props: Omit<ReportToolbarProps<SalesPeriod>, 'periods'>) {
  return <ReportToolbar {...props} periods={DAILY_REPORT_PERIODS} />;
}
