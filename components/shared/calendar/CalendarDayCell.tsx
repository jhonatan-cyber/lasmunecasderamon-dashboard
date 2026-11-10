'use client';

import React from 'react';

import type { DataType } from '@/hooks/calendar/useRoleCalendar';
import { allDataTypeConfig } from './dataTypeConfig';

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
  onTouchStart: (date: Date, clientX: number, clientY: number) => void;
  onClick: (date: Date) => void;
}

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
  onTouchStart,
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
          className={`w-full h-2 bg-linear-to-r ${config.indicatorBg} rounded-sm text-[8px] text-white text-center leading-none mb-1 shadow-xs border sm:h-3 sm:text-[11px]`}
        >
          <span className='font-semibold'>{config.indicatorLabel}</span>
        </div>
      );
    }
  });

  return (
    <div
      key={index}
      data-calendar-date={day.date.getTime()}
      className={`min-h-[64px] p-1 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors select-none [touch-action:pan-y_pinch-zoom] sm:min-h-[90px] sm:p-2 ${
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
      onTouchStart={e => onTouchStart(day.date, e.touches[0].clientX, e.touches[0].clientY)}
      onClick={() => onClick(day.date)}
    >
      <div
        className={`text-sm font-medium mb-1 sm:mb-2 ${
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
