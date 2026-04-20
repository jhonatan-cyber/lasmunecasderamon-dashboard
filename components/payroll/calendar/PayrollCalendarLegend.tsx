'use client';

import { Clock, DollarSign, Gift, ShoppingCart, Users, Zap } from 'lucide-react';

interface PayrollCalendarLegendProps {
  canViewDetails: boolean;
}

export function PayrollCalendarLegend({ canViewDetails }: PayrollCalendarLegendProps) {
  return (
    <div className='border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800'>
      <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
        Leyenda de Acciones
      </h3>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3'>
        <div className='flex items-center gap-2 text-xs'>
          <ShoppingCart className='w-4 h-4 text-green-600' />
          <span className='text-gray-600 dark:text-gray-400'>V - Venta</span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <Users className='w-4 h-4 text-blue-600' />
          <span className='text-gray-600 dark:text-gray-400'>S - Servicio</span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <Clock className='w-4 h-4 text-purple-600' />
          <span className='text-gray-600 dark:text-gray-400'>A - Asistencia</span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <Gift className='w-4 h-4 text-yellow-600' />
          <span className='text-gray-600 dark:text-gray-400'>P - Propina</span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <DollarSign className='w-4 h-4 text-red-600' />
          <span className='text-gray-600 dark:text-gray-400'>Ant - Anticipo</span>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <Zap className='w-4 h-4 text-orange-600' />
          <span className='text-gray-600 dark:text-gray-400'>HE - Hora Extra</span>
        </div>
      </div>
      <div className='mt-3 text-xs text-gray-500 dark:text-gray-400'>
        <p>• Los símbolos aparecen en las fechas donde se registraron acciones</p>
        <p>• Se muestra un símbolo por cada tipo de acción</p>
        <p>• Si hay múltiples acciones del mismo tipo, se muestra el total</p>
        {canViewDetails ? (
          <p>• Seleccioná fechas para ver los detalles de ventas y servicios</p>
        ) : (
          <p className='text-amber-600 dark:text-amber-400 font-medium'>
            ⚠️ No tenés permiso para ver los detalles de las fechas
          </p>
        )}
      </div>
    </div>
  );
}
