'use client';

import { useCallback, useState } from 'react';
import { getDateRange, isSameDay } from './roleCalendarGrid';
import type { DataType } from './calendarTypes';

export function useCalendarSelection(defaultCategory: DataType) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<DataType>(defaultCategory);

  const isSelected = useCallback(
    (date: Date) => selectedDates.some(selectedDate => isSameDay(selectedDate, date)),
    [selectedDates]
  );

  const handleDateClick = useCallback(
    (date: Date) => {
      setSelectedDates([date]);
      setIsModalOpen(true);
      setSelectedDataType(defaultCategory);
    },
    [defaultCategory]
  );

  const handleMouseDown = useCallback((date: Date) => {
    setIsDragging(true);
    setDragStartDate(date);
    setSelectedDates([date]);
  }, []);

  const handleMouseEnter = useCallback(
    (date: Date) => {
      if (isDragging && dragStartDate) {
        setSelectedDates(getDateRange(dragStartDate, date));
      }
    },
    [isDragging, dragStartDate]
  );

  const handleMouseUp = useCallback(() => {
    const wasDragging = isDragging;
    setIsDragging(false);
    setDragStartDate(null);

    if (wasDragging && selectedDates.length > 0) {
      setIsModalOpen(true);
      setSelectedDataType(defaultCategory);
    }
  }, [isDragging, selectedDates.length, defaultCategory]);

  const clearSelection = useCallback(() => {
    setSelectedDates([]);
    setIsModalOpen(false);
  }, []);

  return {
    selectedDates,
    isDragging,
    isModalOpen,
    selectedDataType,
    isSelected,
    handleDateClick,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearSelection,
    setSelectedDataType,
    setIsModalOpen
  };
}
