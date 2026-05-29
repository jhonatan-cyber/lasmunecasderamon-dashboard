'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logger from '@/lib/utils/logger';

import {
  Clock,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  User,
  History
} from 'lucide-react';

interface LogEntry {
  id: number;
  tipo_evento: string;
  descripcion: string;
  fecha_crea: string;
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_nick: string;
}

interface ServiceTimelineProps {
  servicioId?: number;
}

export const ServiceTimeline: React.FC<ServiceTimelineProps> = ({ servicioId }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!servicioId) return;
      try {
        const response = await fetch(`/api/servicios/${servicioId}/logs`);
        const data = await response.json();
        if (data.success) {
          setLogs(data.data);
        }
      } catch (error) {
        logger.captureException(error, { context: 'ServiceTimeline:fetchLogs' });
      } finally {
        setLoading(false);
      }
    };

    if (servicioId) fetchLogs();
  }, [servicioId]);

  const getEventIcon = (tipo: string) => {
    switch (tipo) {
      case 'CREACION':
      case 'CREACION_TEMPORAL':
        return <PlusCircle className='w-4 h-4 text-blue-500' />;
      case 'PAUSA':
        return <Pause className='w-4 h-4 text-orange-500' />;
      case 'REANUDACION':
        return <Play className='w-4 h-4 text-green-500' />;
      case 'FINALIZADO':
        return <CheckCircle2 className='w-4 h-4 text-emerald-500' />;
      case 'ANULADO':
        return <AlertCircle className='w-4 h-4 text-red-500' />;
      default:
        return <History className='w-4 h-4 text-gray-500' />;
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center p-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className='text-center p-8 text-gray-500'>
        No hay historial disponible para este servicio.
      </div>
    );
  }

  return (
    <div className='relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent dark:before:via-slate-700'>
      {logs.map((log, index) => (
        <div key={log.id} className='relative flex items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <div className='absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 z-10'>
              {getEventIcon(log.tipo_evento)}
            </div>
            <div className='ml-12'>
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-sm font-bold text-slate-900 dark:text-slate-100'>
                  {log.tipo_evento.replace('_', ' ')}
                </span>
                <span className='text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1'>
                  <Clock className='w-3 h-3' />
                  {format(new Date(log.fecha_crea), 'HH:mm', { locale: es })}
                </span>
              </div>
              <p className='text-sm text-slate-600 dark:text-slate-400 leading-relaxed'>
                {log.descripcion}
              </p>
              {log.usuario_nombre && (
                <div className='flex items-center gap-1 mt-2 text-xs font-medium text-slate-500 dark:text-slate-500'>
                  <User className='w-3 h-3' />
                  {log.usuario_nick || `${log.usuario_nombre} ${log.usuario_apellido}`}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
