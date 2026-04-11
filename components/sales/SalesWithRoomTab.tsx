'use client';

import { useEffect, useState } from 'react';
import { VentaWithDetails } from '@/types/venta';
import SaleCard from './SaleCard';
import { Bed } from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';

interface SalesWithRoomTabProps {
  ventas: VentaWithDetails[];
  loading: boolean;
  onRefresh: () => void;
}

export default function SalesWithRoomTab({ ventas, loading, onRefresh }: SalesWithRoomTabProps) {
  const { getTimerByServicioId, timers } = useTimer();
  const [, forceUpdate] = useState({});

  // Forzar re-render cuando cambian los timers
  useEffect(() => {
    forceUpdate({});
  }, [timers]);

  // Filtrar ventas que tienen habitaciÃ³n asignada
  // Y que estÃ¡n en estado 2 (En Proceso) O tienen un temporizador activo
  const ventasConHabitacion = ventas.filter(v => {
    // Si no tiene habitaciÃ³n vÃ¡lida vinculada, omitir
    const roomId = String(v.habitacion_id);
    if (!roomId || roomId === '0' || roomId === 'null' || roomId === 'undefined') {
      return false;
    }

    // Obtener el timer por su ID de venta (servicioId en el contexto)
    const timer = getTimerByServicioId(String(v.id));

    // Mostramos si el estado es 2 (activas/en proceso) o si tiene timer activo
    const isInProcess = Number(v.estado) === 2;
    const hasTimer = !!timer;

    return isInProcess || hasTimer;
  });

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p className='text-gray-500 dark:text-gray-400'>Cargando ventas con habitaciÃ³n...</p>
      </div>
    );
  }

  if (ventasConHabitacion.length === 0) {
    return (
      <div className='text-center py-12 bg-white dark:bg-neutral-900 rounded-lg border dark:border-neutral-800 shadow-sm'>
        <Bed className='h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4' />
        <h3 className='text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2'>
          No hay ventas con habitaciÃ³n activas
        </h3>
        <p className='text-gray-600 dark:text-neutral-400'>
          Las ventas con habitaciÃ³n y temporizador activo aparecerÃ¡n aquÃ­.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Bed className='h-5 w-5 text-gray-600 dark:text-gray-400' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-neutral-100'>
            Ventas con HabitaciÃ³n Activas
          </h3>
          <span className='px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full'>
            {ventasConHabitacion.length} {ventasConHabitacion.length === 1 ? 'venta' : 'ventas'}
          </span>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
        {ventasConHabitacion.map(venta => (
          <SaleCard key={venta.id} venta={venta} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
}
