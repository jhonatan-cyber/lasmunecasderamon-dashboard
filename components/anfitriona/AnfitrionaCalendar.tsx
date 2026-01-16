'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

interface AnfitrionaCalendarProps {
  userId: number;
}

type DataType = 'asistencias' | 'anticipos' | 'comisiones' | 'servicios';

interface CalendarData {
  asistencias: any[];
  anticipos: any[];
  comisiones: any[];
  servicios: any[];
}

const dataTypeConfig = {
  asistencias: {
    title: 'Asistencias',
    icon: CalendarIcon,
    color: 'text-green-600'
  },
  anticipos: {
    title: 'Anticipos',
    icon: CalendarIcon,
    color: 'text-red-600'
  },
  comisiones: {
    title: 'Comisiones',
    icon: CalendarIcon,
    color: 'text-yellow-600'
  },
  servicios: {
    title: 'Servicios',
    icon: CalendarIcon,
    color: 'text-purple-600'
  }
};

export default function AnfitrionaCalendar({ userId }: AnfitrionaCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [selectedDataType, setSelectedDataType] = useState<DataType>('asistencias');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarData>({
    asistencias: [],
    anticipos: [],
    comisiones: [],
    servicios: []
  });
  const [selectedDateData, setSelectedDateData] = useState<any[]>([]);
  const [isLoadingSelectedData, setIsLoadingSelectedData] = useState(false);
  const [modalCounts, setModalCounts] = useState<{ [key: string]: number }>({
    asistencias: 0,
    anticipos: 0,
    comisiones: 0,
    servicios: 0
  });
  const [modalTotal, setModalTotal] = useState<number>(0);

  const getSelectedDateData = () => {
    return selectedDateData;
  };

  const fetchSelectedDateData = async () => {
    if (selectedDates.length === 0) {
      setSelectedDateData([]);
      setModalCounts({ asistencias: 0, anticipos: 0, comisiones: 0, servicios: 0 });
      return;
    }

    setIsLoadingSelectedData(true);
    try {
      const dateStrs = selectedDates.map(date => date.toISOString().split('T')[0]);

      // Calcular conteos para todos los tipos de datos
      const newCounts: { [key: string]: number } = {
        asistencias: 0,
        anticipos: 0,
        comisiones: 0,
        servicios: 0
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

      // Calcular conteo de comisiones
      newCounts.comisiones = calendarData.comisiones.filter(item =>
        dateStrs.includes(item.fecha_crea?.split('T')[0])
      ).length;

      // Obtener conteo de servicios
      try {
        const serviciosDatesParam = dateStrs.join(',');
        const serviciosRes = await fetch(`/api/servicios/by-dates?dates=${serviciosDatesParam}`);
        const serviciosData = await serviciosRes.json();
        newCounts.servicios = serviciosData.success ? serviciosData.data?.length || 0 : 0;
      } catch (error) {
      }

      setModalCounts(newCounts);

      // Calcular total: Asistencias + Comisiones + Servicios - Anticipos (solo estado 1)
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

      // Sumar comisiones (comision)
      if (newCounts.comisiones > 0) {
        const comisionesEstado1 = calendarData.comisiones.filter(
          (item: any) => dateStrs.includes(item.fecha_crea?.split('T')[0]) && item.estado === 1
        );
        total += comisionesEstado1.reduce((sum: number, item: any) => sum + (item.comision || 0), 0);
      }

      // Sumar servicios (precio_servicio) - estado 0 (POR COBRAR) y estado 4 (PAGADO)
      if (newCounts.servicios > 0) {
        try {
          const serviciosDatesParam = dateStrs.join(',');
          const serviciosRes = await fetch(
            `/api/servicios/by-dates?dates=${serviciosDatesParam}`
          );
          const serviciosData = await serviciosRes.json();
          if (serviciosData.success && serviciosData.data) {
            const serviciosValidos = serviciosData.data.filter(
              (item: any) => item.estado === 0 || item.estado === 4
            );
            total += serviciosValidos.reduce(
              (sum: number, item: any) => sum + (item.precio_servicio || 0),
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
        case 'comisiones':
          setSelectedDateData(
            calendarData.comisiones.filter(item => dateStrs.includes(item.fecha_crea?.split('T')[0]))
          );
          break;
        case 'servicios':
          const serviciosDatesParam = dateStrs.join(',');
          const serviciosRes = await fetch(
            `/api/servicios/by-dates?dates=${serviciosDatesParam}`
          );
          const serviciosData = await serviciosRes.json();
          setSelectedDateData(serviciosData.success ? serviciosData.data || [] : []);
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

  useEffect(() => {
    if (isModalOpen && selectedDates.length > 0) {
      fetchSelectedDateData();
    }
  }, [selectedDates, selectedDataType, isModalOpen]);

  const fetchCalendarData = async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
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

      // Fetch comisiones usando la API existente
      const comisionesRes = await fetch(`/api/commissions/user?startDate=${startDate}&endDate=${endDate}`);
      const comisionesData = await comisionesRes.json();

      // Fetch servicios usando la nueva API
      const serviciosRes = await fetch(
        `/api/servicios/by-dates?startDate=${startDate}&endDate=${endDate}`
      );
      const serviciosData = await serviciosRes.json();

      const calendarDataToSet = {
        asistencias: asistenciasData.success ? asistenciasData.data || [] : [],
        anticipos: anticiposData.success ? anticiposData.data || [] : [],
        comisiones: comisionesData.success ? comisionesData.data || [] : [],
        servicios: serviciosData.success ? serviciosData.data || [] : []
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

  const getDataForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    // Verificar asistencias - usar la misma lógica que anticipos y servicios
    const asistenciasMatch = calendarData.asistencias.some((item: any) => {
      const itemFecha = item.fecha;
      let matches = false;

      // Usar la misma lógica que anticipos y servicios
      if (itemFecha) {
        if (itemFecha instanceof Date) {
          matches = itemFecha.toISOString().split('T')[0] === dateStr;
        } else if (typeof itemFecha === 'string') {
          matches = itemFecha.split('T')[0] === dateStr;
        }
      }

      return matches;
    });

    const anticiposMatch = calendarData.anticipos.some(
      (item: any) => item.fecha_crea?.split('T')[0] === dateStr
    );
    const comisionesMatch = calendarData.comisiones.some(
      (item: any) => item.fecha_crea?.split('T')[0] === dateStr
    );
    const serviciosMatch = calendarData.servicios.some(
      (item: any) => item.fecha_crea?.split('T')[0] === dateStr
    );

    const result = {
      asistencias: asistenciasMatch,
      anticipos: anticiposMatch,
      comisiones: comisionesMatch,
      servicios: serviciosMatch
    };

    return result;
  };

  const hasDataForDate = (date: Date) => {
    const data = getDataForDate(date);
    return data.asistencias || data.anticipos || data.comisiones || data.servicios;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDates.some(selectedDate => selectedDate.toDateString() === date.toDateString());
  };

  const handleDateClick = (date: Date) => {
    // Si no estamos haciendo drag, manejar la selección
    if (!isDragging) {
      if (selectedDates.some(d => d.toDateString() === date.toDateString())) {
        setSelectedDates(selectedDates.filter(d => d.toDateString() !== date.toDateString()));
      } else {
        setSelectedDates([...selectedDates, date]);
      }
      setIsModalOpen(true);
    }
  };

  const handleMouseDown = (date: Date) => {
    setIsDragging(true);
    setDragStartDate(date);
    setSelectedDates([date]);
  };

  const handleMouseEnter = (date: Date) => {
    if (isDragging && dragStartDate) {
      const range = getDateRange(dragStartDate, date);
      setSelectedDates(range);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartDate(null);
      if (selectedDates.length > 0) {
        setIsModalOpen(true);
      }
    }
  };

  const getDateRange = (start: Date, end: Date) => {
    const dates: Date[] = [];
    const current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setIsModalOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDatesList = () => {
    if (selectedDates.length === 0) return '';
    if (selectedDates.length === 1) {
      return selectedDates[0].toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return `${selectedDates.length} fechas seleccionadas`;
  };

  const formatSimpleDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (estado: number, dataType?: DataType) => {
    // Para servicios, usar la lógica específica
    if (dataType === 'servicios') {
      switch (estado) {
        case 0:
          return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">POR COBRAR</span>;
        case 1:
          return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">EN PROCESO</span>;
        case 2:
          return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">PENDIENTE ANULACIÓN</span>;
        case 3:
          return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">ANULADO</span>;
        case 4:
          return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">PAGADO</span>;
        default:
          return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">DESCONOCIDO</span>;
      }
    }
    
    // Para otros tipos de datos (asistencias, anticipos, comisiones)
    if (estado === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">PAGADO</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">POR PAGAR</span>;
    }
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDateCopy = new Date(startDate);

    while (currentDateCopy <= lastDay || days.length < 42) {
      days.push({
        date: new Date(currentDateCopy),
        isCurrentMonth: currentDateCopy.getMonth() === month
      });
      currentDateCopy.setDate(currentDateCopy.getDate() + 1);
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header del calendario */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={goToToday}>
              Hoy
            </Button>

            {selectedDates.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Limpiar ({selectedDates.length})
              </Button>
            )}
          </div>
        </div>

        {/* Días del mes */}
        <div
          className="grid grid-cols-7"
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
                className={`min-h-[90px] p-2 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors select-none ${
                  isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                } ${
                  isSelectedDay
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
                  className={`text-sm font-medium mb-2 ${
                    day.isCurrentMonth
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-600'
                  } ${isCurrentDay ? 'text-blue-600 dark:text-blue-400' : ''}`}
                >
                  {day.date.getDate()}
                </div>

                {/* Indicadores de datos */}
                {hasData && (() => {
                  const data = getDataForDate(day.date);
                  const indicators = [];

                  if (data.asistencias) {
                    indicators.push(
                      <div
                        key="asistencia"
                        className="w-full h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-sm border border-green-300"
                      >
                        <span className="font-semibold">A</span>
                      </div>
                    );
                  }

                  if (data.anticipos) {
                    indicators.push(
                      <div
                        key="anticipo"
                        className="w-full h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-sm border border-red-300"
                      >
                        <span className="font-semibold">AN</span>
                      </div>
                    );
                  }

                  if (data.comisiones) {
                    indicators.push(
                      <div
                        key="comision"
                        className="w-full h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-sm border border-yellow-300"
                      >
                        <span className="font-semibold">C</span>
                      </div>
                    );
                  }

                  if (data.servicios) {
                    indicators.push(
                      <div
                        key="servicio"
                        className="w-full h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-sm border border-purple-300"
                      >
                        <span className="font-semibold">S</span>
                      </div>
                    );
                  }

                  return indicators;
                })()}
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-sm border border-green-300"></div>
              <span className="font-medium">A = Asistencia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-sm border border-red-300"></div>
              <span className="font-medium">AN = Anticipo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-sm border border-yellow-300"></div>
              <span className="font-medium">C = Comisión</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-sm border border-purple-300"></div>
              <span className="font-medium">S = Servicio</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Calendario de Anfitriona
            </h1>
            <div className="flex items-center gap-4">
              <Link href="/anfitriona-dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Vista del calendario */}
          <div className="flex-1">{renderMonthView()}</div>
        </div>
      </div>

      {/* Modal de fecha seleccionada */}
      <Dialog open={isModalOpen && selectedDates.length > 0} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-lg font-semibold">{formatDatesList()}</DialogTitle>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto px-6 py-4'>

          <div className="space-y-4 text-center">
            {/* Botones de tipo de datos */}
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(dataTypeConfig).map(([key, config]) => {
                const Icon = config.icon;
                const dateStrs = selectedDates.map(date => date.toISOString().split('T')[0]);

                // Usar los conteos calculados previamente
                const count = modalCounts[key] || 0;

                return (
                  <Button
                    key={key}
                    className={`flex-1 max-w-48 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-6 sm:px-8 py-3 ${
                      selectedDataType === key
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">
                  Total: $ {formatCurrencyNoDecimals(modalTotal)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  (Asistencias + Comisiones + Servicios (Por Cobrar/Pagados) - Anticipos)
                </div>
              </div>
            </div>

            {/* Tabla de datos */}
            <div className="mt-6 border rounded-lg overflow-x-auto">
              {isLoadingSelectedData ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <div className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
                    Cargando datos...
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 text-sm">
                    Obteniendo {dataTypeConfig[selectedDataType].title.toLowerCase()} para las
                    fechas seleccionadas
                  </div>
                </div>
              ) : getSelectedDateData().length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
                    No hay datos
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 text-sm">
                    No se encontraron {dataTypeConfig[selectedDataType].title.toLowerCase()} para
                    las fechas seleccionadas
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-center py-3 px-4 font-medium text-gray-900">#</th>
                        {selectedDataType === 'asistencias' && (
                          <>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">FECHA</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">HORA</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">
                              SUELDO
                            </th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">
                              APORTE
                            </th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">
                              SUELDO FINAL
                            </th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">
                              ESTADO
                            </th>
                          </>
                        )}
                        {selectedDataType === 'anticipos' && (
                          <>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">FECHA</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">MONTO</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">
                              ESTADO
                            </th>
                          </>
                        )}
                        {selectedDataType === 'comisiones' && (
                          <>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">FECHA</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">COMISIÓN</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-900">
                              ESTADO
                            </th>
                          </>
                        )}
                                                 {selectedDataType === 'servicios' && (
                           <>
                             <th className="text-center py-3 px-4 font-medium text-gray-900">CÓDIGO</th>
                             <th className="text-center py-3 px-4 font-medium text-gray-900">CLIENTE</th>
                             <th className="text-center py-3 px-4 font-medium text-gray-900">TIEMPO</th>
                             <th className="text-center py-3 px-4 font-medium text-gray-900">HABITACIÓN</th>
                             <th className="text-center py-3 px-4 font-medium text-gray-900">PRECIO</th>
                             <th className="text-center py-3 px-4 font-medium text-gray-900">FECHA HORA</th>
                             <th className="text-center py-3 px-4 font-medium text-gray-900">
                               ESTADO
                             </th>
                           </>
                         )}
                      </tr>
                    </thead>
                    <tbody>
                      {getSelectedDateData().map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-center">
                            <div className="w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-medium text-sm mx-auto">
                              {index + 1}
                            </div>
                          </td>
                          {selectedDataType === 'asistencias' && (
                            <>
                              <td className="py-3 px-4 text-center">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {formatSimpleDate(item.fecha)}
                                  </div>
                                  <div className="text-sm text-gray-500">{item.hora || 'N/A'}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-900 text-center">{item.hora || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-900 text-center">
                                {' '}
                                {formatCurrencyNoDecimals(item.sueldo || 0)}
                              </td>
                              <td className="py-3 px-4 text-gray-900 text-center">
                                {' '}
                                {formatCurrencyNoDecimals(item.aporte || 0)}
                              </td>
                              <td className="py-3 px-4 text-gray-900 text-center">
                                {' '}
                                {formatCurrencyNoDecimals(item.sueldo_final || 0)}
                              </td>
                              <td className="py-3 px-4 text-center">{getStatusBadge(item.estado, 'asistencias')}</td>
                            </>
                          )}
                          {selectedDataType === 'anticipos' && (
                            <>
                              <td className="py-3 px-4 text-center">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {formatSimpleDate(item.fecha_crea)}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-900 text-center">
                                 {formatCurrencyNoDecimals(item.monto || 0)}
                              </td>
                              <td className="py-3 px-4 text-center">{getStatusBadge(item.estado, 'anticipos')}</td>
                            </>
                          )}
                          {selectedDataType === 'comisiones' && (
                            <>
                              <td className="py-3 px-4 text-center">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {formatSimpleDate(item.fecha_crea)}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-900 text-center">
                                 {formatCurrencyNoDecimals(item.comision || 0)}
                              </td>
                              <td className="py-3 px-4 text-center">{getStatusBadge(item.estado, 'comisiones')}</td>
                            </>
                          )}
                                                     {selectedDataType === 'servicios' && (
                             <>
                               <td className="py-3 px-4 text-gray-900 text-center">{item.codigo || 'N/A'}</td>
                               <td className="py-3 px-4 text-gray-900 text-center">{item.cliente_nombre || 'N/A'}</td>
                               <td className="py-3 px-4 text-gray-900 text-center">{item.tiempo || 'N/A'}</td>
                               <td className="py-3 px-4 text-gray-900 text-center">{item.habitacion_numero || 'N/A'}</td>
                               <td className="py-3 px-4 text-gray-900 text-center font-bold">
                                  {formatCurrencyNoDecimals(item.precio_servicio || 0)}
                               </td>
                               <td className="py-3 px-4 text-center">
                                 <div>
                                   <div className="font-medium text-gray-900">
                                     {formatSimpleDate(item.fecha_crea)}
                                   </div>
                                   <div className="text-sm text-gray-500">
                                     {new Date(item.fecha_crea).toLocaleTimeString('es-ES', {
                                       hour: '2-digit',
                                       minute: '2-digit',
                                       second: '2-digit'
                                     })}
                                   </div>
                                 </div>
                               </td>
                               <td className="py-3 px-4 text-center">{getStatusBadge(item.estado, 'servicios')}</td>
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
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-6 sm:px-8 py-3"
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
