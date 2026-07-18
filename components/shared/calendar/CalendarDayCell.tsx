'use client';

import React from 'react';

import type { DataType } from '@/hooks/shared/useRoleCalendar';

type RoleType = 'garzon' | 'cajero' | 'anfitriona';

interface CalendarDayCellProps {
  day: {
    date: Date;
    isCurrentMonth: boolean;
  };
  index: number;
  isCurrentDay: boolean;
  isSelectedDay: boolean;
  isDragging: boolean;
  roleCategories: DataType[];
  getDataForDate: (date: Date) => Record<DataType, boolean>;
  onMouseDown: (date: Date) => void;
  onMouseEnter: (date: Date) => void;
  onClick: (date: Date) => void;
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

export default function CalendarDayCell({
  day,
  index,
  isCurrentDay,
  isSelectedDay,
  isDragging,
  roleCategories,
  getDataForDate,
  onMouseDown,
  onMouseEnter,
  onClick
}: CalendarDayCellProps) {
  const data = getDataForDate(day.date);
  const indicators: React.ReactNode[] = [];

  roleCategories.forEach(key => {
    if (data[key]) {
      const config = allDataTypeConfig[key];
      indicators.push(
        <div
          key={key}
          className={`w-full h-3 bg-linear-to-r ${config.indicatorBg} rounded-sm text-[11px] text-white text-center leading-none mb-1 shadow-xs border`}
        >
          <span className='font-semibold'>{config.indicatorLabel}</span>
        </div>
      );
    }
  });

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
        onMouseDown(day.date);
      }}
      onMouseEnter={() => onMouseEnter(day.date)}
      onClick={() => onClick(day.date)}
    >
      <div
        className={`text-sm font-medium mb-2 ${
          !day.isCurrentMonth
            ? 'text-gray-400 dark:text-gray-600'
            : isCurrentDay
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-900 dark:text-white'
        }`}
      >
        {day.date.getDate()}
      </div>

      {indicators}
    </div>
  );
}
