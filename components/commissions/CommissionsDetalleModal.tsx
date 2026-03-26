 
'use client';

import { useEffect, useState } from 'react';
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
import { User, DollarSign, Calendar, Clock } from 'lucide-react';
import { formatCurrencyNoDecimals, formatSoloFecha, formatSoloHora } from '@/lib/utils/formatters';

interface CommissionDetalle {
  id: string;
  fecha_hora: string;
  codigo_venta?: string;
  codigo_servicio?: string;
  tipo: 'venta' | 'servicio';
  monto: number;
  estado: string;
  producto?: string;
  fecha_pago?: string;
  descripcion?: string;
}

interface CommissionResumen {
  id_usuario: string;
  nombre_completo: string;
  nick: string;
  total_comisiones: number;
  total_ventas: number;
  total_servicios: number;
}

interface CommissionsDetalleModalProps {
  open: boolean;
  onClose: () => void;
  usuario: CommissionResumen | null;
}

export default function CommissionsDetalleModal({
  open,
  onClose,
  usuario
}: CommissionsDetalleModalProps) {
  const [detalles, setDetalles] = useState<CommissionDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetalles = async (usuarioId: number) => {
    if (!usuarioId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/commissions/detalle/${usuarioId}`);
      const data = await response.json();

      if (data.success) {
        setDetalles(data.data || []);
      } else {
        setError(data.message || 'Error al cargar detalles');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && usuario) {
      fetchDetalles(Number(usuario.id_usuario));
    }
  }, [open, usuario]);

  const getEstadoColor = (estado: string) => {
    return estado === 'Por pagar'
      ? 'bg-purple-100 text-purple-800 hover:bg-purple-100 hover:text-purple-800'
      : 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800';
  };

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='w-[98vw] max-w-6xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-2 sm:px-4 pt-4 sm:pt-6 pb-2 border-b dark:border-gray-800'>
          <DialogTitle className='text-center text-base sm:text-lg font-semibold dark:text-gray-100'>
            Detalle de Comisiones
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-2 sm:px-4 py-4'>
          <div className='border-b dark:border-gray-800 pb-4 mb-4 flex flex-col items-center gap-2'>
            <div className='flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base sm:text-lg'>
              <span className='font-bold text-blue-600 dark:text-blue-400'>@{usuario.nick}</span>
            </div>
            <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs italic'>
              <span>{usuario.nombre_completo}</span>
            </div>

            {/* Resumen de totales */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full'>
              <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center'>
                <div className='flex items-center justify-center gap-2 mb-1'>
                  <span className='text-sm font-medium text-blue-800 dark:text-blue-300'>Comisiones</span>
                </div>
                <p className='text-lg font-bold text-blue-900 dark:text-blue-100'>
                  {formatCurrencyNoDecimals(usuario.total_ventas)}
                </p>
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center'>
                <div className='flex items-center justify-center gap-2 mb-1'>
                  <span className='text-sm font-medium text-green-800 dark:text-green-300'>Servicios</span>
                </div>
                <p className='text-lg font-bold text-green-900 dark:text-green-100'>
                  {formatCurrencyNoDecimals(usuario.total_servicios)}
                </p>
              </div>

              <div className='bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center'>
                <div className='flex items-center justify-center gap-2 mb-1'>
                  <DollarSign className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                  <span className='text-sm font-medium text-purple-800 dark:text-purple-300'>Total</span>
                </div>
                <p className='text-lg font-bold text-purple-900 dark:text-purple-100'>
                  {formatCurrencyNoDecimals(usuario.total_comisiones)}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de detalles */}
          <div>
            <h3 className='text-sm font-semibold mb-4 text-center text-gray-600 dark:text-gray-400'>
              Detalle de Comisiones
            </h3>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
                    <TableHead className='text-xs sm:text-sm dark:text-gray-400'>CÓDIGO</TableHead>
                    <TableHead className='text-xs sm:text-sm dark:text-gray-400'>FECHA</TableHead>
                    <TableHead className='text-xs sm:text-sm dark:text-gray-400'>TIPO</TableHead>
                    <TableHead className='text-xs sm:text-sm dark:text-gray-400'>PRODUCTO</TableHead>
                    <TableHead className='text-xs sm:text-sm dark:text-gray-400'>COMISIÓN</TableHead>
                    <TableHead className='text-xs sm:text-sm text-center dark:text-gray-400'>ESTADO</TableHead>
                    <TableHead className='text-xs sm:text-sm dark:text-gray-400'>FECHA PAGO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className='h-6 w-20' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-24' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-16' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-32' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-20' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-16' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-6 w-24' />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className='text-center text-red-600 text-xs sm:text-sm'
                      >
                        {error}
                        <Button
                          onClick={() => fetchDetalles(Number(usuario.id_usuario))}
                          className='mt-2 ml-4 text-xs sm:text-sm'
                          size='sm'
                        >
                          Reintentar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : detalles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className='text-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm py-8'
                      >
                        No hay detalles de comisiones para mostrar
                      </TableCell>
                    </TableRow>
                  ) : (
                    detalles.map((detalle, index) => (
                      <TableRow key={index}>
                        <TableCell className='font-mono text-xs sm:text-sm font-bold'>
                          {detalle.codigo_venta || detalle.codigo_servicio || '-'}
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm'>
                          <div className='flex items-center gap-2'>
                            <Calendar className='w-3 h-3 text-gray-400 dark:text-gray-500' />
                            <div>
                              <div className="dark:text-gray-200">{formatSoloFecha(detalle.fecha_hora)}</div>
                              <div className='text-gray-500 dark:text-gray-400 flex items-center gap-1 text-[10px]'>
                                <Clock className='w-2.5 h-2.5' />
                                {formatSoloHora(detalle.fecha_hora)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm'>
                          <Badge variant='outline' className='capitalize text-[10px] px-1.5 py-0'>
                            {detalle.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm max-w-[150px]'>
                          <div className='truncate font-medium dark:text-gray-300' title={detalle.producto}>
                            {detalle.producto || '-'}
                          </div>
                        </TableCell>
                        <TableCell className='font-bold text-xs sm:text-sm text-green-600 dark:text-green-400'>
                          {formatCurrencyNoDecimals(detalle.monto)}
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm text-center'>
                          <Badge
                            className={`${getEstadoColor(detalle.estado)} text-[10px] px-1.5 py-0`}
                          >
                            {detalle.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm dark:text-gray-300'>
                          {detalle.fecha_pago ? (
                            formatSoloFecha(detalle.fecha_pago)
                          ) : (
                            <span className='text-gray-400 dark:text-gray-500'>Pendiente</span>
                          )}
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
        <div className='flex-shrink-0 border-t dark:border-gray-800 px-2 sm:px-4 py-4'>
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
