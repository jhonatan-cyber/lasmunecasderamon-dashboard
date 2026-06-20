'use client';

import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { User, Home, Clock, CreditCard, DollarSign, Users, Calendar, Receipt } from 'lucide-react';

interface ServiceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: ServicioWithDetails | null;
}

export function ServiceDetailModal({ open, onOpenChange, servicio }: ServiceDetailModalProps) {
  if (!servicio) return null;

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return (
          <Badge
            variant='destructive'
            className='bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          >
            Anulado
          </Badge>
        );
      case 1:
        return (
          <Badge className='bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
            Finalizado
          </Badge>
        );
      case 2:
        return (
          <Badge className='bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'>
            En Proceso
          </Badge>
        );
      case 3:
        return (
          <Badge className='bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'>
            Pausado
          </Badge>
        );
      case 4:
        return (
          <Badge className='bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'>
            Solicitud Anulación
          </Badge>
        );
      default:
        return <Badge variant='outline'>Desconocido</Badge>;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        {}
        <DialogHeader className='p-6 pb-4 border-b shrink-0'>
          <DialogTitle className='text-xl font-bold flex items-center gap-3'>
            Detalle del Servicio
            <span className='text-lg font-normal text-gray-500'>#{servicio.codigo}</span>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Detalle completo del servicio privado
          </DialogDescription>
        </DialogHeader>

        {}
        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-6'>
          {}
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium text-gray-500'>Estado</span>
            {getEstadoBadge(servicio.estado)}
          </div>

          {}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {}
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
              <div className='flex items-center gap-2 text-gray-500 mb-2'>
                <User className='w-4 h-4' />
                <span className='text-xs font-bold uppercase tracking-wider'>Cliente</span>
              </div>
              <p className='text-gray-900 dark:text-gray-100 font-medium'>
                {servicio.cliente_nombre || 'Particular'}
              </p>
            </div>

            {}
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
              <div className='flex items-center gap-2 text-gray-500 mb-2'>
                <Home className='w-4 h-4' />
                <span className='text-xs font-bold uppercase tracking-wider'>Habitación</span>
              </div>
              <p className='text-gray-900 dark:text-gray-100 font-medium'>
                {servicio.habitacion_numero || 'Servicio de barra'}
              </p>
            </div>

            {}
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
              <div className='flex items-center gap-2 text-gray-500 mb-2'>
                <Clock className='w-4 h-4' />
                <span className='text-xs font-bold uppercase tracking-wider'>Tiempo</span>
              </div>
              <p className='text-gray-900 dark:text-gray-100 font-medium'>
                {servicio.tiempo} minutos
              </p>
            </div>

            {}
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
              <div className='flex items-center gap-2 text-gray-500 mb-2'>
                <CreditCard className='w-4 h-4' />
                <span className='text-xs font-bold uppercase tracking-wider'>Método de Pago</span>
              </div>
              <p className='text-gray-900 dark:text-gray-100 font-medium capitalize'>
                {servicio.metodo_pago || 'No especificado'}
              </p>
            </div>
          </div>

          {}
          {servicio.anfitrionas_nombres && (
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
              <div className='flex items-center gap-2 text-gray-500 mb-2'>
                <Users className='w-4 h-4' />
                <span className='text-xs font-bold uppercase tracking-wider'>Anfitrionas</span>
              </div>
              <p className='text-gray-900 dark:text-gray-100 font-medium'>
                {servicio.anfitrionas_nombres}
              </p>
              {servicio.total_usuarios && (
                <p className='text-sm text-gray-500 mt-1'>
                  Total: {servicio.total_usuarios} anfitriona
                  {servicio.total_usuarios > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
              <div className='flex items-center gap-2 text-gray-500 mb-2'>
                <Calendar className='w-4 h-4' />
                <span className='text-xs font-bold uppercase tracking-wider'>Creado</span>
              </div>
              <p className='text-gray-900 dark:text-gray-100 font-medium'>
                {formatDate(servicio.fecha_crea)}
              </p>
            </div>
            {servicio.fecha_mod && (
              <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
                <div className='flex items-center gap-2 text-gray-500 mb-2'>
                  <Calendar className='w-4 h-4' />
                  <span className='text-xs font-bold uppercase tracking-wider'>
                    Última Modificación
                  </span>
                </div>
                <p className='text-gray-900 dark:text-gray-100 font-medium'>
                  {formatDate(servicio.fecha_mod)}
                </p>
              </div>
            )}
          </div>

          {}
          <div className='border-t pt-4'>
            <div className='flex items-center gap-2 text-gray-500 mb-3'>
              <Receipt className='w-4 h-4' />
              <span className='text-xs font-bold uppercase tracking-wider'>
                Desglose de Precios
              </span>
            </div>

            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3'>
              <div className='flex justify-between items-center'>
                <span className='text-gray-600 dark:text-gray-400'>Precio Habitación</span>
                <span className='font-medium'>
                  {formatCurrencyNoDecimals(servicio.precio_habitacion || 0)}
                </span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-gray-600 dark:text-gray-400'>Precio Servicio</span>
                <span className='font-medium'>
                  {formatCurrencyNoDecimals(servicio.precio_servicio || 0)}
                </span>
              </div>
              {servicio.sub_total > 0 && (
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600 dark:text-gray-400'>Subtotal</span>
                  <span className='font-medium'>
                    {formatCurrencyNoDecimals(servicio.sub_total)}
                  </span>
                </div>
              )}
              {servicio.iva > 0 && (
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600 dark:text-gray-400'>IVA</span>
                  <span className='font-medium'>{formatCurrencyNoDecimals(servicio.iva)}</span>
                </div>
              )}
              <div className='flex justify-between items-center pt-2 border-t'>
                <span className='font-bold text-gray-900 dark:text-gray-100'>TOTAL</span>
                <span className='font-bold text-lg text-green-600 dark:text-green-400'>
                  {formatCurrencyNoDecimals(servicio.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {}
          {(servicio.habitacion_comision ||
            servicio.total_comision ||
            servicio.comision_individual) && (
            <div className='border-t pt-4'>
              <div className='flex items-center gap-2 text-gray-500 mb-3'>
                <DollarSign className='w-4 h-4' />
                <span className='text-xs font-bold uppercase tracking-wider'>Comisiones</span>
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-3'>
                {servicio.habitacion_comision ? (
                  <>
                    <div className='flex justify-between items-center'>
                      <span className='text-gray-600 dark:text-gray-400'>Comisión Habitación</span>
                      <span className='font-bold text-green-600 dark:text-green-400'>
                        {formatCurrencyNoDecimals(Number(servicio.habitacion_comision))}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className='flex justify-between items-center'>
                      <span className='text-gray-600 dark:text-gray-400'>Total Comisión</span>
                      <span className='font-bold text-green-600 dark:text-green-400'>
                        {formatCurrencyNoDecimals(servicio.total_comision || 0)}
                      </span>
                    </div>
                  </>
                )}

                {}
                {servicio.anfitrionas_nombres &&
                  servicio.total_usuarios &&
                  servicio.comision_individual && (
                    <div className='pt-3 border-t border-green-200 dark:border-green-800'>
                      <p className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2'>
                        Distribución por anfitriona ({servicio.total_usuarios})
                      </p>
                      <div className='space-y-2'>
                        {servicio.anfitrionas_nombres.split(',').map((nombre, idx) => {
                          const nombreLimpio = nombre.trim();
                          if (!nombreLimpio) return null;
                          return (
                            <div
                              key={idx}
                              className='flex justify-between items-center py-1 px-2 bg-white dark:bg-green-900/30 rounded-lg'
                            >
                              <div className='flex items-center gap-2'>
                                <div className='w-6 h-6 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-300'>
                                  {idx + 1}
                                </div>
                                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                  {nombreLimpio}
                                </span>
                              </div>
                              <span className='text-sm font-semibold text-green-600 dark:text-green-400'>
                                {formatCurrencyNoDecimals(servicio.comision_individual)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {}
        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl shrink-0'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
