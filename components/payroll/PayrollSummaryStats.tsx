'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/utils'

interface PayrollSummaryStatsProps {
  totals: {
    sueldo: number
    descuento: number
    total: number
  }
  isLoading?: boolean
}

export default function PayrollSummaryStats({ 
  totals, 
  isLoading = false 
}: PayrollSummaryStatsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Planilla</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Cargando estadísticas...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Planilla</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">Total Sueldos</span>
            <span className="text-2xl font-bold">{formatCurrency(totals.sueldo)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">Total Descuentos</span>
            <span className="text-2xl font-bold text-red-600">{formatCurrency(totals.descuento)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">Total a Pagar</span>
            <span className="text-2xl font-bold text-green-600">{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}