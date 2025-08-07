'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AsistenciaStats } from '@/types/asistencia'

interface AttendanceStatsCardProps {
  stats: AsistenciaStats
  isLoading?: boolean
}

export default function AttendanceStatsCard({ stats, isLoading = false }: AttendanceStatsCardProps) {
  if (isLoading) {
    return (
      <Card className='shadow-sm'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-lg sm:text-xl'>Estadísticas de Asistencia</CardTitle>
        </CardHeader>
        <CardContent className='p-4 sm:p-6'>
          <p className='text-sm sm:text-base'>Cargando estadísticas...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='shadow-sm'>
      <CardHeader className='pb-4'>
        <CardTitle className='text-lg sm:text-xl'>Estadísticas de Asistencia</CardTitle>
      </CardHeader>
      <CardContent className='p-4 sm:p-6'>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-4">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.total}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Presentes</span>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.presentes}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Tardanzas</span>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{stats.tardanzas}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Ausentes</span>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.ausentes}</span>
          </div>
        </div>
        <div className="mt-4 sm:mt-6">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium">Porcentaje de Asistencia</span>
            <span className="text-xs sm:text-sm font-medium">{stats.porcentajeAsistencia}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-green-500"
              style={{ width: `${stats.porcentajeAsistencia}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}