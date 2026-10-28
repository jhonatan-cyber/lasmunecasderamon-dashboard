'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { MODULE_TABLE_CARD_CLASS } from '@/components/shared/tables/moduleTableStyles';
import {
  ModuleTable,
  ModuleTableHeader,
  ModuleTableRow,
  ModuleTableHead,
  ModuleTableBody,
  ModuleTableCell
} from '@/components/shared/tables/ModuleTable';

import React from 'react';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatShortDmyDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';
import type { DataType } from '@/hooks/calendar/useRoleCalendar';

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
  loadError?: string;
  onRetry?: () => void;
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
    const labels: Record<number, string> = {
      0: 'ANULADO',
      1: 'FINALIZADO',
      2: 'EN PROCESO',
      3: 'PAUSADO',
      4: 'SOLICITUD ANULACIÓN'
    };
    return <Badge variant='secondary'>{labels[Number(estado)] || 'DESCONOCIDO'}</Badge>;
  }
  if (dataType === 'comisiones') {
    return (
      <Badge variant='secondary'>
        {Number(estado) === 0 ? 'ANULADO' : Number(estado) === 2 ? 'PAGADO' : 'POR PAGAR'}
      </Badge>
    );
  }

  if (Number(estado) === 0) {
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
  loadError,
  onRetry,
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

        {loadError && onRetry ? (
          <ListLoadError message={loadError} onRetry={onRetry} />
        ) : (
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

              <div className={`mt-6 ${MODULE_TABLE_CARD_CLASS}`}>
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
                    <EmptyState
                      variant='text'
                      title='No hay datos'
                      description={
                        <>
                          No se encontraron{' '}
                          {allDataTypeConfig[selectedDataType].title.toLowerCase()} para las fechas
                          seleccionadas
                        </>
                      }
                    />
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <ModuleTable>
                      <ModuleTableHeader>
                        <ModuleTableRow>
                          <ModuleTableHead>#</ModuleTableHead>
                          {selectedDataType === 'asistencias' && (
                            <>
                              <ModuleTableHead>FECHA</ModuleTableHead>
                              <ModuleTableHead>HORA</ModuleTableHead>
                              <ModuleTableHead>ESTADO</ModuleTableHead>
                              <ModuleTableHead>SUELDO</ModuleTableHead>
                              <ModuleTableHead>APORTE</ModuleTableHead>
                              <ModuleTableHead>SUELDO FINAL</ModuleTableHead>
                            </>
                          )}
                          {selectedDataType === 'anticipos' && (
                            <>
                              <ModuleTableHead>FECHA</ModuleTableHead>
                              <ModuleTableHead>MONTO</ModuleTableHead>
                              <ModuleTableHead>ESTADO</ModuleTableHead>
                            </>
                          )}
                          {selectedDataType === 'propinas' && (
                            <>
                              <ModuleTableHead>FECHA</ModuleTableHead>
                              <ModuleTableHead>MONTO</ModuleTableHead>
                              <ModuleTableHead>ESTADO</ModuleTableHead>
                            </>
                          )}
                          {selectedDataType === 'comisiones' && (
                            <>
                              <ModuleTableHead>FECHA</ModuleTableHead>
                              <ModuleTableHead>COMISIÓN</ModuleTableHead>
                              <ModuleTableHead>ESTADO</ModuleTableHead>
                            </>
                          )}
                          {selectedDataType === 'horasExtras' && (
                            <>
                              <ModuleTableHead>FECHA</ModuleTableHead>
                              <ModuleTableHead>HORAS</ModuleTableHead>
                              <ModuleTableHead>MONTO</ModuleTableHead>
                              <ModuleTableHead>ESTADO</ModuleTableHead>
                            </>
                          )}
                          {selectedDataType === 'servicios' && (
                            <>
                              <ModuleTableHead>CÓDIGO</ModuleTableHead>
                              <ModuleTableHead>CLIENTE</ModuleTableHead>
                              <ModuleTableHead>TIEMPO</ModuleTableHead>
                              <ModuleTableHead>HABITACIÓN</ModuleTableHead>
                              <ModuleTableHead>PRECIO</ModuleTableHead>
                              <ModuleTableHead>FECHA HORA</ModuleTableHead>
                              <ModuleTableHead>ESTADO</ModuleTableHead>
                            </>
                          )}
                        </ModuleTableRow>
                      </ModuleTableHeader>
                      <ModuleTableBody>
                        {selectedDateData.map((item, index) => (
                          <ModuleTableRow key={index}>
                            <ModuleTableCell>{index + 1}</ModuleTableCell>
                            {selectedDataType === 'asistencias' && (
                              <>
                                <ModuleTableCell>
                                  <div>
                                    <div className='font-medium text-gray-900 dark:text-gray-100'>
                                      {formatSimpleDate(item.fecha)}
                                    </div>
                                    <div className='text-sm text-gray-500'>
                                      {item.hora || 'N/A'}
                                    </div>
                                  </div>
                                </ModuleTableCell>
                                <ModuleTableCell>{item.hora || 'N/A'}</ModuleTableCell>
                                <ModuleTableCell>
                                  {getStatusBadge(item.estado, 'asistencias')}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyNoDecimals(item.sueldo || 0)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyNoDecimals(item.aporte || 0)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyNoDecimals(item.sueldo_final || 0)}
                                </ModuleTableCell>
                              </>
                            )}
                            {selectedDataType === 'anticipos' && (
                              <>
                                <ModuleTableCell>
                                  <div>
                                    <div className='font-medium text-gray-900 dark:text-gray-100'>
                                      {formatSimpleDate(item.fecha_crea)}
                                    </div>
                                  </div>
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyNoDecimals(item.monto || 0)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {getStatusBadge(item.estado, 'anticipos')}
                                </ModuleTableCell>
                              </>
                            )}
                            {selectedDataType === 'propinas' && (
                              <>
                                <ModuleTableCell>
                                  <div>
                                    <div className='font-medium text-gray-900 dark:text-gray-100'>
                                      {formatSimpleDate(item.fecha_crea)}
                                    </div>
                                  </div>
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyNoDecimals(item.monto || 0)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {getStatusBadge(item.estado, 'propinas')}
                                </ModuleTableCell>
                              </>
                            )}
                            {selectedDataType === 'comisiones' && (
                              <>
                                <ModuleTableCell>
                                  <div>
                                    <div className='font-medium text-gray-900 dark:text-gray-100'>
                                      {formatSimpleDate(item.fecha_crea)}
                                    </div>
                                  </div>
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyNoDecimals(item.comision || 0)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {getStatusBadge(item.estado, 'comisiones')}
                                </ModuleTableCell>
                              </>
                            )}
                            {selectedDataType === 'horasExtras' && (
                              <>
                                <ModuleTableCell>
                                  <div>
                                    <div className='font-medium text-gray-900 dark:text-gray-100'>
                                      {formatSimpleDate(item.fecha_crea)}
                                    </div>
                                  </div>
                                </ModuleTableCell>
                                <ModuleTableCell>{item.hora || 0}</ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyNoDecimals(item.monto || 0)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {getStatusBadge(item.estado, 'horasExtras')}
                                </ModuleTableCell>
                              </>
                            )}
                            {selectedDataType === 'servicios' && (
                              <>
                                <ModuleTableCell>{item.codigo || 'N/A'}</ModuleTableCell>
                                <ModuleTableCell>{item.cliente_nombre || 'N/A'}</ModuleTableCell>
                                <ModuleTableCell>{item.tiempo || 'N/A'}</ModuleTableCell>
                                <ModuleTableCell>{item.habitacion_numero || 'N/A'}</ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyNoDecimals(item.precio_servicio || 0)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  <div>
                                    <div className='font-medium text-gray-900 dark:text-gray-100'>
                                      {formatSimpleDate(item.fecha_crea)}
                                    </div>
                                    <div className='text-sm text-gray-500'>
                                      {formatShortTimeEs(item.fecha_crea)}
                                    </div>
                                  </div>
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {getStatusBadge(item.estado, 'servicios')}
                                </ModuleTableCell>
                              </>
                            )}
                          </ModuleTableRow>
                        ))}
                      </ModuleTableBody>
                    </ModuleTable>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
