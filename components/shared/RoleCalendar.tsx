'use client';

import React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatMonthYearLabel } from '@/lib/utils/calendarUtils';
import { useRoleCalendar, type RoleType, type DataType } from '@/hooks/shared/useRoleCalendar';
import CalendarDayCell from './calendar/CalendarDayCell';
import CalendarDayModal from './calendar/CalendarDayModal';

interface RoleCalendarProps {
  role: RoleType;
  userId?: number | string;
  backLink: string;
}

const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function RoleCalendar({ role, userId, backLink }: RoleCalendarProps) {
  const {
    currentDate,
    selectedDates,
    isDragging,
    isModalOpen,
    isLoading,
    selectedDataType,
    selectedDateData,
    isLoadingSelectedData,
    modalCounts,
    modalTotal,
    roleCategories,
    navigate,
    goToToday,
    isToday,
    isSelected,
    getDataForDate,
    handleDateClick,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearSelection,
    setSelectedDataType,
    setIsModalOpen,
    getDaysInMonth
  } = useRoleCalendar({ role, userId });

  const days = getDaysInMonth(currentDate);
  const titleRole = role === 'garzon' ? 'Garzón' : role.charAt(0).toUpperCase() + role.slice(1);
  const isAnfitriona = role === 'anfitriona';

  const renderMonthView = () => {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='sm' onClick={() => navigate(-1)}>
              <ChevronLeft className='w-4 h-4' />
            </Button>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              {formatMonthYearLabel(currentDate)}
            </h2>
            <Button variant='ghost' size='sm' onClick={() => navigate(1)}>
              <ChevronRight className='w-4 h-4' />
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

        <div
          className='grid grid-cols-7'
          style={{ minHeight: '500px' }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {days.map((day, index) => (
            <CalendarDayCell
              key={index}
              day={day}
              index={index}
              isCurrentDay={isToday(day.date)}
              isSelectedDay={isSelected(day.date)}
              isDragging={isDragging}
              roleCategories={roleCategories}
              getDataForDate={getDataForDate}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
              onClick={handleDateClick}
            />
          ))}
        </div>

        <div className='p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'>
          <div className='flex flex-wrap items-center gap-4 text-sm'>
            {roleCategories.map(key => {
              const config = allDataTypeConfig[key];
              const parts = config.indicatorBg.split(' ');
              const bgClass = parts[0] + ' ' + parts[1];
              const borderClass = parts[3];
              return (
                <div key={key} className='flex items-center gap-2'>
                  <div
                    className={`w-6 h-3 bg-linear-to-r ${bgClass} rounded-sm shadow-xs border ${borderClass}`}
                  ></div>
                  <span className='text-gray-700 dark:text-gray-300 font-medium'>
                    {config.indicatorLabel} = {config.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='min-h-screen p-4 sm:p-6 lg:p-10 flex flex-col bg-gray-50 dark:bg-gray-900'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'>
          Calendario de {titleRole}
        </h1>
        <div className='flex items-center gap-4'>
          <Link href={backLink}>
            <Button
              variant='outline'
              size='sm'
              className='flex items-center gap-2 bg-black text-white rounded-full hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2 border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
            >
              <ArrowLeft className='w-4 h-4' />
              Volver
            </Button>
          </Link>
        </div>
      </div>

      <div className='flex-1'>{renderMonthView()}</div>

      <CalendarDayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDates={selectedDates}
        selectedDataType={selectedDataType}
        setSelectedDataType={setSelectedDataType}
        roleCategories={roleCategories}
        modalCounts={modalCounts}
        modalTotal={modalTotal}
        selectedDateData={selectedDateData}
        isLoadingSelectedData={isLoadingSelectedData}
        isAnfitriona={isAnfitriona}
      />
    </div>
  );
}

const allDataTypeConfig = {
  asistencias: {
    title: 'Asistencias',
    indicatorLabel: 'A',
    indicatorBg: 'from-green-400 to-green-600 border-green-300'
  },
  anticipos: {
    title: 'Anticipos',
    indicatorLabel: 'AN',
    indicatorBg: 'from-red-400 to-red-600 border-red-300'
  },
  propinas: {
    title: 'Propinas',
    indicatorLabel: 'P',
    indicatorBg: 'from-yellow-400 to-yellow-600 border-yellow-300'
  },
  horasExtras: {
    title: 'Horas Extras',
    indicatorLabel: 'HE',
    indicatorBg: 'from-purple-400 to-purple-600 border-purple-300'
  },
  comisiones: {
    title: 'Comisiones',
    indicatorLabel: 'C',
    indicatorBg: 'from-yellow-400 to-yellow-600 border-yellow-300'
  },
  servicios: {
    title: 'Servicios',
    indicatorLabel: 'S',
    indicatorBg: 'from-purple-400 to-purple-600 border-purple-300'
  }
};
