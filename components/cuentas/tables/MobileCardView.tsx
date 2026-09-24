'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  CreditCard,
  ShoppingCart,
  User,
  Bed,
  Calendar,
  Clock,
  DollarSign,
  Receipt,
  Ban
} from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatShortDmyDateEs } from '@/lib/utils/calendarUtils';
import { CuentaTimerStatus } from './CuentaTimerStatus';
import type { CuentaTableViewsProps } from './CuentaTableViewsProps';

export const MobileCardView = React.memo(function MobileCardView({
  rows,
  getEstadoBadge,
  hasAnyAction,
  canViewDetails,
  canAddProducts,
  canCobrar,
  handleVerDetalles,
  handleFinalizarTemporizador,
  handleAgregarProductos,
  handleCobrarCuenta,
  handleSolicitarAnulacion,
  getTimerByServicioId
}: CuentaTableViewsProps) {
  return (
    <div className='space-y-4 lg:hidden'>
      {rows.map(cuenta => (
        <Card key={cuenta.id_cuenta} className='shadow-xs hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='space-y-2'>
                  <h3 className='font-semibold text-lg text-gray-900'>{cuenta.codigo}</h3>
                  <CuentaTimerStatus cuenta={cuenta} />
                </div>
                <Badge variant={getEstadoBadge(cuenta.estado).variant}>
                  {getEstadoBadge(cuenta.estado).label}
                </Badge>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <User className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Cliente:</span>
                  <span className='text-gray-700'>
                    {cuenta.cliente_nombre || `Cliente ${cuenta.cliente_id}`}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Bed className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Habitación:</span>
                  <span className='text-gray-700'>
                    {cuenta.habitacion_numero || cuenta.habitacion_id || 'N/A'}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Sub Total:</span>
                  <span className='text-gray-700 font-semibold'>
                    {formatCurrencyNoDecimals(cuenta.sub_total)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Receipt className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Comisión:</span>
                  <span className='text-gray-700'>
                    {formatCurrencyNoDecimals(cuenta.total_comision)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Total:</span>
                  <span className='text-gray-700 font-semibold'>
                    {formatCurrencyNoDecimals(cuenta.total)}
                  </span>
                </div>

                {cuenta.estado === 4 && (
                  <div className='flex items-center gap-2 sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20'>
                    <DollarSign className='text-amber-600 w-4 h-4' />
                    <span className='font-medium text-amber-700 dark:text-amber-300'>
                      Saldo restante:
                    </span>
                    <span className='font-semibold text-amber-700 dark:text-amber-300'>
                      {formatCurrencyNoDecimals(cuenta.total)}
                    </span>
                  </div>
                )}

                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Fecha:</span>
                  <span className='text-gray-700'>{formatShortDmyDateEs(cuenta.fecha_crea)}</span>
                </div>
              </div>

              {hasAnyAction && (
                <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                  {canViewDetails && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleVerDetalles(cuenta)}
                      className='flex-1 rounded-full bg-blue-50 border-blue-200 hover:bg-blue-700 hover:text-white text-xs'
                    >
                      <Eye className='w-3 h-3 mr-1' />
                      Ver Detalles
                    </Button>
                  )}

                  {cuenta.estado === 1 && (
                    <>
                      {getTimerByServicioId(String(cuenta.id_cuenta))?.isActive && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleFinalizarTemporizador(cuenta)}
                          className='flex-1 rounded-full bg-amber-50 border-amber-200 hover:bg-amber-700 hover:text-white text-xs'
                        >
                          <Clock className='w-3 h-3 mr-1' />
                          Finalizar Timer
                        </Button>
                      )}

                      {canAddProducts && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleAgregarProductos(cuenta)}
                          className='flex-1 rounded-full bg-green-50 border-green-200 hover:bg-green-700 hover:text-white text-xs'
                        >
                          <ShoppingCart className='w-3 h-3 mr-1' />
                          Agregar
                        </Button>
                      )}

                      {canCobrar && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleCobrarCuenta(cuenta)}
                          className='flex-1 rounded-full bg-red-50 border-red-200 hover:bg-red-700 hover:text-white text-xs'
                        >
                          <CreditCard className='w-3 h-3 mr-1' />
                          Cobrar
                        </Button>
                      )}

                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleSolicitarAnulacion(cuenta)}
                        className='flex-1 rounded-full bg-orange-50 border-orange-200 hover:bg-orange-700 hover:text-white text-xs'
                      >
                        <Ban className='w-3 h-3 mr-1' />
                        Anular
                      </Button>
                    </>
                  )}

                  {cuenta.estado === 4 && canCobrar && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleCobrarCuenta(cuenta)}
                      className='flex-1 rounded-full bg-red-50 border-red-200 hover:bg-red-700 hover:text-white text-xs'
                    >
                      <CreditCard className='w-3 h-3 mr-1' />
                      Cobrar saldo
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
