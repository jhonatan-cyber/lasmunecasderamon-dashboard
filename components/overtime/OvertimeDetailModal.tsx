'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { useOvertime } from '@/hooks/personal/useOvertime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { Clock, Calendar, DollarSign, Timer, CheckCircle2, User } from 'lucide-react';
import FilterSelect from '@/components/shared/selects/FilterSelect';
import Paginate from '@/components/shared/Paginate';

interface OvertimeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export default function OvertimeDetailModal({
  isOpen,
  onClose,
  userId,
  userName
}: OvertimeDetailModalProps) {
  const {
    getOvertimeDetails,
    overtimeDetails: details,
    detailsLoading: loading,
    detailsError: error
  } = useOvertime();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    if (isOpen && userId) {
      getOvertimeDetails(userId).catch(console.error);
    }
  }, [isOpen, userId, getOvertimeDetails]);

  const getStatusBadge = (estado: number) => {
    if (estado === 1) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-amber-100 text-amber-700 border-none hover:bg-amber-100 flex items-center gap-1 font-bold uppercase tracking-tighter text-[10px]'>
          <Timer className='h-3 w-3' />
          Pendiente
        </Badge>
      );
    }
    return (
      <Badge className='rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-100 flex items-center gap-1 font-bold uppercase tracking-tighter text-[10px]'>
        <CheckCircle2 className='h-3 w-3' />
        Pagado
      </Badge>
    );
  };

  const calculateTotals = () => {
    return details.reduce(
      (acc, detail) => ({
        totalHoras: acc.totalHoras + detail.hora,
        totalMonto: acc.totalMonto + detail.total
      }),
      { totalHoras: 0, totalMonto: 0 }
    );
  };

  const { totalHoras, totalMonto } = calculateTotals();

  const totalPages = Math.ceil(details.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDetails = details.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [details.length]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-bold dark:text-white'>
              Detalle de Horas Extras
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='space-y-4'>
            {/* Card de Resumen */}
            <Card>
              <CardContent className='p-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='flex flex-col space-y-2'>
                    <h4 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                      Usuario
                    </h4>
                    <div className='space-y-1'>
                      <div className='text-lg font-semibold text-gray-900 dark:text-white'>
                        {userName}
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-col space-y-2'>
                    <h4 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                      Resumen
                    </h4>
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          Total Horas:
                        </span>
                        <span className='text-lg font-bold dark:text-white'>
                          {totalHoras.toFixed(1)} hrs
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          Total Acumulado:
                        </span>
                        <span className='text-lg font-bold dark:text-white'>
                          {formatCurrencyCLP(totalMonto)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Listado de Horas Extras */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h4 className='text-sm font-black uppercase tracking-widest text-gray-400'>
                Desglose de Registros
              </h4>
              <div className='flex items-center gap-4'>
                <FilterSelect
                  value={pageSize.toString()}
                  onChange={value => setPageSize(parseInt(value))}
                  label='Mostrar'
                  placeholder='5'
                  options={[
                    { value: '5', label: '5 Datos' },
                    { value: '10', label: '10 Datos' },
                    { value: '20', label: '20 Datos' }
                  ]}
                />
              </div>
            </div>

            {loading ? (
              <div className='flex flex-col items-center justify-center py-12 space-y-4'>
                <div className='h-12 w-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin' />
                <p className='text-sm font-bold text-gray-400 uppercase tracking-tighter'>
                  Cargando registros...
                </p>
              </div>
            ) : details.length === 0 ? (
              <div className='text-center py-12 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800'>
                <p className='text-gray-400 font-medium tracking-tight'>
                  No se encontraron registros de horas extras
                </p>
              </div>
            ) : (
              <div className='space-y-6'>
                <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
                  <Table>
                    <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                      <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                        <TableHead className='py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center'>
                          Fecha
                        </TableHead>
                        <TableHead className='py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center'>
                          Horas
                        </TableHead>
                        <TableHead className='py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center'>
                          Valor Hora
                        </TableHead>
                        <TableHead className='py-5 px-6 font-bold text-xs uppercase text-gray-500 text-right'>
                          Total
                        </TableHead>
                        <TableHead className='py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center'>
                          Estado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDetails.map((detail, index) => {
                        const creacion = formatDateTimeDmyLabel(detail.fecha_crea);
                        return (
                          <TableRow
                            key={index}
                            className='border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30'
                          >
                            <TableCell className='py-4 px-6 text-center'>
                              <div className='flex flex-col'>
                                <span className='font-bold text-sm text-gray-900 dark:text-white'>
                                  {creacion.date}
                                </span>
                                <span className='text-xs text-gray-400'>{creacion.time}</span>
                              </div>
                            </TableCell>
                            <TableCell className='py-4 px-6 text-center'>
                              <div className='flex items-center justify-center gap-1.5 font-bold text-sm text-gray-700 dark:text-gray-300'>
                                <Clock className='h-4 w-4 text-blue-500' />
                                {detail.hora.toFixed(1)} hrs
                              </div>
                            </TableCell>
                            <TableCell className='py-4 px-6 text-center text-sm text-gray-500'>
                              {formatCurrencyCLP(detail.monto)}
                            </TableCell>
                            <TableCell className='py-4 px-6 text-right'>
                              <span className='font-black text-base text-emerald-600'>
                                {formatCurrencyCLP(detail.total)}
                              </span>
                            </TableCell>
                            <TableCell className='py-4 px-6 text-center'>
                              {getStatusBadge(detail.estado)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className='flex justify-center pt-2'>
                    <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className='px-6 py-4 border-t dark:border-gray-700 flex items-center justify-center sm:justify-center'>
          <Button
            onClick={onClose}
            variant='outline'
            className='rounded-full px-8 font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200'
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
