'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatShortDmyDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';
import type { DataType } from '@/hooks/shared/useRoleCalendar';

const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const allDataTypeConfig = {
  asistencias: { title: 'Asistencias' },
  anticipos: { title: 'Anticipos' },
  propinas: { title: 'Propinas' },
  horasExtras: { title: 'Horas Extras' },
  comisiones: { title: 'Comisiones' },
  servicios: { title: 'Servicios' }
};

interface CalendarDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDates: Date[];
  selectedDataType: DataType;
  setSelectedDataType: (type: DataType) => void;
  roleCategories: DataType[];
  modalCounts: { [key: string]: number };
  modalTotal: number;
  selectedDateData: any[];
  isLoadingSelectedData: boolean;
  isAnfitriona: boolean;
}

function getStatusBadge(estado: number, dataType?: DataType) {
  if (dataType === 'servicios') {
    switch (estado) {
      case 0:
        return (
          <Badge className='bg-yellow-100 text-yellow-800 hover:bg-yellow-100 rounded-full font-medium border-0'>
            POR COBRAR
          </Badge>
        );
      case 1:
        return (
          <Badge className='bg-blue-100 text-blue-800 hover:bg-blue-100 rounded-full font-medium border-0'>
            EN PROCESO
          </Badge>
        );
      case 2:
        return (
          <Badge className='bg-orange-100 text-orange-800 hover:bg-orange-100 rounded-full font-medium border-0'>
            PENDIENTE ANULACIÓN
          </Badge>
        );
      case 3:
        return (
          <Badge className='bg-red-100 text-red-800 hover:bg-red-100 rounded-full font-medium border-0'>
            ANULADO
          </Badge>
        );
      case 4:
        return (
          <Badge className='bg-green-100 text-green-800 hover:bg-green-100 rounded-full font-medium border-0'>
            PAGADO
          </Badge>
        );
      default:
        return (
          <Badge className='bg-gray-100 text-gray-800 hover:bg-gray-100 rounded-full font-medium border-0'>
            DESCONOCIDO
          </Badge>
        );
    }
  }

  if (estado === 0) {
    return (
      <Badge className='bg-green-100 text-green-800 hover:bg-green-100 rounded-full font-medium border-0'>
        PAGADO
      </Badge>
    );
  } else {
    return (
      <Badge className='bg-red-100 text-red-800 hover:bg-red-100 rounded-full font-medium border-0'>
        POR PAGAR
      </Badge>
    );
  }
}

function formatSimpleDate(dateString: string) {
  return formatShortDmyDateEs(dateString);
}

function formatDatesList(selectedDates: Date[]) {
  if (selectedDates.length === 0) {
    return 'No hay fechas seleccionadas';
  }

  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

  if (sortedDates.length === 1) {
    const date = sortedDates[0];
    return `${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];
  return `${first.getDate()} de ${months[first.getMonth()]} - ${last.getDate()} de ${months[last.getMonth()]} ${last.getFullYear()}`;
}

export default function CalendarDayModal({
  isOpen,
  onClose,
  selectedDates,
  selectedDataType,
  setSelectedDataType,
  roleCategories,
  modalCounts,
  modalTotal,
  selectedDateData,
  isLoadingSelectedData,
  isAnfitriona
}: CalendarDayModalProps) {
  return (
    <Dialog open={isOpen && selectedDates.length > 0} onOpenChange={onClose}>
      <DialogContent className='max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg font-semibold'>
            {formatDatesList(selectedDates)}
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='space-y-4 text-center'>
            <div className='flex justify-center gap-4 flex-wrap'>
              {roleCategories.map(key => {
                const config = allDataTypeConfig[key];
                const count = modalCounts[key] || 0;

                return (
                  <Button
                    key={key}
                    className={`flex-1 max-w-48 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-6 sm:px-8 py-3 ${
                      selectedDataType === key
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    variant={selectedDataType === key ? 'default' : 'outline-solid'}
                    onClick={() => setSelectedDataType(key)}
                  >
                    {config.title} ({count})
                  </Button>
                );
              })}
            </div>

            <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap'>
              <div className='text-left'>
                <div className='text-xl font-bold text-gray-900 dark:text-white'>
                  Total: $ {formatCurrencyNoDecimals(modalTotal)}
                </div>
                <div className='text-sm text-gray-600 mt-1'>
                  {isAnfitriona
                    ? '(Asistencias + Comisiones + Servicios (Por Cobrar/Pagados) - Anticipos)'
                    : '(Asistencias + Propinas + Horas Extras - Anticipos)'}
                </div>
              </div>
            </div>

            <div className='mt-6 border rounded-lg overflow-x-auto'>
              {isLoadingSelectedData ? (
                <div className='p-8 text-center'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2'></div>
                  <div className='text-gray-500 dark:text-gray-400'>
                    Obteniendo {allDataTypeConfig[selectedDataType].title.toLowerCase()} para las
                    fechas seleccionadas
                  </div>
                </div>
              ) : selectedDateData.length === 0 ? (
                <div className='p-8 text-center'>
                  <div className='text-gray-500 dark:text-gray-400 text-lg font-medium mb-2'>
                    No hay datos
                  </div>
                  <div className='text-gray-400 dark:text-gray-500 text-sm'>
                    No se encontraron {allDataTypeConfig[selectedDataType].title.toLowerCase()} para
                    las fechas seleccionadas
                  </div>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-gray-200'>
                        <th className='text-center py-3 px-4 font-medium text-gray-900'>#</th>
                        {selectedDataType === 'asistencias' && (
                          <>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              FECHA
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              HORA
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              ESTADO
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              SUELDO
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              APORTE
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              SUELDO FINAL
                            </th>
                          </>
                        )}
                        {selectedDataType === 'anticipos' && (
                          <>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              FECHA
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              MONTO
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              ESTADO
                            </th>
                          </>
                        )}
                        {selectedDataType === 'propinas' && (
                          <>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              FECHA
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              MONTO
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              ESTADO
                            </th>
                          </>
                        )}
                        {selectedDataType === 'comisiones' && (
                          <>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              FECHA
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              COMISIÓN
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              ESTADO
                            </th>
                          </>
                        )}
                        {selectedDataType === 'horasExtras' && (
                          <>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              FECHA
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              HORAS
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              MONTO
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              ESTADO
                            </th>
                          </>
                        )}
                        {selectedDataType === 'servicios' && (
                          <>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              CÓDIGO
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              CLIENTE
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              TIEMPO
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              HABITACIÓN
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              PRECIO
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              FECHA HORA
                            </th>
                            <th className='text-center py-3 px-4 font-medium text-gray-900'>
                              ESTADO
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDateData.map((item, index) => (
                        <tr key={index} className='border-b border-gray-100 hover:bg-gray-50'>
                          <td className='py-3 px-4 text-center'>{index + 1}</td>
                          {selectedDataType === 'asistencias' && (
                            <>
                              <td className='py-3 px-4 text-center'>
                                <div>
                                  <div className='font-medium text-gray-900'>
                                    {formatSimpleDate(item.fecha)}
                                  </div>
                                  <div className='text-sm text-gray-500'>{item.hora || 'N/A'}</div>
                                </div>
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {item.hora || 'N/A'}
                              </td>
                              <td className='py-3 px-4 text-center'>
                                {getStatusBadge(item.estado, 'asistencias')}
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {formatCurrencyNoDecimals(item.sueldo || 0)}
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {formatCurrencyNoDecimals(item.aporte || 0)}
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center font-bold'>
                                {formatCurrencyNoDecimals(item.sueldo_final || 0)}
                              </td>
                            </>
                          )}
                          {selectedDataType === 'anticipos' && (
                            <>
                              <td className='py-3 px-4 text-center'>
                                <div>
                                  <div className='font-medium text-gray-900'>
                                    {formatSimpleDate(item.fecha_crea)}
                                  </div>
                                </div>
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {formatCurrencyNoDecimals(item.monto || 0)}
                              </td>
                              <td className='py-3 px-4 text-center'>
                                {getStatusBadge(item.estado, 'anticipos')}
                              </td>
                            </>
                          )}
                          {selectedDataType === 'propinas' && (
                            <>
                              <td className='py-3 px-4 text-center'>
                                <div>
                                  <div className='font-medium text-gray-900'>
                                    {formatSimpleDate(item.fecha_crea)}
                                  </div>
                                </div>
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {formatCurrencyNoDecimals(item.monto || 0)}
                              </td>
                              <td className='py-3 px-4 text-center'>
                                {getStatusBadge(item.estado, 'propinas')}
                              </td>
                            </>
                          )}
                          {selectedDataType === 'comisiones' && (
                            <>
                              <td className='py-3 px-4 text-center'>
                                <div>
                                  <div className='font-medium text-gray-900'>
                                    {formatSimpleDate(item.fecha_crea)}
                                  </div>
                                </div>
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {formatCurrencyNoDecimals(item.comision || 0)}
                              </td>
                              <td className='py-3 px-4 text-center'>
                                {getStatusBadge(item.estado, 'comisiones')}
                              </td>
                            </>
                          )}
                          {selectedDataType === 'horasExtras' && (
                            <>
                              <td className='py-3 px-4 text-center'>
                                <div>
                                  <div className='font-medium text-gray-900'>
                                    {formatSimpleDate(item.fecha_crea)}
                                  </div>
                                </div>
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {item.hora || 0}
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {formatCurrencyNoDecimals(item.monto || 0)}
                              </td>
                              <td className='py-3 px-4 text-center'>
                                {getStatusBadge(item.estado, 'horasExtras')}
                              </td>
                            </>
                          )}
                          {selectedDataType === 'servicios' && (
                            <>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {item.codigo || 'N/A'}
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {item.cliente_nombre || 'N/A'}
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {item.tiempo || 'N/A'}
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center'>
                                {item.habitacion_numero || 'N/A'}
                              </td>
                              <td className='py-3 px-4 text-gray-900 text-center font-bold'>
                                {formatCurrencyNoDecimals(item.precio_servicio || 0)}
                              </td>
                              <td className='py-3 px-4 text-center'>
                                <div>
                                  <div className='font-medium text-gray-900'>
                                    {formatSimpleDate(item.fecha_crea)}
                                  </div>
                                  <div className='text-sm text-gray-500'>
                                    {formatShortTimeEs(item.fecha_crea)}
                                  </div>
                                </div>
                              </td>
                              <td className='py-3 px-4 text-center'>
                                {getStatusBadge(item.estado, 'servicios')}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center'>
            <Button
              variant='outline'
              className='bg-black text-white rounded-full hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base px-6 sm:px-8 py-3 border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
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
