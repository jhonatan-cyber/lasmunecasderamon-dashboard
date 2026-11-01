'use client';

import { useCallback, useState } from 'react';
import { getDateRange, isSameDay } from './roleCalendarGrid';
import type { DataType } from './calendarTypes';

export interface UseCalendarSelectionOptions {
  /** Cuando es false los handlers de arrastre no hacen nada (p. ej. sin permiso de vista). */
  enabled?: boolean;
  /**
   * Se invoca al soltar el arrastre con fechas seleccionadas.
   * Si se omite, se abre el modal propio del hook (comportamiento por defecto).
   */
  onSelectionComplete?: () => void;
}

export function useCalendarSelection(
  defaultCategory: DataType,
  { enabled = true, onSelectionComplete }: UseCalendarSelectionOptions = {}
) {
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

  const handleMouseDown = useCallback(
    (date: Date) => {
      if (!enabled) return;
      setIsDragging(true);
      setDragStartDate(date);
      setSelectedDates([date]);
    },
    [enabled]
  );

  const handleMouseEnter = useCallback(
    (date: Date) => {
      if (enabled && isDragging && dragStartDate) {
        setSelectedDates(getDateRange(dragStartDate, date));
      }
    },
    [enabled, isDragging, dragStartDate]
  );

  const handleMouseUp = useCallback(() => {
    if (!enabled) return;

    const wasDragging = isDragging;
    setIsDragging(false);
    setDragStartDate(null);

    if (wasDragging && selectedDates.length > 0) {
      if (onSelectionComplete) {
        onSelectionComplete();
      } else {
        setIsModalOpen(true);
        setSelectedDataType(defaultCategory);
      }
    }
  }, [enabled, isDragging, selectedDates.length, defaultCategory, onSelectionComplete]);

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
