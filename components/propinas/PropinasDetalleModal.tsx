/* eslint-disable */
'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { User, DollarSign, X } from 'lucide-react';
import {
  formatCurrencyNoDecimals,
  formatFechaLarga,
  formatSoloFecha,
  formatSoloHora
} from '@/lib/utils/formatters';
import { useTipsDetalle } from '@/hooks/personal/useTips';
import { PropinaResumen } from '@/types/propina';

interface PropinasDetalleModalProps {
  open: boolean;
  onClose: () => void;
  usuario: PropinaResumen | null;
}

export default function PropinasDetalleModal({
  open,
  onClose,
  usuario
}: PropinasDetalleModalProps) {
  const { detalles, loading, error, fetchDetalles } = useTipsDetalle(usuario?.id_usuario);

  useEffect(() => {
    if (open && usuario) {
      fetchDetalles(usuario.id_usuario);
    }
  }, [open, usuario]);

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[700px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b'>
          <DialogTitle className='text-center text-base sm:text-lg font-semibold'>
            Información de las Propinas
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-4'>
          {/* Información del usuario */}
          <div className='border-b pb-4 mb-4 flex flex-col items-center gap-1'>
            <div className='flex items-center gap-2 text-gray-700 text-sm sm:text-base'>
              <User className='text-gray-500 w-3 h-3 sm:w-4 sm:h-4' />
              <span className='font-medium text-xs sm:text-sm'>{usuario.nombre_completo}</span>
            </div>
            <div className='flex items-center gap-2 text-gray-700 text-sm sm:text-base'>
              <span className='text-xs text-gray-500'>@{usuario.nick}</span>
            </div>
            <div className='flex items-center gap-2 text-gray-700 text-sm sm:text-base'>
              <DollarSign className='text-gray-500 w-3 h-3 sm:w-4 sm:h-4' />
              <span className='font-medium text-xs sm:text-sm'>
                Total a pagar: {formatCurrencyNoDecimals(usuario.total_propinas)}
              </span>
            </div>
          </div>

          {/* Tabla de detalles */}
          <div>
            <h3 className='text-xs sm:text-sm font-semibold mb-4 text-center text-gray-600'>
              Detalle de las Propinas
            </h3>
            <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-gray-800 shadow-md overflow-hidden'>
              <Table className='min-w-full'>
                <TableHeader className='bg-gray-100/50 dark:bg-slate-900/50'>
                  <TableRow className='hover:bg-transparent border-b border-gray-100 dark:border-gray-800'>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 font-bold text-left'>FECHA HORA</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 font-bold text-left'>CODIGO VENTA</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 font-bold text-right'>MONTO</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 font-bold text-left'>FECHA PAGO</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 font-bold text-center'>ESTADO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className='border-b border-gray-100 dark:border-gray-800 last:border-0'>
                        <TableCell className='py-4 px-5'>
                          <Skeleton className='h-6 w-32' />
                        </TableCell>
                        <TableCell className='py-4 px-5'>
                          <Skeleton className='h-6 w-24' />
                        </TableCell>
                        <TableCell className='py-4 px-5'>
                          <Skeleton className='h-6 w-20 ml-auto' />
                        </TableCell>
                        <TableCell className='py-4 px-5'>
                          <Skeleton className='h-6 w-24' />
                        </TableCell>
                        <TableCell className='py-4 px-5'>
                          <Skeleton className='h-6 w-16 mx-auto' />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='text-center py-8 text-red-600 text-xs sm:text-sm'
                      >
                        {error}
                        <Button
                          onClick={() => fetchDetalles(usuario.id_usuario)}
                          className='mt-2 ml-4 text-xs sm:text-sm'
                        >
                          Reintentar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : detalles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='text-center py-8 text-gray-600 text-xs sm:text-sm'
                      >
                        No hay detalles de tips para mostrar
                      </TableCell>
                    </TableRow>
                  ) : (
                    detalles.map((detalle, index) => (
                      <TableRow
                        key={index}
                        className='border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30'
                      >
                        <TableCell className='py-3 px-5 text-left text-sm text-gray-700 dark:text-gray-300'>
                          <div className='font-medium'>{formatSoloFecha(detalle.fecha_crea)}</div>
                          <div className='text-xs text-gray-500'>{formatSoloHora(detalle.fecha_crea)}</div>
                        </TableCell>
                        <TableCell className='py-3 px-5 text-left text-sm font-mono text-gray-600 dark:text-gray-400'>
                          {detalle.codigo_venta}
                        </TableCell>
                        <TableCell className='py-3 px-5 text-right text-sm font-bold text-green-600'>
                          {formatCurrencyNoDecimals(detalle.monto)}
                        </TableCell>
                        <TableCell className='py-3 px-5 text-left text-sm text-gray-700 dark:text-gray-300'>
                          {detalle.fecha_pago ? (
                            <div className='font-medium'>{formatSoloFecha(detalle.fecha_pago)}</div>
                          ) : (
                            <span className='text-xs text-amber-600 dark:text-amber-400 italic font-medium'>Pendiente</span>
                          )}
                        </TableCell>
                        <TableCell className='py-3 px-5 text-center'>
                          <Badge
                            className={`${detalle.estado === 1 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'} rounded-full px-3 py-1 text-xs font-bold border-none shadow-none`}
                          >
                            {detalle.estado === 1 ? 'Por pagar' : 'Pagado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Botón cerrar */}
        <div className='flex-shrink-0 border-t px-4 sm:px-6 py-4'>
          <div className='flex justify-center'>
            <Button
              size='sm'
              variant='outline'
              onClick={onClose}
              className='bg-black text-white dark:bg-black dark:text-white  dark:hover:!bg-white dark:hover:!text-black rounded-full px-8 hover:!bg-white hover:!text-black transition-all hover:scale-105 border-2'
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
