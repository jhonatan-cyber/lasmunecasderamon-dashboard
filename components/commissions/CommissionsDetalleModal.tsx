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

  const fetchDetalles = async (usuarioId: string) => {
    if (!usuarioId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/commissions/${usuarioId}/details`);
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
      fetchDetalles(usuario.id_usuario);
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
                  <span className='text-sm font-medium text-blue-800 dark:text-blue-300'>
                    Comisiones
                  </span>
                </div>
                <p className='text-lg font-bold text-blue-900 dark:text-blue-100'>
                  {formatCurrencyNoDecimals(usuario.total_ventas)}
                </p>
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center'>
                <div className='flex items-center justify-center gap-2 mb-1'>
                  <span className='text-sm font-medium text-green-800 dark:text-green-300'>
                    Servicios
                  </span>
                </div>
                <p className='text-lg font-bold text-green-900 dark:text-green-100'>
                  {formatCurrencyNoDecimals(usuario.total_servicios)}
                </p>
              </div>

              <div className='bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center'>
                <div className='flex items-center justify-center gap-2 mb-1'>
                  <DollarSign className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                  <span className='text-sm font-medium text-purple-800 dark:text-purple-300'>
                    Total
                  </span>
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
            <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
              <div className='overflow-x-auto'>
                <Table className='min-w-full text-base text-center'>
                  <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                    <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800 uppercase'>
                      <TableHead className='py-4 px-5 text-xs text-gray-500 text-start'>
                        CÓDIGO
                      </TableHead>
                      <TableHead className='py-4 px-5 text-xs text-gray-500'>FECHA</TableHead>
                      <TableHead className='py-4 px-5 text-xs text-gray-500'>TIPO</TableHead>
                      <TableHead className='py-4 px-5 text-xs text-gray-500'>PRODUCTO</TableHead>
                      <TableHead className='py-4 px-5 text-xs text-gray-500'>COMISIÓN</TableHead>
                      <TableHead className='py-4 px-5 text-xs text-gray-500'>ESTADO</TableHead>
                      <TableHead className='py-4 px-5 text-xs text-gray-500'>FECHA PAGO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className='border-b border-gray-100 dark:border-gray-800'>
                          <TableCell className='py-4 px-5'>
                            <Skeleton className='h-4 w-20' />
                          </TableCell>
                          <TableCell className='py-4 px-5'>
                            <Skeleton className='h-4 w-24' />
                          </TableCell>
                          <TableCell className='py-4 px-5'>
                            <Skeleton className='h-4 w-16' />
                          </TableCell>
                          <TableCell className='py-4 px-5'>
                            <Skeleton className='h-4 w-32' />
                          </TableCell>
                          <TableCell className='py-4 px-5'>
                            <Skeleton className='h-4 w-20' />
                          </TableCell>
                          <TableCell className='py-4 px-5'>
                            <Skeleton className='h-6 w-16 rounded-full mx-auto' />
                          </TableCell>
                          <TableCell className='py-4 px-5'>
                            <Skeleton className='h-4 w-24' />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={7} className='text-center text-red-600 py-8'>
                          {error}
                          <Button
                            onClick={() => fetchDetalles(usuario.id_usuario)}
                            className='mt-2 ml-4'
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
                          className='text-center text-gray-600 dark:text-gray-400 py-8'
                        >
                          No hay detalles de comisiones para mostrar
                        </TableCell>
                      </TableRow>
                    ) : (
                      detalles.map((detalle, index) => (
                        <TableRow
                          key={index}
                          className='border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 border-gray-100 dark:border-gray-800'
                        >
                          <TableCell className='py-4 px-5 font-mono text-sm font-bold text-start text-blue-600'>
                            {detalle.codigo_venta || detalle.codigo_servicio || '-'}
                          </TableCell>
                          <TableCell className='py-4 px-5 text-sm'>
                            <div className='flex flex-col items-center gap-1'>
                              <div className='font-medium'>
                                {formatSoloFecha(detalle.fecha_hora)}
                              </div>
                              <div className='text-gray-400 text-[10px]'>
                                {formatSoloHora(detalle.fecha_hora)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className='py-4 px-5'>
                            <Badge
                              variant='outline'
                              className='capitalize bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-[10px]'
                            >
                              {detalle.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className='py-4 px-5 text-sm max-w-[150px]'>
                            <div
                              className='truncate font-medium dark:text-gray-300'
                              title={detalle.producto}
                            >
                              {detalle.producto || '-'}
                            </div>
                          </TableCell>
                          <TableCell className='py-4 px-5 font-bold text-sm text-green-600 dark:text-green-400'>
                            {formatCurrencyNoDecimals(detalle.monto)}
                          </TableCell>
                          <TableCell className='py-4 px-5'>
                            <Badge
                              className={`${getEstadoColor(detalle.estado)} text-xs rounded-full px-2 py-1 font-medium mx-auto block w-fit`}
                            >
                              {detalle.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className='py-4 px-5 text-sm dark:text-gray-300'>
                            {detalle.fecha_pago ? (
                              formatSoloFecha(detalle.fecha_pago)
                            ) : (
                              <span className='text-gray-400'>Pendiente</span>
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
