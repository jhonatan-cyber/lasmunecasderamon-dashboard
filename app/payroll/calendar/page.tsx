'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingCart, Users, DollarSign, Clock, Gift, Zap } from 'lucide-react';
import { useCalendarActions } from '@/hooks/calendario/useCalendarActions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { getMonthDateRange, toDateKey } from '@/lib/utils/calendarUtils';
import { PayrollCalendarHeader } from '@/components/payroll/calendar/PayrollCalendarHeader';
import { PayrollCalendarLegend } from '@/components/payroll/calendar/PayrollCalendarLegend';
import { PayrollCalendarView } from '@/components/payroll/calendar/PayrollCalendarView';
import { PayrollCalendarDataModal } from '@/components/payroll/calendar/PayrollCalendarDataModal';
import { PayrollCalendarDetailModal } from '@/components/payroll/calendar/PayrollCalendarDetailModal';

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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'venta' | 'servicio' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const { startDate, endDate } = getMonthDateRange(currentDate);
  const { actions: calendarActions } = useCalendarActions(startDate, endDate);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const days = [];

    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      const prevMonth = new Date(year, month - 1, 0);
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }

    return days;
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);

    if (currentView === 'multi') {
      newDate.setMonth(currentDate.getMonth() + direction * 4);
    } else {
      newDate.setMonth(currentDate.getMonth() + direction);
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const isDateSelected = (date: Date) =>
    selectedDates.some(selectedDate => selectedDate.toDateString() === date.toDateString());

  const getActionsForDate = (date: Date) => calendarActions[toDateKey(date)] || [];

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

  const renderDateActions = (date: Date) => {
    const actions = getActionsForDate(date);
    if (actions.length === 0) return null;

    const uniqueActions = Object.values(
      actions.reduce((acc: Record<string, any>, action: any) => {
        if (!acc[action.tipo]) acc[action.tipo] = action;
        return acc;
      }, {})
    );

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
        {actions.length > uniqueActions.length && (
          <div className='text-xs text-gray-500'>{actions.length} total</div>
        )}
      </div>
    );
  };

  const getDateRange = (startDateValue: Date, endDateValue: Date): Date[] => {
    const dates: Date[] = [];
    const start = new Date(Math.min(startDateValue.getTime(), endDateValue.getTime()));
    const end = new Date(Math.max(startDateValue.getTime(), endDateValue.getTime()));

    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const handleMouseDown = (date: Date) => {
    if (!canViewDetails) return;
    setIsDragging(true);
    setDragStartDate(date);
    setSelectedDates([date]);
  };

  const handleMouseEnter = (date: Date) => {
    if (!canViewDetails || !isDragging || !dragStartDate) return;
    setSelectedDates(getDateRange(dragStartDate, date));
  };

  const handleMouseUp = () => {
    if (!canViewDetails) return;

    const wasDragging = isDragging;
    setIsDragging(false);
    setDragStartDate(null);

    if (wasDragging && selectedDates.length > 0) {
      setIsModalOpen(true);
      setTimeout(() => fetchCalendarData('ventas'), 100);
    }
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setIsModalOpen(false);
    setRealVentasData([]);
    setRealServiciosData([]);
    setSearchTerm('');
    setCurrentPage(1);
    setIsDetailModalOpen(false);
    setSelectedItem(null);
    setSelectedItemType(null);
  };

  const openDetailModal = (item: any, type: 'venta' | 'servicio') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setIsDetailModalOpen(true);
  };

  const fetchCalendarData = async (type: 'ventas' | 'servicios') => {
    if (selectedDates.length === 0) return;

    setIsLoading(true);
    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const startDateValue = toDateKey(sortedDates[0]);
      const endDateValue = toDateKey(sortedDates[sortedDates.length - 1]);
      const response = await fetch(
        `/api/calendar/data?startDate=${startDateValue}&endDate=${endDateValue}&type=${type}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      if (type === 'ventas') {
        setRealVentasData(result.data);
      } else {
        setRealServiciosData(result.data);
      }
    } catch (error) {
      console.error(`Error al obtener datos de ${type}:`, error);
      if (type === 'ventas') setRealVentasData([]);
      else setRealServiciosData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDatesList = () => {
    if (selectedDates.length === 0) return 'No hay fechas seleccionadas';

    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const first = sortedDates[0];
    const last = sortedDates[sortedDates.length - 1];

    if (sortedDates.length === 1) {
      return `${first.getDate()} de ${months[first.getMonth()]} ${first.getFullYear()}`;
    }

    return `${first.getDate()} de ${months[first.getMonth()]} - ${last.getDate()} de ${months[last.getMonth()]} ${last.getFullYear()}`;
  };

  const formatDateToSpanish = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    return `${day}-${months[date.getMonth()].toLowerCase()}-${date.getFullYear()}`;
  };

  const formatTimeFromDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  const getFilteredAndPaginatedData = (data: any[]) => {
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

    const startIndex = (currentPage - 1) * rowsPerPage;
    return {
      data: filteredData.slice(startIndex, startIndex + rowsPerPage),
      totalPages: Math.ceil(filteredData.length / rowsPerPage),
      totalItems: filteredData.length
    };
  };

  const getTitle = () => {
    if (currentView === 'multi') {
      const startMonth = months[currentDate.getMonth()];
      const endMonth = months[(currentDate.getMonth() + 3) % 12];
      const startYear = currentDate.getFullYear();
      const endYear = currentDate.getMonth() + 3 >= 12 ? startYear + 1 : startYear;
      return `${startMonth} - ${endMonth} ${endYear}`;
    }

    return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  return (
    <PermissionGuard module='payroll_details' action='view'>
      <div className='min-h-screen p-4 sm:p-6 lg:p-10 flex flex-col bg-gray-50 dark:bg-gray-900'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'>
            Calendario de Planillas
          </h1>
        </div>

        <div className='flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'>
          <PayrollCalendarHeader
            title={getTitle()}
            currentView={currentView}
            selectedCount={selectedDates.length}
            onNavigate={navigate}
            onToday={goToToday}
            onClearSelection={clearSelection}
            onChangeView={setCurrentView}
          />

          <div className='flex-1'>
            <PayrollCalendarView
              currentDate={currentDate}
              currentView={currentView}
              months={months}
              weekdays={weekdays}
              canViewDetails={canViewDetails}
              isDragging={isDragging}
              getDaysInMonth={getDaysInMonth}
              isToday={isToday}
              isDateSelected={isDateSelected}
              handleMouseDown={handleMouseDown}
              handleMouseEnter={handleMouseEnter}
              handleMouseUp={handleMouseUp}
              renderDateActions={renderDateActions}
              getActionsForDate={getActionsForDate}
            />
          </div>

          <PayrollCalendarLegend canViewDetails={canViewDetails} />
        </div>

        <PayrollCalendarDataModal
          open={isModalOpen}
          selectedDatesCount={selectedDates.length}
          formattedDates={formatDatesList()}
          isLoading={isLoading}
          showVentasTable={showVentasTable}
          ventasData={realVentasData}
          serviciosData={realServiciosData}
          searchTerm={searchTerm}
          rowsPerPage={rowsPerPage}
          currentPage={currentPage}
          onOpenChange={setIsModalOpen}
          onClose={() => setIsModalOpen(false)}
          onToggleTable={showVentas => {
            setShowVentasTable(showVentas);
            setCurrentPage(1);
            setSearchTerm('');
          }}
          onSearchChange={setSearchTerm}
          onRowsPerPageChange={value => {
            setRowsPerPage(value);
            setCurrentPage(1);
          }}
          onPageChange={setCurrentPage}
          onOpenDetail={openDetailModal}
          onFetchData={fetchCalendarData}
          getFilteredAndPaginatedData={getFilteredAndPaginatedData}
          formatDateToSpanish={formatDateToSpanish}
          formatTimeFromDate={formatTimeFromDate}
        />

        <PayrollCalendarDetailModal
          open={isDetailModalOpen}
          selectedItem={selectedItem}
          selectedItemType={selectedItemType}
          onOpenChange={setIsDetailModalOpen}
          formatDateToSpanish={formatDateToSpanish}
          formatTimeFromDate={formatTimeFromDate}
        />
      </div>
    </PermissionGuard>
  );
}
