'use client';

import { VentaWithDetails } from '@/types/venta';
import SaleCard from './SaleCard';
import { useTimer } from '@/contexts/TimerContext';
import { ShoppingCart } from 'lucide-react';

interface SalesWithRoomTabProps {
  ventas: VentaWithDetails[];
  loading: boolean;
  onRefresh: () => void;
}

export default function SalesWithRoomTab({ ventas, loading, onRefresh }: SalesWithRoomTabProps) {
  const { timers } = useTimer();

  // Filtrar ventas que tienen un timer activo (tipoTransaccion === 'venta')
  const activeSaleTimers = timers.filter(t => t.tipoTransaccion === 'venta');
  const activeSaleIds = new Set(activeSaleTimers.map(t => t.servicioId));

  const ventasConHabitacion = ventas.filter(v => activeSaleIds.has(v.id));

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p className='text-gray-500'>Cargando ventas con habitación...</p>
      </div>
    );
  }

  if (ventasConHabitacion.length === 0) {
    return (
      <div className='text-center py-12 bg-white rounded-lg border shadow-sm'>
        <ShoppingCart className='h-12 w-12 text-gray-400 mx-auto mb-4' />
        <h3 className='text-lg font-medium text-gray-900 mb-2'>
          No hay ventas con habitación activas
        </h3>
        <p className='text-gray-600'>
          Las ventas que incluyen habitación y tienen un temporizador activo aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
      {ventasConHabitacion.map(venta => (
        <SaleCard key={venta.id} venta={venta} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
