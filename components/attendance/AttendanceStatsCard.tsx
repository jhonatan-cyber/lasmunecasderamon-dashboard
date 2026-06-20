'use client';

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
            className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden h-[160px]'
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
      <Card
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full'>
              Asistencia
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Presentes
            </p>
            <h3 className='text-xl font-black text-emerald-900 dark:text-emerald-100'>
              {stats.presentes}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-emerald-700 font-black text-sm'>
                {stats.porcentajeAsistencia}%
              </span>
              <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
                Tasa de asistencia
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-rose-500/20 rounded-2xl'>
              <XCircle className='h-4 w-4 text-rose-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-rose-700 bg-rose-500/10 px-2 py-1 rounded-full'>
              Faltas
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-rose-700/60 uppercase tracking-widest'>
              Ausentes
            </p>
            <h3 className='text-xl font-black text-rose-900 dark:text-rose-100'>
              {stats.ausentes}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-rose-700 font-black text-sm'>
                {100 - stats.porcentajeAsistencia}%
              </span>
              <span className='text-[10px] text-rose-700/50 font-medium uppercase tracking-tighter italic'>
                Tasa de inasistencia
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
              <Users className='h-4 w-4 text-blue-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full'>
              Plantilla
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>
              Total Usuarios
            </p>
            <h3 className='text-xl font-black text-blue-900 dark:text-blue-100'>{stats.total}</h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <CalendarDays className='h-3 w-3 text-blue-700' />
              <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
                {isToday ? 'Hoy' : dateDisplay}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
