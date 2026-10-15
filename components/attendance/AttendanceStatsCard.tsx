'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { Card, CardContent } from '@/components/ui/card';
import { AsistenciaStats } from '@/types/asistencia';
import { Users, CheckCircle2, XCircle, Calendar, CalendarDays } from 'lucide-react';
import { formatLongDateEs, getTodayDateKey } from '@/lib/utils/calendarUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceStatsCardProps {
  stats: AsistenciaStats;
  isLoading?: boolean;
}

export default function AttendanceStatsCard({
  stats,
  isLoading = false
}: AttendanceStatsCardProps) {
  if (isLoading || !stats) {
    return (
      <div className='grid gap-4 grid-cols-2 md:grid-cols-3 mb-6 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1'>
        {[1, 2, 3].map(i => (
          <Card
            key={i}
            className='shadow-xs border-none backdrop-blur-xs rounded-3xl overflow-hidden h-[160px]'
          >
            <CardContent className='p-5 h-full flex flex-col justify-between'>
              <div className='flex justify-between'>
                <Skeleton className='h-10 w-10 rounded-2xl' />
                <Skeleton className='h-6 w-20 rounded-full' />
              </div>
              <div className='space-y-2 mt-4'>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-8 w-16' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isToday =
    stats.fechaApertura === stats.fechaCierre && stats.fechaApertura === getTodayDateKey();

  let dateDisplay = 'Sin registros';
  if (stats.fechaApertura) {
    if (stats.fechaCierre && stats.fechaCierre !== stats.fechaApertura) {
      dateDisplay = 'Período múltiple';
    } else {
      dateDisplay = formatLongDateEs(stats.fechaApertura);
    }
  }

  return (
    <div className='grid gap-4 grid-cols-2 md:grid-cols-3 mb-6 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1'>
      {}
      <MetricCard
        tone='emerald'
        icon={<CheckCircle2 className='h-4 w-4 text-emerald-600' />}
        badge='Asistencia'
        label='Presentes'
        value={stats.presentes}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-emerald-700 font-black text-sm'>
              {stats.porcentajeAsistencia}%
            </span>
            <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
              Tasa de asistencia
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='rose'
        icon={<XCircle className='h-4 w-4 text-rose-600' />}
        badge='Faltas'
        label='Ausentes'
        value={stats.ausentes}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-rose-700 font-black text-sm'>
              {100 - stats.porcentajeAsistencia}%
            </span>
            <span className='text-[10px] text-rose-700/50 font-medium uppercase tracking-tighter italic'>
              Tasa de inasistencia
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='blue'
        icon={<Users className='h-4 w-4 text-blue-600' />}
        badge='Plantilla'
        label='Total Usuarios'
        value={stats.total}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <CalendarDays className='h-3 w-3 text-blue-700' />
            <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
              {isToday ? 'Hoy' : dateDisplay}
            </span>
          </div>
        }
      />
    </div>
  );
}
