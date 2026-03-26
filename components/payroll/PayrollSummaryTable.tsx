 
'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/utils'

interface PayrollSummaryTableProps {
  data: any[]
  isLoading?: boolean
}

export default function PayrollSummaryTable({ data = [], isLoading = false }: PayrollSummaryTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre(s) Apellido(s)</TableHead>
            <TableHead>Asistencias (Días)</TableHead>
            <TableHead className="text-right">Sueldo</TableHead>
            <TableHead className="text-right">Descuento AFP</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {isLoading ? 'Cargando...' : 'No hay datos disponibles'}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id_usuario}>
                <TableCell>
                  {item.nombre_completo}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {item.total_asistencias} Días Asistidos
                  </span>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.sueldo_total)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.aporte_total + item.descuento_total)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.total_final)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
