 
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PayrollSummaryTable from './PayrollSummaryTable'

import { CalendarIcon, FilterIcon, RefreshCw } from 'lucide-react'

interface PayrollSummaryListProps {
  data: any[]
  isLoading?: boolean
  onFilterChange?: (month: number, year: number) => void
}

import { getTodayDateKey } from '@/lib/utils/calendarUtils'

export default function PayrollSummaryList({
  data = [],
  isLoading = false,
  onFilterChange,
}: PayrollSummaryListProps) {
  const todayStr = getTodayDateKey(); // "YYYY-MM-DD" in business timezone
  const [month, setMonth] = useState(parseInt(todayStr.substring(5, 7)))
  const [year, setYear] = useState(parseInt(todayStr.substring(0, 4)))

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value)
    setMonth(newMonth)
    if (onFilterChange) {
      onFilterChange(newMonth, year)
    }
  }

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value)
    setYear(newYear)
    if (onFilterChange) {
      onFilterChange(month, newYear)
    }
  }

  const handleReset = () => {
    const now = getTodayDateKey()
    const currentMonth = parseInt(now.substring(5, 7))
    const currentYear = parseInt(now.substring(0, 4))
    setMonth(currentMonth)
    setYear(currentYear)
    if (onFilterChange) {
      onFilterChange(currentMonth, currentYear)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Planillas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="month">Mes</Label>
            <Select value={month.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger id="month">
                <SelectValue placeholder="Seleccione un mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Enero</SelectItem>
                <SelectItem value="2">Febrero</SelectItem>
                <SelectItem value="3">Marzo</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Mayo</SelectItem>
                <SelectItem value="6">Junio</SelectItem>
                <SelectItem value="7">Julio</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Septiembre</SelectItem>
                <SelectItem value="10">Octubre</SelectItem>
                <SelectItem value="11">Noviembre</SelectItem>
                <SelectItem value="12">Diciembre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Año</Label>
            <Select value={year.toString()} onValueChange={handleYearChange}>
              <SelectTrigger id="year">
                <SelectValue placeholder="Seleccione un año" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => parseInt(getTodayDateKey().substring(0, 4)) - 2 + i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end space-x-2">
            <Button
              variant="outline"
              className="flex items-center gap-1"
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4" />
              Reiniciar
            </Button>
          </div>
        </div>

        <PayrollSummaryTable data={data} isLoading={isLoading} />
      </CardContent>
    </Card>
  )
}
