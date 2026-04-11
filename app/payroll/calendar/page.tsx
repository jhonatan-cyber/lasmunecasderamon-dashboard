/* eslint-disable no-console */
'use client';

import React, { useState, useEffect } from 'react';
import { Grid3X3, ShoppingCart, Users, DollarSign, Clock, Gift, Zap, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
import { useCalendarActions } from '@/hooks/calendario/useCalendarActions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { getMonthDateRange, toDateKey } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

// Utilidades para fechas
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

const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function PayrollCalendarPage() {
  // Hook para verificar permisos
  const { hasPermission } = useUserPermissions();
  const canViewDetails = hasPermission('detalle_planilla', 'ver_detalles');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [currentView, setCurrentView] = useState('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showVentasTable, setShowVentasTable] = useState(true);
  const [realVentasData, setRealVentasData] = useState<any[]>([]);
  const [realServiciosData, setRealServiciosData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estado para modal de detalles
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'venta' | 'servicio' | null>(null);

  // Hook para obtener acciones del calendario
  const { startDate, endDate } = getMonthDateRange(currentDate);
  const { actions: calendarActions, loading: actionsLoading } = useCalendarActions(
    startDate,
    endDate
  );

  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Obtener días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let firstDayOfWeek = firstDay.getDay();
    const days = [];

    // Días del mes anterior para completar la primera semana
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }

    // Días del mes siguiente para completar la última semana
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);

    switch (currentView) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + direction);
        break;
      case 'multi':
        newDate.setMonth(currentDate.getMonth() + direction * 4);
        break;
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => selectedDate.toDateString() === date.toDateString());
  };

  // Función para obtener acciones de una fecha específica
  const getActionsForDate = (date: Date) => {
    const dateKey = toDateKey(date);
    return calendarActions[dateKey] || [];
  };

  // Función para obtener el icono según el tipo de acción
  const getActionIcon = (tipo: string) => {
    switch (tipo) {
      case 'venta':
        return <ShoppingCart className='w-3 h-3 text-green-600' />;
      case 'servicio':
        return <Users className='w-3 h-3 text-blue-600' />;
      case 'asistencia':
        return <Clock className='w-3 h-3 text-purple-600' />;
      case 'propina':
        return <Gift className='w-3 h-3 text-yellow-600' />;
      case 'anticipo':
        return <DollarSign className='w-3 h-3 text-red-600' />;
      case 'hora_extra':
        return <Zap className='w-3 h-3 text-orange-600' />;
      default:
        return <DollarSign className='w-3 h-3 text-gray-600' />;
    }
  };

  // Función para renderizar las acciones de una fecha
  const renderDateActions = (date: Date) => {
    const actions = getActionsForDate(date);
    if (actions.length === 0) return null;

    // Agrupar acciones por tipo (solo mostrar un icono por tipo de acción)
    const actionsByType = actions.reduce((acc: { [key: string]: any }, action: any) => {
      if (!acc[action.tipo]) {
        acc[action.tipo] = action;
      }
      return acc;
    }, {});

    const uniqueActions = Object.values(actionsByType);
    const totalActions = actions.length;

    return (
      <div className='flex flex-col gap-1 mt-1'>
        {uniqueActions.map((action: any, index) => (
          <div key={index} className='flex items-center gap-1 text-xs'>
            {getActionIcon(action.tipo)}
            <span className='truncate text-gray-600'>
              {action.tipo === 'venta' && 'V'}
              {action.tipo === 'servicio' && 'S'}
              {action.tipo === 'asistencia' && 'A'}
              {action.tipo === 'propina' && 'P'}
              {action.tipo === 'anticipo' && 'Ant'}
              {action.tipo === 'hora_extra' && 'HE'}
            </span>
          </div>
        ))}
        {totalActions > uniqueActions.length && (
          <div className='text-xs text-gray-500'>{totalActions} total</div>
        )}
      </div>
    );
  };

  const handleMouseDown = (date: Date) => {
    // Solo permitir selección si tiene permiso para ver detalles
    if (!canViewDetails) {
      return;
    }

    setIsDragging(true);
    setDragStartDate(date);
    setSelectedDates([date]);
  };

  const handleMouseEnter = (date: Date) => {
    // Solo permitir selección si tiene permiso para ver detalles
    if (!canViewDetails) {
      return;
    }

    if (isDragging && dragStartDate) {
      const dateRange = getDateRange(dragStartDate, date);
      setSelectedDates(dateRange);
    }
  };

  const handleMouseUp = () => {
    // Solo permitir selección si tiene permiso para ver detalles
    if (!canViewDetails) {
      return;
    }

    const wasDragging = isDragging;
    setIsDragging(false);
    setDragStartDate(null);

    // Si hubo drag, abrir modal inmediatamente
    if (wasDragging && selectedDates.length > 0) {
      setIsModalOpen(true);
      // Cargar datos de ventas por defecto
      setTimeout(() => fetchCalendarData('ventas'), 100);
    }
  };

  const getDateRange = (startDate: Date, endDate: Date): Date[] => {
    const dates: Date[] = [];
    const start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const end = new Date(Math.max(startDate.getTime(), endDate.getTime()));

    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setIsModalOpen(false);
    setRealVentasData([]);
    setRealServiciosData([]);
    setSearchTerm('');
    setCurrentPage(1);
    // Limpiar modal de detalles
    setIsDetailModalOpen(false);
    setSelectedItem(null);
    setSelectedItemType(null);
  };

  // Función para abrir modal de detalles
  const openDetailModal = (item: any, type: 'venta' | 'servicio') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setIsDetailModalOpen(true);
  };
  const fetchCalendarData = async (type: 'ventas' | 'servicios') => {
    if (selectedDates.length === 0) {
      console.log('No hay fechas seleccionadas');
      return;
    }

    console.log(`Fetching ${type} data...`);
    setIsLoading(true);
    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const startDate = toDateKey(sortedDates[0]);
      const endDate = toDateKey(sortedDates[sortedDates.length - 1]);

      console.log(`Fecha range: ${startDate} to ${endDate}`);

      const url = `/api/calendar/data?startDate=${startDate}&endDate=${endDate}&type=${type}`;
      console.log(`Making request to: ${url}`);

      const response = await fetch(url);
      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`${type} data received:`, result);

      if (type === 'ventas') {
        setRealVentasData(result.data);
        console.log('Ventas data set:', result.data);
      } else {
        setRealServiciosData(result.data);
        console.log('Servicios data set:', result.data);
      }
    } catch (error) {
      console.error(`Error al obtener datos de ${type}:`, error);
      // En caso de error, mantener arrays vacíos para mostrar mensaje de "no hay datos"
      if (type === 'ventas') {
        setRealVentasData([]);
      } else {
        setRealServiciosData([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDatesList = () => {
    if (selectedDates.length === 0) {
      return 'No hay fechas seleccionadas';
    }

    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

    if (sortedDates.length === 1) {
      const date = sortedDates[0];
      return `${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    if (sortedDates.length === 2) {
      const first = sortedDates[0];
      const second = sortedDates[1];
      return `${first.getDate()} de ${months[first.getMonth()]} - ${second.getDate()} de ${months[second.getMonth()]} ${second.getFullYear()}`;
    }

    // Para rangos más largos
    const first = sortedDates[0];
    const last = sortedDates[sortedDates.length - 1];
    return `${first.getDate()} de ${months[first.getMonth()]} - ${last.getDate()} de ${months[last.getMonth()]} ${last.getFullYear()}`;
  };

  // Función para formatear fecha en español
  const formatDateToSpanish = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const monthName = months[date.getMonth()].toLowerCase();
    const year = date.getFullYear();

    return `${day}-${monthName}-${year}`;
  };

  // Función para extraer y formatear la hora
  const formatTimeFromDate = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  };

  // Función para filtrar y paginar datos
  const getFilteredAndPaginatedData = (data: any[]) => {
    // Filtrar por término de búsqueda
    const filteredData = data.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.codigo?.toLowerCase().includes(searchLower) ||
        item.cliente?.toLowerCase().includes(searchLower) ||
        item.habitacion?.toLowerCase().includes(searchLower) ||
        item.anfitriona?.toLowerCase().includes(searchLower) ||
        item.anfitrionas?.toLowerCase().includes(searchLower)
      );
    });

    // Calcular paginación
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);

    return {
      data: paginatedData,
      totalPages,
      totalItems: filteredData.length
    };
  };

  const getTitle = () => {
    switch (currentView) {
      case 'multi':
        const startMonth = months[currentDate.getMonth()];
        const endMonth = months[(currentDate.getMonth() + 3) % 12];
        const startYear = currentDate.getFullYear();
        const endYear = currentDate.getMonth() + 3 >= 12 ? startYear + 1 : startYear;
        return `${startMonth} - ${endMonth} ${endYear}`;
      default:
        return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);

    return (
      <>
        {/* Días de la semana */}
        <div className='grid grid-cols-7 border-b border-gray-200 dark:border-gray-700'>
          {weekdays.map(day => (
            <div
              key={day}
              className='p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700'
            >
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div
          className='grid grid-cols-7'
          style={{ minHeight: '500px' }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {days.map((day, index) => {
            const isCurrentDay = isToday(day.date);
            const isSelected = isDateSelected(day.date);

            return (
              <div
                key={index}
                className={`min-h-[80px] p-2 border-r border-b border-gray-200 dark:border-gray-700 ${
                  canViewDetails
                    ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                    : 'cursor-not-allowed opacity-60'
                } transition-colors select-none ${
                  isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                } ${
                  isSelected
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
                    : ''
                } ${isDragging && canViewDetails ? 'cursor-grabbing' : ''}`}
                onMouseDown={e => {
                  e.preventDefault();
                  handleMouseDown(day.date);
                }}
                onMouseEnter={() => handleMouseEnter(day.date)}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    !day.isCurrentMonth
                      ? 'text-gray-400 dark:text-gray-600'
                      : isCurrentDay
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {day.date.getDate()}
                </div>
                {day.isCurrentMonth && renderDateActions(day.date)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderMultiMonthView = () => {
    const renderSingleMonth = (monthOffset: number) => {
      const monthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + monthOffset,
        1
      );
      const days = getDaysInMonth(monthDate);
      const monthName = months[monthDate.getMonth()];
      const year = monthDate.getFullYear();

      return (
        <div className='bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600'>
          {/* Header del mes */}
          <div className='p-3 border-b border-gray-200 dark:border-gray-600'>
            <h3 className='text-sm font-semibold text-gray-900 dark:text-white text-center'>
              {monthName} {year}
            </h3>
          </div>

          {/* Días de la semana */}
          <div className='grid grid-cols-7 text-xs'>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div
                key={day}
                className='p-1 text-center text-gray-600 dark:text-gray-400 font-medium'
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className='grid grid-cols-7'>
            {days.slice(0, 35).map((day, index) => {
              const isCurrentDay = isToday(day.date);
              const isSelected = isDateSelected(day.date);

              return (
                <div
                  key={index}
                  className={`min-h-[32px] p-1 border-r border-b border-gray-200 dark:border-gray-600 ${
                    canViewDetails
                      ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
                      : 'cursor-not-allowed opacity-60'
                  } transition-colors relative select-none ${
                    isCurrentDay ? 'bg-blue-100 dark:bg-blue-800' : ''
                  } ${
                    isSelected
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
                      : ''
                  } ${isDragging && canViewDetails ? 'cursor-grabbing' : ''}`}
                  onMouseDown={e => {
                    e.preventDefault();
                    handleMouseDown(day.date);
                  }}
                  onMouseEnter={() => handleMouseEnter(day.date)}
                >
                  <div
                    className={`text-xs ${
                      !day.isCurrentMonth
                        ? 'text-gray-400 dark:text-gray-600'
                        : isCurrentDay
                          ? 'text-blue-600 dark:text-blue-300 font-bold'
                          : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {day.date.getDate()}
                  </div>
                  {day.isCurrentMonth && (
                    <div className='flex flex-wrap gap-0.5 mt-0.5'>
                      {(() => {
                        const actions = getActionsForDate(day.date);
                        const actionsByType = actions.reduce(
                          (acc: { [key: string]: any }, action: any) => {
                            if (!acc[action.tipo]) {
                              acc[action.tipo] = action;
                            }
                            return acc;
                          },
                          {}
                        );
                        const uniqueActions = Object.values(actionsByType);

                        return uniqueActions.slice(0, 4).map((action: any, index) => {
                          let colorClass = 'bg-gray-400';
                          switch (action.tipo) {
                            case 'venta':
                              colorClass = 'bg-green-500';
                              break;
                            case 'servicio':
                              colorClass = 'bg-blue-500';
                              break;
                            case 'asistencia':
                              colorClass = 'bg-purple-500';
                              break;
                            case 'propina':
                              colorClass = 'bg-yellow-500';
                              break;
                            case 'anticipo':
                              colorClass = 'bg-red-500';
                              break;
                            case 'hora_extra':
                              colorClass = 'bg-orange-500';
                              break;
                          }
                          return (
                            <div
                              key={index}
                              className={`w-1.5 h-1.5 rounded-full ${colorClass}`}
                            ></div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className='p-4' onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {[0, 1, 2, 3].map(offset => (
            <div key={offset}>{renderSingleMonth(offset)}</div>
          ))}
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'multi':
        return renderMultiMonthView();
      default:
        return renderMonthView();
    }
  };

  return (
    <PermissionGuard module='payroll_details' action='view'>
      {(() => {
        return (
          <div className='min-h-screen p-4 sm:p-6 lg:p-10 flex flex-col bg-gray-50 dark:bg-gray-900'>
            <div className='flex items-center justify-between mb-6'>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'>
                Calendario de Planillas
              </h1>
            </div>

            <div className='flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'>
              {/* Header del calendario */}
              <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-4'>
                  <Button variant='ghost' size='sm' onClick={() => navigate(-1)}>
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15 19l-7-7 7-7'
                      />
                    </svg>
                  </Button>

                  <h2 className='text-xl font-semibold text-gray-900 dark:text-white min-w-[200px]'>
                    {getTitle()}
                  </h2>

                  <Button variant='ghost' size='sm' onClick={() => navigate(1)}>
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 5l7 7-7 7'
                      />
                    </svg>
                  </Button>
                </div>

                <div className='flex items-center gap-2'>
                  <Button variant='secondary' onClick={goToToday}>
                    Hoy
                  </Button>

                  {selectedDates.length > 0 && (
                    <Button variant='ghost' size='sm' onClick={clearSelection}>
                      Limpiar ({selectedDates.length})
                    </Button>
                  )}

                  {/* Botones de vista */}
                  <div className='flex gap-1 ml-4'>
                    <Button
                      variant={currentView === 'multi' ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setCurrentView('multi')}
                    >
                      <Grid3X3 className='w-3 h-3 sm:w-4 sm:h-4' />
                    </Button>
                    <Button
                      variant={currentView === 'month' ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setCurrentView('month')}
                    >
                      Mes
                    </Button>
                  </div>
                </div>
              </div>

              {/* Vista del calendario */}
              <div className='flex-1'>{renderCurrentView()}</div>

              {/* Leyenda de acciones */}
              <div className='border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
                  Leyenda de Acciones
                </h3>
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3'>
                  <div className='flex items-center gap-2 text-xs'>
                    <ShoppingCart className='w-4 h-4 text-green-600' />
                    <span className='text-gray-600 dark:text-gray-400'>V - Venta</span>
                  </div>
                  <div className='flex items-center gap-2 text-xs'>
                    <Users className='w-4 h-4 text-blue-600' />
                    <span className='text-gray-600 dark:text-gray-400'>S - Servicio</span>
                  </div>
                  <div className='flex items-center gap-2 text-xs'>
                    <Clock className='w-4 h-4 text-purple-600' />
                    <span className='text-gray-600 dark:text-gray-400'>A - Asistencia</span>
                  </div>
                  <div className='flex items-center gap-2 text-xs'>
                    <Gift className='w-4 h-4 text-yellow-600' />
                    <span className='text-gray-600 dark:text-gray-400'>P - Propina</span>
                  </div>
                  <div className='flex items-center gap-2 text-xs'>
                    <DollarSign className='w-4 h-4 text-red-600' />
                    <span className='text-gray-600 dark:text-gray-400'>Ant - Anticipo</span>
                  </div>
                  <div className='flex items-center gap-2 text-xs'>
                    <Zap className='w-4 h-4 text-orange-600' />
                    <span className='text-gray-600 dark:text-gray-400'>HE - Hora Extra</span>
                  </div>
                </div>
                <div className='mt-3 text-xs text-gray-500 dark:text-gray-400'>
                  <p>• Los símbolos aparecen en las fechas donde se registraron acciones</p>
                  <p>• Se muestra un símbolo por cada tipo de acción (máximo 6 tipos diferentes)</p>
                  <p>• Si hay múltiples acciones del mismo tipo, se muestra el total</p>
                  {canViewDetails ? (
                    <p>• Selecciona fechas para ver los detalles de ventas y servicios</p>
                  ) : (
                    <p className='text-amber-600 dark:text-amber-400 font-medium'>
                      ⚠️ No tienes permiso para ver los detalles de las fechas
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal de fechas seleccionadas */}
            <Dialog open={isModalOpen && selectedDates.length > 0} onOpenChange={setIsModalOpen}>
              <DialogContent className='max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0'>
                <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
                  <DialogTitle className='text-lg font-semibold'>{formatDatesList()}</DialogTitle>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-6 py-4'>
                  <div className='space-y-4 text-center'>
                    {/* Totales de Ventas y Servicios */}
                    {realVentasData.length > 0 && realServiciosData.length > 0 && (
                      <div className='flex justify-center gap-4 mb-4'>
                        <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2'>
                          <div className='text-xs text-green-600 dark:text-green-400 uppercase font-semibold'>
                            Total Ventas
                          </div>
                          <div className='text-lg font-bold text-green-700 dark:text-green-300'>
                            {formatCurrencyCLP(
                              realVentasData.reduce((sum, v) => sum + (v.total || 0), 0)
                            )}
                          </div>
                        </div>
                        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2'>
                          <div className='text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold'>
                            Total Servicios
                          </div>
                          <div className='text-lg font-bold text-blue-700 dark:text-blue-300'>
                            {formatCurrencyCLP(
                              realServiciosData.reduce((sum, s) => sum + (s.total || 0), 0)
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mostrar total individual cuando solo hay datos de uno */}
                    {realVentasData.length > 0 && realServiciosData.length === 0 && !isLoading && (
                      <div className='flex justify-center mb-4'>
                        <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2'>
                          <div className='text-xs text-green-600 dark:text-green-400 uppercase font-semibold'>
                            Total Ventas
                          </div>
                          <div className='text-lg font-bold text-green-700 dark:text-green-300'>
                            {formatCurrencyCLP(
                              realVentasData.reduce((sum, v) => sum + (v.total || 0), 0)
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {realServiciosData.length > 0 && realVentasData.length === 0 && !isLoading && (
                      <div className='flex justify-center mb-4'>
                        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2'>
                          <div className='text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold'>
                            Total Servicios
                          </div>
                          <div className='text-lg font-bold text-blue-700 dark:text-blue-300'>
                            {formatCurrencyCLP(
                              realServiciosData.reduce((sum, s) => sum + (s.total || 0), 0)
                            )}
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
                          setShowVentasTable(true);
                          setCurrentPage(1);
                          setSearchTerm('');
                          fetchCalendarData('ventas');
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
                          setShowVentasTable(false);
                          setCurrentPage(1);
                          setSearchTerm('');
                          fetchCalendarData('servicios');
                        }}
                      >
                        {isLoading && !showVentasTable ? 'Cargando...' : 'Servicios'}
                      </Button>
                    </div>

                    {/* Sección de Filtros */}
                    <div className='mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border'>
                      <div className='flex-1 max-w-md'>
                        <SearchInput
                          value={searchTerm}
                          onChange={setSearchTerm}
                          placeholder={
                            showVentasTable ? 'Buscar en ventas...' : 'Buscar en servicios...'
                          }
                        />
                      </div>

                      <div className='flex items-center gap-4'>
                        <SelectElements
                          value={rowsPerPage}
                          onChange={value => {
                            setRowsPerPage(value);
                            setCurrentPage(1);
                          }}
                          options={[5, 10, 20, 40]}
                          label='Mostrar'
                        />
                      </div>
                    </div>

                    {/* Tabla de Ventas */}
                    {showVentasTable && (
                      <div className='mt-6'>
                        {realVentasData.length === 0 ? (
                          <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden p-8 text-center'>
                            <div className='text-gray-500 dark:text-gray-400 text-lg font-medium mb-2'>
                              No hay datos de ventas
                            </div>
                            <div className='text-gray-400 dark:text-gray-500 text-sm'>
                              No se encontraron ventas para {formatDatesList().toLowerCase()}
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
                                  {(() => {
                                    const { data: paginatedData } =
                                      getFilteredAndPaginatedData(realVentasData);
                                    return paginatedData.map(venta => (
                                      <TableRow
                                        key={venta.codigo}
                                        className='text-sm border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30'
                                      >
                                        <TableCell className='py-3 px-4 font-medium'>
                                          {venta.codigo}
                                        </TableCell>
                                        <TableCell className='py-3 px-4'>{venta.cliente}</TableCell>
                                        <TableCell className='py-3 px-4'>
                                          {venta.habitacion || 'N/A'}
                                        </TableCell>
                                        <TableCell className='py-3 px-4 text-right font-medium'>
                                          {formatCurrencyCLP(venta.total)}
                                        </TableCell>
                                        <TableCell className='py-3 px-4'>
                                          {venta.fecha_crea || venta.fechaVenta ? (
                                            <div className='text-center'>
                                              <div className='text-sm font-medium'>
                                                {formatDateToSpanish(
                                                  venta.fecha_crea || venta.fechaVenta
                                                )}
                                              </div>
                                              <div className='text-xs text-gray-500 dark:text-gray-400'>
                                                {formatTimeFromDate(
                                                  venta.fecha_crea || venta.fechaVenta
                                                )}
                                              </div>
                                            </div>
                                          ) : (
                                            'N/A'
                                          )}
                                        </TableCell>
                                        <TableCell className='py-3 px-4'>
                                          <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                              venta.estado === 1
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                : venta.estado === 0
                                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                  : venta.estado === 2
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                                    : venta.estado === 3
                                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                            }`}
                                          >
                                            {venta.estado === 1
                                              ? 'Completado'
                                              : venta.estado === 0
                                                ? 'Anulado'
                                                : venta.estado === 2
                                                  ? 'En proceso'
                                                  : venta.estado === 3
                                                    ? 'Pendiente de anulación'
                                                    : 'Desconocido'}
                                          </span>
                                        </TableCell>
                                        <TableCell className='py-3 px-4 text-center'>
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            onClick={() => openDetailModal(venta, 'venta')}
                                          >
                                            <Eye className='w-4 h-4' />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ));
                                  })()}
                                </TableBody>
                              </Table>

                              {/* Paginador para Ventas */}
                              {(() => {
                                const { totalPages } = getFilteredAndPaginatedData(realVentasData);
                                return totalPages > 1 ? (
                                  <div className='p-4 border-t border-gray-100 dark:border-gray-800'>
                                    <Paginate
                                      page={currentPage}
                                      totalPages={totalPages}
                                      setPage={setCurrentPage}
                                    />
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tabla de Servicios */}
                    {!showVentasTable && (
                      <div className='mt-6'>
                        {realServiciosData.length === 0 ? (
                          <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden p-8 text-center'>
                            <div className='text-gray-500 dark:text-gray-400 text-lg font-medium mb-2'>
                              No hay datos de servicios
                            </div>
                            <div className='text-gray-400 dark:text-gray-500 text-sm'>
                              No se encontraron servicios para {formatDatesList().toLowerCase()}
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
                                  {(() => {
                                    const { data: paginatedData } =
                                      getFilteredAndPaginatedData(realServiciosData);
                                    return paginatedData.map(servicio => (
                                      <TableRow
                                        key={servicio.codigo}
                                        className='text-sm border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30'
                                      >
                                        <TableCell className='py-3 px-4 font-medium'>
                                          {servicio.codigo}
                                        </TableCell>
                                        <TableCell className='py-3 px-4'>
                                          {servicio.cliente}
                                        </TableCell>
                                        <TableCell className='py-3 px-4'>
                                          {servicio.habitacion}
                                        </TableCell>
                                        <TableCell className='py-3 px-4 text-right font-medium'>
                                          {formatCurrencyCLP(servicio.total)}
                                        </TableCell>
                                        <TableCell className='py-3 px-4'>
                                          {servicio.fecha_crea || servicio.fechaHoraServicio ? (
                                            <div className='text-center'>
                                              <div className='text-sm font-medium'>
                                                {formatDateToSpanish(
                                                  servicio.fecha_crea || servicio.fechaHoraServicio
                                                )}
                                              </div>
                                              <div className='text-xs text-gray-500 dark:text-gray-400'>
                                                {formatTimeFromDate(
                                                  servicio.fecha_crea || servicio.fechaHoraServicio
                                                )}
                                              </div>
                                            </div>
                                          ) : (
                                            'N/A'
                                          )}
                                        </TableCell>
                                        <TableCell className='py-3 px-4'>
                                          <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                              servicio.estado === 0
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                : servicio.estado === 1
                                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                                  : servicio.estado === 2
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                                    : servicio.estado === 3
                                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                                      : servicio.estado === 4
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                            }`}
                                          >
                                            {servicio.estado === 0
                                              ? 'Pagado'
                                              : servicio.estado === 1
                                                ? 'Finalizado'
                                                : servicio.estado === 2
                                                  ? 'En proceso'
                                                  : servicio.estado === 3
                                                    ? 'Solicitud de anulación'
                                                    : servicio.estado === 4
                                                      ? 'Anulado'
                                                      : 'Desconocido'}
                                          </span>
                                        </TableCell>
                                        <TableCell className='py-3 px-4 text-center'>
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            onClick={() => openDetailModal(servicio, 'servicio')}
                                          >
                                            <Eye className='w-4 h-4' />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ));
                                  })()}
                                </TableBody>
                              </Table>

                              {/* Paginador para Servicios */}
                              {(() => {
                                const { totalPages } =
                                  getFilteredAndPaginatedData(realServiciosData);
                                return totalPages > 1 ? (
                                  <div className='p-4 border-t border-gray-100 dark:border-gray-800'>
                                    <Paginate
                                      page={currentPage}
                                      totalPages={totalPages}
                                      setPage={setCurrentPage}
                                    />
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className='flex-shrink-0 border-t px-6 py-4'>
                  <div className='flex justify-center'>
                    <Button
                      variant='outline'
                      className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2'
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal de Detalles */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
              <DialogContent className='max-w-2xl w-full max-h-[90vh] flex flex-col p-0'>
                <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
                  <DialogTitle className='text-lg font-semibold'>
                    {selectedItemType === 'venta' ? 'Detalle de Venta' : 'Detalle de Servicio'}
                    <span className='ml-2 text-gray-500 font-normal'>{selectedItem?.codigo}</span>
                  </DialogTitle>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-6 py-4'>
                  {/* Información General */}
                  <div className='grid grid-cols-2 gap-4 mb-4'>
                    <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                      <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                        Cliente
                      </div>
                      <div className='font-medium'>{selectedItem?.cliente || 'N/A'}</div>
                    </div>
                    <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                      <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                        Habitación
                      </div>
                      <div className='font-medium'>{selectedItem?.habitacion || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Anfitrionas */}
                  <div className='mb-4'>
                    <div className='p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg'>
                      <div className='text-xs text-purple-600 dark:text-purple-400 uppercase mb-2 font-semibold'>
                        Anfitrionas Involucradas
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {(selectedItem?.anfitrionas || selectedItem?.anfitriona || 'N/A')
                          .split(',')
                          .map((anfitriona: string, idx: number) => (
                            <span
                              key={idx}
                              className='px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium'
                            >
                              {anfitriona.trim()}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>

                  {selectedItem && selectedItemType === 'venta' && (
                    <div className='space-y-4'>
                      {/* Detalles financieros de Venta */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Precio Habitación
                          </div>
                          <div className='font-medium'>
                            {formatCurrencyCLP(
                              selectedItem.precio || selectedItem.precioHabitacion || 0
                            )}
                          </div>
                        </div>
                        <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                          <div className='text-xs text-green-600 dark:text-green-400 uppercase mb-1'>
                            Propina Total
                          </div>
                          <div className='font-medium text-green-600 dark:text-green-400'>
                            {formatCurrencyCLP(
                              selectedItem.propina_total || selectedItem.propina || 0
                            )}
                          </div>
                        </div>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Subtotal
                          </div>
                          <div className='font-medium'>
                            {formatCurrencyCLP(
                              selectedItem.sub_total || selectedItem.subtotal || 0
                            )}
                          </div>
                        </div>
                        <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                          <div className='text-xs text-blue-600 dark:text-blue-400 uppercase mb-1'>
                            Comisión Total
                          </div>
                          <div className='font-medium text-blue-600 dark:text-blue-400'>
                            {formatCurrencyCLP(
                              selectedItem.comision_total ||
                                selectedItem.total_comision ||
                                selectedItem.comision ||
                                0
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Distribución de Propina por Anfitriona */}
                      {selectedItem.distribucion_propina && (
                        <div className='p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
                          <div className='text-sm font-semibold text-green-700 dark:text-green-300 mb-2'>
                            Distribución de Propina
                          </div>
                          <div className='space-y-2'>
                            {selectedItem.distribucion_propina
                              .split('|')
                              .map((item: string, idx: number) => {
                                const [nombre, monto] = item.split(':');
                                return (
                                  <div key={idx} className='flex justify-between items-center'>
                                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                      {nombre}
                                    </span>
                                    <span className='font-semibold text-green-600 dark:text-green-400'>
                                      {formatCurrencyCLP(parseFloat(monto) || 0)}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Comisión por Anfitriona */}
                      {selectedItem.comision_por_anfitriona && (
                        <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
                          <div className='text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2'>
                            Comisión por Anfitriona
                          </div>
                          <div className='space-y-2'>
                            {selectedItem.comision_por_anfitriona
                              .split('|')
                              .map((item: string, idx: number) => {
                                const [nombre, monto] = item.split(':');
                                return (
                                  <div key={idx} className='flex justify-between items-center'>
                                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                      {nombre}
                                    </span>
                                    <span className='font-semibold text-blue-600 dark:text-blue-400'>
                                      {formatCurrencyCLP(parseFloat(monto) || 0)}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className='p-4 bg-black text-white rounded-lg'>
                        <div className='text-xs text-gray-400 uppercase mb-1'>Total Venta</div>
                        <div className='text-2xl font-bold'>
                          {formatCurrencyCLP(selectedItem.total || 0)}
                        </div>
                      </div>

                      {/* Fecha y Estado */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Fecha de Venta
                          </div>
                          <div className='font-medium'>
                            {selectedItem.fecha_crea || selectedItem.fechaVenta
                              ? formatDateToSpanish(
                                  selectedItem.fecha_crea || selectedItem.fechaVenta
                                )
                              : 'N/A'}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {selectedItem.fecha_crea || selectedItem.fechaVenta
                              ? formatTimeFromDate(
                                  selectedItem.fecha_crea || selectedItem.fechaVenta
                                )
                              : ''}
                          </div>
                        </div>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Estado
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              selectedItem.estado === 1
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : selectedItem.estado === 0
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                  : selectedItem.estado === 2
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                    : selectedItem.estado === 3
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                            }`}
                          >
                            {selectedItem.estado === 1
                              ? 'Completado'
                              : selectedItem.estado === 0
                                ? 'Anulado'
                                : selectedItem.estado === 2
                                  ? 'En proceso'
                                  : selectedItem.estado === 3
                                    ? 'Pendiente de anulación'
                                    : 'Desconocido'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedItem && selectedItemType === 'servicio' && (
                    <div className='space-y-4'>
                      {/* Tiempo y Método de Pago */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Tiempo
                          </div>
                          <div className='font-medium'>
                            {selectedItem.tiempo}
                            {selectedItem.tiempo && !selectedItem.tiempo.toString().includes('hrs')
                              ? ' min'
                              : ''}
                          </div>
                        </div>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Método de Pago
                          </div>
                          <div className='font-medium'>
                            {selectedItem.metodo_pago || selectedItem.metodoPago || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Detalles financieros de Servicio */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Precio Habitación
                          </div>
                          <div className='font-medium'>
                            {formatCurrencyCLP(
                              selectedItem.precio_habitacion || selectedItem.precioHabitacion || 0
                            )}
                          </div>
                        </div>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Precio Servicio
                          </div>
                          <div className='font-medium'>
                            {formatCurrencyCLP(
                              selectedItem.precio_servicio || selectedItem.precioServicio || 0
                            )}
                          </div>
                        </div>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            IVA
                          </div>
                          <div className='font-medium'>
                            {formatCurrencyCLP(selectedItem.iva || 0)}
                          </div>
                        </div>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Subtotal
                          </div>
                          <div className='font-medium'>
                            {formatCurrencyCLP(
                              selectedItem.sub_total || selectedItem.subtotal || 0
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Comisión Total */}
                      <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
                        <div className='text-xs text-blue-600 dark:text-blue-400 uppercase mb-1'>
                          Comisión Total
                        </div>
                        <div className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                          {formatCurrencyCLP(selectedItem.comision_total || 0)}
                        </div>
                      </div>

                      {/* Comisión por Anfitriona */}
                      {selectedItem.comision_por_anfitriona && (
                        <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
                          <div className='text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2'>
                            Comisión por Anfitriona
                          </div>
                          <div className='space-y-2'>
                            {selectedItem.comision_por_anfitriona
                              .split('|')
                              .map((item: string, idx: number) => {
                                const [nombre, monto] = item.split(':');
                                return (
                                  <div key={idx} className='flex justify-between items-center'>
                                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                      {nombre}
                                    </span>
                                    <span className='font-semibold text-blue-600 dark:text-blue-400'>
                                      {formatCurrencyCLP(parseFloat(monto) || 0)}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className='p-4 bg-black text-white rounded-lg'>
                        <div className='text-xs text-gray-400 uppercase mb-1'>Total Servicio</div>
                        <div className='text-2xl font-bold'>
                          {formatCurrencyCLP(selectedItem.total || 0)}
                        </div>
                      </div>

                      {/* Fecha y Estado */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Fecha y Hora
                          </div>
                          <div className='font-medium'>
                            {selectedItem.fecha_crea || selectedItem.fechaHoraServicio
                              ? formatDateToSpanish(
                                  selectedItem.fecha_crea || selectedItem.fechaHoraServicio
                                )
                              : 'N/A'}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {selectedItem.fecha_crea || selectedItem.fechaHoraServicio
                              ? formatTimeFromDate(
                                  selectedItem.fecha_crea || selectedItem.fechaHoraServicio
                                )
                              : ''}
                          </div>
                        </div>
                        <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                          <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                            Estado
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              selectedItem.estado === 0
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : selectedItem.estado === 1
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                  : selectedItem.estado === 2
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                    : selectedItem.estado === 3
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                      : selectedItem.estado === 4
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                            }`}
                          >
                            {selectedItem.estado === 0
                              ? 'Pagado'
                              : selectedItem.estado === 1
                                ? 'Finalizado'
                                : selectedItem.estado === 2
                                  ? 'En proceso'
                                  : selectedItem.estado === 3
                                    ? 'Solicitud de anulación'
                                    : selectedItem.estado === 4
                                      ? 'Anulado'
                                      : 'Desconocido'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className='flex-shrink-0 border-t px-6 py-4'>
                  <div className='flex justify-center'>
                    <Button
                      variant='outline'
                      className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2'
                      onClick={() => setIsDetailModalOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );
      })()}
    </PermissionGuard>
  );
}
