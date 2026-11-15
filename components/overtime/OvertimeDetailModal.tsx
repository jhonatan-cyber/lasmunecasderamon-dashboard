'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { useOvertime } from '@/hooks/staff';
import { EmptyState } from '@/components/shared/EmptyState';
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
import { FilterSelect } from '@/components/shared/selects';
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
        <DialogHeader className='shrink-0 border-b p-4 pr-12 pb-3 dark:border-gray-700 sm:p-6 sm:pr-14 sm:pb-3'>
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-bold dark:text-white'>
              Detalle de Horas Extras
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
          <div className='space-y-4'>
            {}
            <Card>
              <CardContent className='p-4 sm:p-6'>
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

          {}
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
              <EmptyState
                title='No se encontraron registros de horas extras'
                className='rounded-3xl border-gray-100 bg-gray-50 py-12 dark:border-gray-800 dark:bg-slate-800/30'
              />
            ) : (
              <div className='space-y-6'>
                {/* Vista móvil: cards */}
                <div className='lg:hidden space-y-4'>
                  {paginatedDetails.map((detail, index) => {
                    const creacion = formatDateTimeDmyLabel(detail.fecha_crea);
                    return (
                      <Card
                        key={index}
                        className='rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-slate-900 overflow-hidden'
                      >
                        <CardContent className='p-5 space-y-4'>
                          <div className='flex justify-between items-start'>
                            <div className='space-y-1'>
                              <div className='flex items-center gap-2'>
                                <Calendar className='h-4 w-4 text-gray-400' />
                                <div className='flex flex-col'>
                                  <span className='text-sm font-bold text-gray-900 dark:text-white'>
                                    {creacion.date}
                                  </span>
                                  <span className='text-xs text-gray-400'>{creacion.time}</span>
                                </div>
                              </div>
                            </div>
                            {getStatusBadge(detail.estado)}
                          </div>

                          <div className='grid grid-cols-2 gap-3'>
                            <div className='space-y-1'>
                              <span className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                                Horas
                              </span>
                              <div className='flex items-center gap-1.5'>
                                <Clock className='h-4 w-4 text-blue-500' />
                                <span className='font-bold text-sm text-gray-700 dark:text-gray-300'>
                                  {detail.hora.toFixed(1)} hrs
                                </span>
                              </div>
                            </div>
                            <div className='space-y-1'>
                              <span className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                                Valor Hora
                              </span>
                              <div className='flex items-center gap-1.5'>
                                <DollarSign className='h-4 w-4 text-gray-400' />
                                <span className='font-bold text-sm text-gray-700 dark:text-gray-300'>
                                  {formatCurrencyCLP(detail.monto)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className='pt-2 border-t dark:border-gray-700'>
                            <div className='flex justify-between items-center'>
                              <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                                Total
                              </span>
                              <span className='font-black text-base text-emerald-600'>
                                {formatCurrencyCLP(detail.total)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Vista desktop: tabla */}
                <div className='hidden lg:block bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-x-auto'>
                  <Table className='min-w-[540px]'>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='font-bold text-center'>Fecha</TableHead>
                        <TableHead className='font-bold text-center'>Horas</TableHead>
                        <TableHead className='font-bold text-center'>Valor Hora</TableHead>
                        <TableHead className='font-bold text-right'>Total</TableHead>
                        <TableHead className='font-bold text-center'>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDetails.map((detail, index) => {
                        const creacion = formatDateTimeDmyLabel(detail.fecha_crea);
                        return (
                          <TableRow key={index} className='border-b transition-colors'>
                            <TableCell className='text-center'>
                              <div className='flex flex-col'>
                                <span className='font-bold text-sm text-gray-900 dark:text-white'>
                                  {creacion.date}
                                </span>
                                <span className='text-xs text-gray-400'>{creacion.time}</span>
                              </div>
                            </TableCell>
                            <TableCell className='text-center'>
                              <div className='flex items-center justify-center gap-1.5 font-bold text-sm text-gray-700 dark:text-gray-300'>
                                <Clock className='h-4 w-4 text-blue-500' />
                                {detail.hora.toFixed(1)} hrs
                              </div>
                            </TableCell>
                            <TableCell className='text-center'>
                              {formatCurrencyCLP(detail.monto)}
                            </TableCell>
                            <TableCell className='text-right'>
                              <span className='font-black text-base text-emerald-600'>
                                {formatCurrencyCLP(detail.total)}
                              </span>
                            </TableCell>
                            <TableCell className='text-center'>
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

        <DialogFooter className='flex items-center justify-center border-t p-4 dark:border-gray-700 sm:justify-center sm:p-6'>
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
