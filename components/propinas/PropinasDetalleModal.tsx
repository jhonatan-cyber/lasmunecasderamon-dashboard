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
} from '@/lib/formatters';
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

  const getEstadoColor = (estado: string) => {
    return estado === 'Por pagar' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800';
  };

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
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs sm:text-sm'>FECHA HORA</TableHead>
                    <TableHead className='text-xs sm:text-sm'>CODIGO VENTA</TableHead>
                    <TableHead className='text-xs sm:text-sm'>MONTO</TableHead>
                    <TableHead className='text-xs sm:text-sm'>FECHA PAGO</TableHead>
                    <TableHead className='text-xs sm:text-sm'>ESTADO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className='h-6 w-32' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-24' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-20' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-24' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-16' />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='text-center text-red-600 text-xs sm:text-sm'
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
                        className='text-center text-gray-600 text-xs sm:text-sm'
                      >
                        No hay detalles de tips para mostrar
                      </TableCell>
                    </TableRow>
                  ) : (
                    detalles.map((detalle, index) => (
                      <TableRow key={index}>
                        <TableCell className='text-xs sm:text-sm'>
                          <div>{formatSoloFecha(detalle.fecha_hora)}</div>
                          <div>{formatSoloHora(detalle.fecha_hora)}</div>
                        </TableCell>
                        <TableCell className='font-mono text-xs sm:text-sm'>
                          {detalle.codigo_venta}
                        </TableCell>
                        <TableCell className='font-semibold text-xs sm:text-sm'>
                          {formatCurrencyNoDecimals(detalle.monto)}
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm'>
                          {detalle.fecha_pago ? formatFechaLarga(detalle.fecha_pago) : 'Por pagar'}
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm'>
                          <Badge className={`${getEstadoColor(detalle.estado)} text-xs sm:text-sm`}>
                            {detalle.estado}
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
              className='rounded-full text-white bg-black hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
