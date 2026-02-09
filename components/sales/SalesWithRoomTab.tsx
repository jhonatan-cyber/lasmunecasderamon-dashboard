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

  console.log('[SalesWithRoomTab] Renderizando con ventas:', ventas.length);

  // Forzar re-render cuando cambian los timers
  useEffect(() => {
    forceUpdate({});
  }, [timers]);

  // Filtrar ventas que tienen habitación asignada (habitacion_id > 0)
  // Y que tienen un temporizador activo con tiempo restante > 0
  const ventasConHabitacion = ventas.filter(v => {
    if (!v.habitacion_id || v.habitacion_id <= 0) {
      console.log(`[SalesWithRoomTab] Venta ${v.id} sin habitación`);
      return false;
    }
    
    const timer = getTimerByServicioId(v.id);
    console.log(`[SalesWithRoomTab] Venta ${v.id} - habitacion_id: ${v.habitacion_id}, timer:`, timer);
    
    // Solo mostrar si tiene timer activo con tiempo restante
    const hasActiveTimer = timer && timer.isActive && timer.remainingTime > 0;
    console.log(`[SalesWithRoomTab] Venta ${v.id} - hasActiveTimer: ${hasActiveTimer}`);
    
    return hasActiveTimer;
  });

  console.log('[SalesWithRoomTab] Ventas con habitación filtradas:', ventasConHabitacion.length);

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p className='text-gray-500 dark:text-gray-400'>Cargando ventas con habitación...</p>
      </div>
    );
  }

  if (ventasConHabitacion.length === 0) {
    return (
      <div className='text-center py-12 bg-white dark:bg-neutral-900 rounded-lg border dark:border-neutral-800 shadow-sm'>
        <Bed className='h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4' />
        <h3 className='text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2'>
          No hay ventas con habitación activas
        </h3>
        <p className='text-gray-600 dark:text-neutral-400'>
          Las ventas con habitación y temporizador activo aparecerán aquí.
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
            Ventas con Habitación Activas
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
