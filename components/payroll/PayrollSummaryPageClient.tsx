'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { useState } from 'react';
import { usePayrollSummary } from '@/hooks/staff';
import PayrollSummaryStats from '@/components/payroll/PayrollSummaryStats';
import PayrollSummaryList from '@/components/payroll/PayrollSummaryList';

export function PayrollSummaryPageClient() {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const { data, totals, isLoading, error } = usePayrollSummary(month, year);

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold tracking-tight'>Detalle Planillas</h1>
      </div>

      {error ? (
        <ErrorState title='Error' message={error} />
      ) : (
        <>
          <PayrollSummaryStats totals={totals} isLoading={isLoading} />
          <PayrollSummaryList
            data={data}
            isLoading={isLoading}
            onFilterChange={(newMonth, newYear) => {
              setMonth(newMonth);
              setYear(newYear);
            }}
          />
        </>
      )}
    </div>
  );
}
