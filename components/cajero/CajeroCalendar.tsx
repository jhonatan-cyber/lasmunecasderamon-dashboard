'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, ArrowLeftRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

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

interface GarzonCalendarData {
  asistencias: any[];
  anticipos: any[];
  propinas: any[];
  horasExtras: any[];
}

interface GarzonCalendarProps {
  userId?: number;
}

export default function GarzonCalendar({ userId }: GarzonCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [currentView, setCurrentView] = useState('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calendarData, setCalendarData] = useState<GarzonCalendarData>({
    asistencias: [],
    anticipos: [],
    propinas: [],
    horasExtras: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<
    'asistencias' | 'anticipos' | 'propinas' | 'horasExtras'
  >('asistencias');

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
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDates.some(selectedDate => selectedDate.toDateString() === date.toDateString());
  };

  const getDataForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    // Verificar asistencias - usar la misma lógica que anticipos y horas extras
    const asistenciasMatch = calendarData.asistencias.some((item: any) => {
      const itemFecha = item.fecha;
      let matches = false;

      // Usar la misma lógica que anticipos y horas extras
      if (itemFecha) {
        // Si es un objeto Date, convertir a string YYYY-MM-DD
        if (itemFecha instanceof Date || (typeof itemFecha === 'object' && itemFecha !== null)) {
          const fechaString = itemFecha.toISOString().split('T')[0];
          matches = fechaString === dateStr;
        }
        // Si es un string, usar split('T')[0] como hacen los otros
        else if (typeof itemFecha === 'string') {
          const fechaString = itemFecha.split('T')[0];
          matches = fechaString === dateStr;
        }
      }

      return matches;
    });

    const anticiposMatch = calendarData.anticipos.some(
      (item: any) => item.fecha_crea?.split('T')[0] === dateStr
    );
    const propinasMatch = calendarData.propinas.some(
      (item: any) => item.fecha_crea?.split('T')[0] === dateStr
    );
    const horasExtrasMatch = calendarData.horasExtras.some(
      (item: any) => item.fecha_crea?.split('T')[0] === dateStr
    );

    const result = {
      asistencias: asistenciasMatch,
      anticipos: anticiposMatch,
      propinas: propinasMatch,
      horasExtras: horasExtrasMatch
    };



    return result;
  };

  const hasDataForDate = (date: Date) => {
    const data = getDataForDate(date);
    return data.asistencias || data.anticipos || data.propinas || data.horasExtras;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDates([date]);
    setIsModalOpen(true);
    setSelectedDataType('asistencias');
  };

  const handleMouseDown = (date: Date) => {
    setIsDragging(true);
    setDragStartDate(date);
    setSelectedDates([date]);
  };

  const handleMouseEnter = (date: Date) => {
    if (isDragging && dragStartDate) {
      const dateRange = getDateRange(dragStartDate, date);
      setSelectedDates(dateRange);
    }
  };

  const handleMouseUp = () => {
    const wasDragging = isDragging;
    setIsDragging(false);
    setDragStartDate(null);

    // Si hubo drag, abrir modal inmediatamente
    if (wasDragging && selectedDates.length > 0) {
      setIsModalOpen(true);
      setSelectedDataType('asistencias');
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
  };

  const fetchCalendarData = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Fetch asistencias usando la nueva API
      const asistenciasRes = await fetch(
        `/api/asistencias/by-dates?startDate=${startDate}&endDate=${endDate}`
      );
      const asistenciasData = await asistenciasRes.json();

      // Fetch anticipos usando la nueva API
      const anticiposRes = await fetch(
        `/api/anticipos/by-dates?startDate=${startDate}&endDate=${endDate}`
      );
      const anticiposData = await anticiposRes.json();

      // Fetch propinas
      const propinasRes = await fetch(`/api/tips/user?startDate=${startDate}&endDate=${endDate}`);
      const propinasData = await propinasRes.json();

      // Fetch horas extras usando la nueva API
      const horasExtrasRes = await fetch(
        `/api/overtime/by-dates?startDate=${startDate}&endDate=${endDate}`
      );
      const horasExtrasData = await horasExtrasRes.json();

      const calendarDataToSet = {
        asistencias: asistenciasData.success ? asistenciasData.data || [] : [],
        anticipos: anticiposData.success ? anticiposData.data || [] : [],
        propinas: propinasData.success ? propinasData.data || [] : [],
        horasExtras: horasExtrasData.success ? horasExtrasData.data || [] : []
      };

      setCalendarData(calendarDataToSet);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, userId]);

  useEffect(() => {
    if (isModalOpen && selectedDates.length > 0) {
      fetchSelectedDateData();
    }
  }, [selectedDates, selectedDataType, isModalOpen]);

  const [selectedDateData, setSelectedDateData] = useState<any[]>([]);
  const [isLoadingSelectedData, setIsLoadingSelectedData] = useState(false);
  const [modalCounts, setModalCounts] = useState<{ [key: string]: number }>({
    asistencias: 0,
    anticipos: 0,
    propinas: 0,
    horasExtras: 0
  });
  const [modalTotal, setModalTotal] = useState<number>(0);

  const getSelectedDateData = () => {
    return selectedDateData;
  };

  const fetchSelectedDateData = async () => {
    if (selectedDates.length === 0) {
      setSelectedDateData([]);
      setModalCounts({ asistencias: 0, anticipos: 0, propinas: 0, horasExtras: 0 });
      return;
    }

    setIsLoadingSelectedData(true);
    try {
      const dateStrs = selectedDates.map(date => date.toISOString().split('T')[0]);

      // Calcular conteos para todos los tipos de datos
      const newCounts: { [key: string]: number } = {
        asistencias: 0,
        anticipos: 0,
        propinas: 0,
        horasExtras: 0
      };

      // Obtener conteo de asistencias
      try {
        const asistenciasDatesParam = dateStrs.join(',');
        const asistenciasRes = await fetch(
          `/api/asistencias/by-dates?dates=${asistenciasDatesParam}`
        );
        const asistenciasData = await asistenciasRes.json();
        newCounts.asistencias = asistenciasData.success ? asistenciasData.data?.length || 0 : 0;
      } catch (error) {
      }

      // Obtener conteo de anticipos
      try {
        const anticiposDatesParam = dateStrs.join(',');
        const anticiposRes = await fetch(`/api/anticipos/by-dates?dates=${anticiposDatesParam}`);
        const anticiposData = await anticiposRes.json();
        newCounts.anticipos = anticiposData.success ? anticiposData.data?.length || 0 : 0;
      } catch (error) {
      }

      // Calcular conteo de propinas
      newCounts.propinas = calendarData.propinas.filter(item =>
        dateStrs.includes(item.fecha_crea?.split('T')[0])
      ).length;

      // Obtener conteo de horas extras
      try {
        const horasExtrasDatesParam = dateStrs.join(',');
        const horasExtrasRes = await fetch(`/api/overtime/by-dates?dates=${horasExtrasDatesParam}`);
        const horasExtrasData = await horasExtrasRes.json();
        newCounts.horasExtras = horasExtrasData.success ? horasExtrasData.data?.length || 0 : 0;
      } catch (error) {
      }

      setModalCounts(newCounts);

      // Calcular total: Asistencias + Propinas + Horas Extras - Anticipos (solo estado 1)
      let total = 0;

      // Sumar asistencias (sueldo_final)
      if (newCounts.asistencias > 0) {
        try {
          const asistenciasDatesParam = dateStrs.join(',');
          const asistenciasRes = await fetch(
            `/api/asistencias/by-dates?dates=${asistenciasDatesParam}`
          );
          const asistenciasData = await asistenciasRes.json();
          if (asistenciasData.success && asistenciasData.data) {
            const asistenciasEstado1 = asistenciasData.data.filter(
              (item: any) => item.estado === 1
            );
            total += asistenciasEstado1.reduce(
              (sum: number, item: any) => sum + (item.sueldo_final || 0),
              0
            );
          }
        } catch (error) {
        }
      }

      // Sumar propinas (monto)
      if (newCounts.propinas > 0) {
        const propinasEstado1 = calendarData.propinas.filter(
          (item: any) => dateStrs.includes(item.fecha_crea?.split('T')[0]) && item.estado === 1
        );
        total += propinasEstado1.reduce((sum: number, item: any) => sum + (item.monto || 0), 0);
      }

      // Sumar horas extras (total)
      if (newCounts.horasExtras > 0) {
        try {
          const horasExtrasDatesParam = dateStrs.join(',');
          const horasExtrasRes = await fetch(
            `/api/overtime/by-dates?dates=${horasExtrasDatesParam}`
          );
          const horasExtrasData = await horasExtrasRes.json();
          if (horasExtrasData.success && horasExtrasData.data) {
            const horasExtrasEstado1 = horasExtrasData.data.filter(
              (item: any) => item.estado === 1
            );
            total += horasExtrasEstado1.reduce(
              (sum: number, item: any) => sum + (item.total || 0),
              0
            );
          }
        } catch (error) {
        }
      }

      // Restar anticipos (monto)
      if (newCounts.anticipos > 0) {
        try {
          const anticiposDatesParam = dateStrs.join(',');
          const anticiposRes = await fetch(`/api/anticipos/by-dates?dates=${anticiposDatesParam}`);
          const anticiposData = await anticiposRes.json();
          if (anticiposData.success && anticiposData.data) {
            const anticiposEstado1 = anticiposData.data.filter((item: any) => item.estado === 1);
            total -= anticiposEstado1.reduce(
              (sum: number, item: any) => sum + (item.monto || 0),
              0
            );
          }
        } catch (error) {
        }
      }

      setModalTotal(total);

      // Obtener datos para el tipo seleccionado
      switch (selectedDataType) {
        case 'asistencias':
          const datesParam = dateStrs.join(',');
          const asistenciasRes = await fetch(`/api/asistencias/by-dates?dates=${datesParam}`);
          const asistenciasData = await asistenciasRes.json();
          setSelectedDateData(asistenciasData.success ? asistenciasData.data || [] : []);
          break;
        case 'anticipos':
          const anticiposDatesParam = dateStrs.join(',');
          const anticiposRes = await fetch(`/api/anticipos/by-dates?dates=${anticiposDatesParam}`);
          const anticiposData = await anticiposRes.json();
          setSelectedDateData(anticiposData.success ? anticiposData.data || [] : []);
          break;
        case 'propinas':
          setSelectedDateData(
            calendarData.propinas.filter(item => dateStrs.includes(item.fecha_crea?.split('T')[0]))
          );
          break;
        case 'horasExtras':
          const horasExtrasDatesParam = dateStrs.join(',');
          const horasExtrasRes = await fetch(
            `/api/overtime/by-dates?dates=${horasExtrasDatesParam}`
          );
          const horasExtrasData = await horasExtrasRes.json();
          setSelectedDateData(horasExtrasData.success ? horasExtrasData.data || [] : []);
          break;
        default:
          setSelectedDateData([]);
      }
    } catch (error) {

      setSelectedDateData([]);
    } finally {
      setIsLoadingSelectedData(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatSimpleDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

  const getStatusBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return <Badge className='bg-green-100 text-green-800'>PAGADO</Badge>;
      case 1:
        return <Badge className='bg-red-100 text-red-800'>POR PAGAR</Badge>;
      default:
        return <Badge className='bg-gray-100 text-gray-800'>Desconocido</Badge>;
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
            const isSelectedDay = isSelected(day.date);
            const hasData = hasDataForDate(day.date);

            return (
              <div
                key={index}
                className={`min-h-[90px] p-2 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors select-none ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${isSelectedDay
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
                    : ''
                  } ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
                onMouseDown={e => {
                  e.preventDefault();
                  handleMouseDown(day.date);
                }}
                onMouseEnter={() => handleMouseEnter(day.date)}
                onClick={() => handleDateClick(day.date)}
              >
                <div
                  className={`text-sm font-medium mb-2 ${!day.isCurrentMonth
                      ? 'text-gray-400 dark:text-gray-600'
                      : isCurrentDay
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-gray-900 dark:text-white'
                    }`}
                >
                  {day.date.getDate()}
                </div>

                {/* Indicadores de datos */}
                {(() => {
                  const data = getDataForDate(day.date);
                  const indicators = [];

                  if (data.asistencias) {
                    indicators.push(
                      <div
                        key='asistencia'
                        className='w-full h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-sm border border-green-300'
                      >
                        <span className='font-semibold'>A</span>
                      </div>
                    );
                  }

                  if (data.anticipos) {
                    indicators.push(
                      <div
                        key='anticipo'
                        className='w-full h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-sm border border-red-300'
                      >
                        <span className='font-semibold'>AN</span>
                      </div>
                    );
                  }

                  if (data.propinas) {
                    indicators.push(
                      <div
                        key='propina'
                        className='w-full h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-sm border border-yellow-300'
                      >
                        <span className='font-semibold'>P</span>
                      </div>
                    );
                  }

                  if (data.horasExtras) {
                    indicators.push(
                      <div
                        key='horaExtra'
                        className='w-full h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-sm border border-purple-300'
                      >
                        <span className='font-semibold'>HE</span>
                      </div>
                    );
                  }

                  return indicators;
                })()}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const dataTypeConfig = {
    asistencias: {
      title: 'Asistencias',
      icon: Calendar,
      color: 'text-blue-600',
      columns: ['Fecha', 'Hora', 'Estado', 'Sueldo', 'Aporte', 'Sueldo Final']
    },
    anticipos: {
      title: 'Anticipos',
      icon: ArrowLeftRight,
      color: 'text-orange-600',
      columns: ['Fecha', 'Monto', 'Estado', 'Observaciones']
    },
    propinas: {
      title: 'Propinas',
      icon: DollarSign,
      color: 'text-green-600',
      columns: ['Fecha', 'Monto', 'Estado', 'Observaciones']
    },
    horasExtras: {
      title: 'Horas Extras',
      icon: Clock,
      color: 'text-purple-600',
      columns: ['Fecha', 'Horas', 'Monto', 'Estado', 'Observaciones']
    }
  };

  return (
    <div className='min-h-screen p-4 sm:p-6 lg:p-10 flex flex-col bg-gray-50 dark:bg-gray-900'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'>
          Calendario de Cajero
        </h1>
        <div className='flex items-center gap-4'>
          <Link href='/'>
            <Button
              variant='outline'
              size='sm'
              className='flex items-center gap-2 bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
            >
              <ArrowLeft className='w-4 h-4' />
              Volver
            </Button>
          </Link>
        </div>
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
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
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
          </div>
        </div>

        {/* Vista del calendario */}
        <div className='flex-1'>{renderMonthView()}</div>

        {/* Leyenda */}
        <div className='p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'>
          <div className='flex flex-wrap gap-6 text-xs'>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-sm shadow-sm border border-green-300'></div>
              <span className='text-gray-700 dark:text-gray-300 font-medium'>A = Asistencia</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-sm shadow-sm border border-red-300'></div>
              <span className='text-gray-700 dark:text-gray-300 font-medium'>AN = Anticipo</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-sm shadow-sm border border-yellow-300'></div>
              <span className='text-gray-700 dark:text-gray-300 font-medium'>P = Propina</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-sm shadow-sm border border-purple-300'></div>
              <span className='text-gray-700 dark:text-gray-300 font-medium'>HE = Hora Extra</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de fecha seleccionada */}
      <Dialog open={isModalOpen && selectedDates.length > 0} onOpenChange={setIsModalOpen}>
        <DialogContent className='max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0'>
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle className='text-lg font-semibold'>{formatDatesList()}</DialogTitle>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-4 text-center'>
              {/* Botones de tipo de datos */}
              <div className='flex justify-center gap-4 flex-wrap'>
                {Object.entries(dataTypeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  const dateStrs = selectedDates.map(date => date.toISOString().split('T')[0]);

                  // Usar los conteos calculados previamente
                  const count = modalCounts[key] || 0;

                  return (
                    <Button
                      key={key}
                      className={`flex-1 max-w-48 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-6 sm:px-8 py-3 ${selectedDataType === key
                          ? 'bg-black text-white hover:bg-gray-800'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      variant={selectedDataType === key ? 'default' : 'outline'}
                      onClick={() => setSelectedDataType(key as any)}
                    >
                      <Icon className={`w-5 h-5 mr-3 ${config.color}`} />
                      {config.title} ({count})
                    </Button>
                  );
                })}
              </div>

              {/* Total */}
              <div className='bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4'>
                <div className='flex items-center justify-center gap-2'>
                  <span className='text-lg font-semibold text-gray-700'>Total a Cobrar:</span>
                  <span className='text-2xl font-bold text-blue-600'>
                    ${modalTotal.toLocaleString('es-ES')}
                  </span>
                </div>
                <div className='text-sm text-gray-600 mt-1'>
                  (Asistencias + Propinas + Horas Extras - Anticipos)
                </div>
              </div>

              {/* Tabla de datos */}
              <div className='mt-6 border rounded-lg overflow-x-auto'>
                {isLoadingSelectedData ? (
                  <div className='p-8 text-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
                    <div className='text-gray-500 dark:text-gray-400 text-lg font-medium mb-2'>
                      Cargando datos...
                    </div>
                    <div className='text-gray-400 dark:text-gray-500 text-sm'>
                      Obteniendo {dataTypeConfig[selectedDataType].title.toLowerCase()} para las
                      fechas seleccionadas
                    </div>
                  </div>
                ) : getSelectedDateData().length === 0 ? (
                  <div className='p-8 text-center'>
                    <div className='text-gray-500 dark:text-gray-400 text-lg font-medium mb-2'>
                      No hay datos
                    </div>
                    <div className='text-gray-400 dark:text-gray-500 text-sm'>
                      No se encontraron {dataTypeConfig[selectedDataType].title.toLowerCase()} para
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
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>FECHA</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>HORA</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>
                                SUELDO
                              </th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>
                                APORTE
                              </th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>
                                SUELDO FINAL
                              </th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>
                                ESTADO
                              </th>
                            </>
                          )}
                          {selectedDataType === 'anticipos' && (
                            <>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>FECHA</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>MONTO</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>
                                ESTADO
                              </th>
                            </>
                          )}
                          {selectedDataType === 'propinas' && (
                            <>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>FECHA</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>MONTO</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>
                                ESTADO
                              </th>
                            </>
                          )}
                          {selectedDataType === 'horasExtras' && (
                            <>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>FECHA</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>HORAS</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>MONTO</th>
                              <th className='text-center py-3 px-4 font-medium text-gray-900'>
                                ESTADO
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {getSelectedDateData().map((item, index) => (
                          <tr key={index} className='border-b border-gray-100 hover:bg-gray-50'>
                            <td className='py-3 px-4 text-center'>
                              <div className='w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-medium text-sm mx-auto'>
                                {index + 1}
                              </div>
                            </td>
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
                                <td className='py-3 px-4 text-gray-900 text-center'>{item.hora || 'N/A'}</td>
                                <td className='py-3 px-4 text-gray-900 text-center'>
                                  {' '}
                                  {formatCurrencyNoDecimals(item.sueldo || 0)}
                                </td>
                                <td className='py-3 px-4 text-gray-900 text-center'>
                                  {' '}
                                  {formatCurrencyNoDecimals(item.aporte || 0)}
                                </td>
                                <td className='py-3 px-4 text-gray-900 text-center'>
                                  {' '}
                                  {formatCurrencyNoDecimals(item.sueldo_final || 0)}
                                </td>
                                <td className='py-3 px-4 text-center'>{getStatusBadge(item.estado)}</td>
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
                                <td className='py-3 px-4 text-center'>{getStatusBadge(item.estado)}</td>
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
                                <td className='py-3 px-4 text-center'>{getStatusBadge(item.estado)}</td>
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
                                <td className='py-3 px-4 text-gray-900 text-center'>{item.hora || 0}</td>
                                <td className='py-3 px-4 text-gray-900 text-center'>
                                  {formatCurrencyNoDecimals(item.monto || 0)}
                                </td>
                                <td className='py-3 px-4 text-center'>{getStatusBadge(item.estado)}</td>
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

          <div className="flex-shrink-0 border-t px-6 py-4">
            <div className='flex justify-center'>
              <Button
                variant='outline'
                className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-6 sm:px-8 py-3'
                onClick={() => setIsModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
