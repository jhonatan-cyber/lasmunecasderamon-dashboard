'use client';
import { ReportToolbar, type ReportToolbarProps } from '@/components/shared/ReportToolbar';

export function CommissionsReportFilters(props: Omit<ReportToolbarProps<string>, 'periods'>) {
  return (
    <ReportToolbar
      {...props}
      periods={[
        { id: 'current_month', label: 'Mes Actual' },
        { id: 'last_month', label: 'Mes Anterior' },
        { id: 'current_year', label: 'Año Actual' },
        { id: 'last_year', label: 'Año Anterior' },
        { id: 'custom', label: 'Personalizado' }
      ]}
    />
  );
}
