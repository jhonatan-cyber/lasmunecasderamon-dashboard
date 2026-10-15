'use client';
import {
  ReportToolbar,
  DAILY_REPORT_PERIODS,
  type ReportToolbarProps
} from '@/components/shared/ReportToolbar';

export function CashRegisterHeader(props: Omit<ReportToolbarProps<string>, 'periods'>) {
  return <ReportToolbar {...props} periods={DAILY_REPORT_PERIODS} />;
}
