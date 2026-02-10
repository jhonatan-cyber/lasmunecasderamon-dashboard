'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import usePayrollSummary from '@/hooks/personal/usePayrollSummary'
import PayrollSummaryStats from '@/components/payroll/PayrollSummaryStats'
import PayrollSummaryList from '@/components/payroll/PayrollSummaryList'

export default function PayrollSummaryPage() {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const { data, totals, isLoading, error } = usePayrollSummary(month, year)

  const handleFilterChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth)
    setYear(newYear)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Detalle Planillas</h1>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Ocurrió un error al cargar los datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PayrollSummaryStats totals={totals} isLoading={isLoading} />
          <PayrollSummaryList 
            data={data} 
            isLoading={isLoading} 
            onFilterChange={handleFilterChange} 
          />
        </>
      )}
    </div>
  )
}