'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AsistenciaStats } from '@/types/asistencia'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, CheckCircle, XCircle } from 'lucide-react'
import { formatLongDateEs, getTodayDateKey } from '@/lib/calendarUtils'

interface AttendanceStatsCardProps {
  stats: AsistenciaStats
  isLoading?: boolean
}

export default function AttendanceStatsCard({ stats, isLoading = false }: AttendanceStatsCardProps) {
  if (isLoading) {
    return (
      <Card className='shadow-sm'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-lg sm:text-xl flex items-center gap-2'>
            <Calendar className='w-5 h-5' />
            Estadísticas de Asistencia
          </CardTitle>
        </CardHeader>
        <CardContent className='p-4 sm:p-6'>
          <p className='text-sm sm:text-base'>Cargando estadísticas...</p>
        </CardContent>
      </Card>
    )
  }

  const isToday = stats.fechaApertura === stats.fechaCierre && 
    stats.fechaApertura === getTodayDateKey();

  return (
    <Card className='shadow-sm'>
      <CardHeader className='pb-4'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg sm:text-xl flex items-center gap-2'>
            <Calendar className='w-5 h-5' />
            Estadísticas de Asistencia
          </CardTitle>
          <Badge variant={isToday ? 'default' : 'secondary'} className='text-xs'>
            {isToday ? 'Hoy' : 'Período'}
          </Badge>
        </div>
        {stats.fechaApertura && (
          <div className='text-sm text-muted-foreground'>
            Período: {formatLongDateEs(stats.fechaApertura)}
            {stats.fechaCierre && stats.fechaCierre !== stats.fechaApertura && 
              ` - ${formatLongDateEs(stats.fechaCierre)}`
            }
          </div>
        )}
      </CardHeader>
      <CardContent className='p-4 sm:p-6'>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Users className='w-4 h-4 text-blue-600' />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Usuarios</span>
            </div>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{stats.total}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className='w-4 h-4 text-green-600' />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Presentes</span>
            </div>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.presentes}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className='w-4 h-4 text-red-600' />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Ausentes</span>
            </div>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.ausentes}</span>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium">Porcentaje de Asistencia</span>
            <Badge variant={stats.porcentajeAsistencia >= 80 ? "default" : stats.porcentajeAsistencia >= 60 ? "secondary" : "destructive"}>
              {stats.porcentajeAsistencia}%
            </Badge>
          </div>
          <div className="w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-2 transition-all duration-300 ${
                stats.porcentajeAsistencia >= 80 ? 'bg-green-500' : 
                stats.porcentajeAsistencia >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.porcentajeAsistencia}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
