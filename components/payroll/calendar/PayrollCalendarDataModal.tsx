'use client';

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import SearchInput from '@/components/shared/SearchInput';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface PayrollCalendarDataModalProps {
  open: boolean;
  selectedDatesCount: number;
  formattedDates: string;
  isLoading: boolean;
  showVentasTable: boolean;
  ventasData: any[];
  serviciosData: any[];
  searchTerm: string;
  rowsPerPage: number;
  currentPage: number;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onToggleTable: (showVentas: boolean) => void;
  onSearchChange: (value: string) => void;
  onRowsPerPageChange: (value: number) => void;
  onPageChange: (page: number) => void;
  onOpenDetail: (item: any, type: 'venta' | 'servicio') => void;
  onFetchData: (type: 'ventas' | 'servicios') => void;
  getFilteredAndPaginatedData: (data: any[]) => { data: any[]; totalPages: number };
  formatDateToSpanish: (dateString: string) => string;
  formatTimeFromDate: (dateString: string) => string;
}

function getVentaStatusBadge(estado: number) {
  if (estado === 1) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  if (estado === 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  if (estado === 2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  if (estado === 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}

function getVentaStatusText(estado: number) {
  if (estado === 1) return 'Completado';
  if (estado === 0) return 'Anulado';
  if (estado === 2) return 'En proceso';
  if (estado === 3) return 'Pendiente de anulación';
  return 'Desconocido';
}

function getServicioStatusBadge(estado: number) {
  if (estado === 0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  if (estado === 1) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  if (estado === 2) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
  if (estado === 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
  if (estado === 4) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}

function getServicioStatusText(estado: number) {
  if (estado === 0) return 'Pagado';
  if (estado === 1) return 'Finalizado';
  if (estado === 2) return 'En proceso';
  if (estado === 3) return 'Solicitud de anulación';
  if (estado === 4) return 'Anulado';
  return 'Desconocido';
}

export function PayrollCalendarDataModal({
  open,
  selectedDatesCount,
  formattedDates,
  isLoading,
  showVentasTable,
  ventasData,
  serviciosData,
  searchTerm,
  rowsPerPage,
  currentPage,
  onOpenChange,
  onClose,
  onToggleTable,
  onSearchChange,
  onRowsPerPageChange,
  onPageChange,
  onOpenDetail,
  onFetchData,
  getFilteredAndPaginatedData,
  formatDateToSpanish,
  formatTimeFromDate
}: PayrollCalendarDataModalProps) {
  const totalVentas = ventasData.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalServicios = serviciosData.reduce((sum, item) => sum + (item.total || 0), 0);
  const currentData = showVentasTable ? ventasData : serviciosData;
  const currentLabel = showVentasTable ? 'ventas' : 'servicios';
  const { data: paginatedData, totalPages } = getFilteredAndPaginatedData(currentData);

  return (
    <Dialog open={open && selectedDatesCount > 0} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg font-semibold'>{formattedDates}</DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='space-y-4 text-center'>
            {ventasData.length > 0 && (
              <div className='flex justify-center mb-4'>
                <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2'>
                  <div className='text-xs text-green-600 dark:text-green-400 uppercase font-semibold'>
                    Total Ventas
                  </div>
                  <div className='text-lg font-bold text-green-700 dark:text-green-300'>
                    {formatCurrencyCLP(totalVentas)}
                  </div>
                </div>
                {serviciosData.length > 0 && (
                  <div className='ml-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2'>
                    <div className='text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold'>
                      Total Servicios
                    </div>
                    <div className='text-lg font-bold text-blue-700 dark:text-blue-300'>
                      {formatCurrencyCLP(totalServicios)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {ventasData.length === 0 && serviciosData.length > 0 && (
              <div className='flex justify-center mb-4'>
                <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2'>
                  <div className='text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold'>
                    Total Servicios
                  </div>
                  <div className='text-lg font-bold text-blue-700 dark:text-blue-300'>
                    {formatCurrencyCLP(totalServicios)}
                  </div>
                </div>
              </div>
            )}

            <div className='flex justify-center gap-4'>
              <Button
                className={`flex-1 max-w-32 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2 ${
                  showVentasTable
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                variant={showVentasTable ? 'default' : 'outline'}
                disabled={isLoading}
                onClick={() => {
                  onToggleTable(true);
                  onFetchData('ventas');
                }}
              >
                {isLoading && showVentasTable ? 'Cargando...' : 'Ventas'}
              </Button>
              <Button
                className={`flex-1 max-w-32 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2 ${
                  !showVentasTable
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                variant={!showVentasTable ? 'default' : 'outline'}
                disabled={isLoading}
                onClick={() => {
                  onToggleTable(false);
                  onFetchData('servicios');
                }}
              >
                {isLoading && !showVentasTable ? 'Cargando...' : 'Servicios'}
              </Button>
            </div>

            <div className='mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border'>
              <div className='flex-1 max-w-md'>
                <SearchInput
                  value={searchTerm}
                  onChange={onSearchChange}
                  placeholder={showVentasTable ? 'Buscar en ventas...' : 'Buscar en servicios...'}
                />
              </div>

              <div className='flex items-center gap-4'>
                <SelectElements
                  value={rowsPerPage}
                  onChange={onRowsPerPageChange}
                  options={[5, 10, 20, 40]}
                  label='Mostrar'
                />
              </div>
            </div>

            <div className='mt-6'>
              {currentData.length === 0 ? (
                <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden p-8 text-center'>
                  <div className='text-gray-500 dark:text-gray-400 text-lg font-medium mb-2'>
                    No hay datos de {currentLabel}
                  </div>
                  <div className='text-gray-400 dark:text-gray-500 text-sm'>
                    No se encontraron {currentLabel} para {formattedDates.toLowerCase()}
                  </div>
                </div>
              ) : (
                <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
                  <div className='overflow-x-auto'>
                    <Table className='min-w-full'>
                      <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                        <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Código
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Cliente
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Habitación
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-right'>
                            Total
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Fecha
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Estado
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                            Acciones
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map(item => {
                          const dateValue =
                            item.fecha_crea || item.fechaVenta || item.fechaHoraServicio;
                          const isVenta = showVentasTable;
                          const statusClass = isVenta
                            ? getVentaStatusBadge(item.estado)
                            : getServicioStatusBadge(item.estado);
                          const statusText = isVenta
                            ? getVentaStatusText(item.estado)
                            : getServicioStatusText(item.estado);

                          return (
                            <TableRow
                              key={item.codigo}
                              className='text-sm border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30'
                            >
                              <TableCell className='py-3 px-4 font-medium'>{item.codigo}</TableCell>
                              <TableCell className='py-3 px-4'>{item.cliente}</TableCell>
                              <TableCell className='py-3 px-4'>
                                {item.habitacion || 'N/A'}
                              </TableCell>
                              <TableCell className='py-3 px-4 text-right font-medium'>
                                {formatCurrencyCLP(item.total)}
                              </TableCell>
                              <TableCell className='py-3 px-4'>
                                {dateValue ? (
                                  <div className='text-center'>
                                    <div className='text-sm font-medium'>
                                      {formatDateToSpanish(dateValue)}
                                    </div>
                                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                                      {formatTimeFromDate(dateValue)}
                                    </div>
                                  </div>
                                ) : (
                                  'N/A'
                                )}
                              </TableCell>
                              <TableCell className='py-3 px-4'>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}
                                >
                                  {statusText}
                                </span>
                              </TableCell>
                              <TableCell className='py-3 px-4 text-center'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  onClick={() =>
                                    onOpenDetail(item, showVentasTable ? 'venta' : 'servicio')
                                  }
                                >
                                  <Eye className='w-4 h-4' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {totalPages > 1 && (
                      <div className='p-4 border-t border-gray-100 dark:border-gray-800'>
                        <Paginate
                          page={currentPage}
                          totalPages={totalPages}
                          setPage={onPageChange}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center'>
            <Button
              variant='outline'
              className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2'
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
