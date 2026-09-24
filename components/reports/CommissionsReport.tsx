'use client';

import logger from '@/lib/utils/logger';
import { useCommissionsReport } from './hooks/useCommissionsReport';
import { CommissionsReportFilters } from './CommissionsReportFilters';
import { CommissionsStatsCards } from './CommissionsStatsCards';
import { TopPerformersChart } from './TopPerformersChart';
import { CommissionsTable } from './CommissionsTable';
import { DailyCommissionsChart } from './DailyCommissionsChart';

export function CommissionsReport() {
  const {
    period,
    startDate,
    endDate,
    data,
    loading,
    error,
    tablePage,
    totalPages,
    setPeriod,
    setStartDate,
    setEndDate,
    setTablePage,
    topPerformerChartData,
    dailyChartData
  } = useCommissionsReport();

  const exportReport = () => {
    logger.info('Exportando reporte de comisiones...');
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-2 text-sm text-gray-600'>Cargando reporte de comisiones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center text-red-600'>
        <p className='text-sm'>Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className='text-center text-gray-600'>
        <p className='text-sm'>No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className='space-y-8 pb-10'>
      <CommissionsReportFilters
        period={period}
        startDate={startDate}
        endDate={endDate}
        onPeriodChange={setPeriod}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onExport={exportReport}
      />

      <CommissionsStatsCards statistics={data.statistics} />

      <TopPerformersChart data={topPerformerChartData} />

      <CommissionsTable
        commissions={data.commissions}
        statistics={data.statistics}
        tablePage={tablePage}
        totalPages={totalPages}
        onPageChange={setTablePage}
      />

      <DailyCommissionsChart data={dailyChartData} />
    </div>
  );
}
