'use client';

import { useCallback, useRef, useState } from 'react';
import { getDateRange, isSameDay } from './roleCalendarGrid';
import type { DataType } from './calendarTypes';

/** Ventana en la que se ignoran los eventos de mouse sintetizados tras un toque. */
const SYNTHETIC_MOUSE_WINDOW_MS = 700;
/** Movimiento mínimo para considerar que el dedo arrastra en vez de tocar. */
const TOUCH_DRAG_SLOP_PX = 8;
/** Movimiento vertical que se interpreta como scroll de la página. */
const TOUCH_SCROLL_SLOP_PX = 10;

const getDateFromPoint = (clientX: number, clientY: number): Date | null => {
  if (typeof document === 'undefined') return null;
  const cell = document
    .elementFromPoint(clientX, clientY)
    ?.closest<HTMLElement>('[data-calendar-date]');
  if (!cell?.dataset.calendarDate) return null;
  const timestamp = Number(cell.dataset.calendarDate);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
};

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

  const lastTouchAtRef = useRef(0);
  const touchStartDateRef = useRef<Date | null>(null);
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const touchAbortedRef = useRef(false);
  const selectionBeforeTouchRef = useRef<Date[]>([]);

  const isSyntheticMouseEvent = useCallback(
    () => Date.now() - lastTouchAtRef.current < SYNTHETIC_MOUSE_WINDOW_MS,
    []
  );

  const isSelected = useCallback(
    (date: Date) => selectedDates.some(selectedDate => isSameDay(selectedDate, date)),
    [selectedDates]
  );

  const handleDateClick = useCallback(
    (date: Date) => {
      if (isSyntheticMouseEvent()) return;
      setSelectedDates([date]);
      setIsModalOpen(true);
      setSelectedDataType(defaultCategory);
    },
    [defaultCategory, isSyntheticMouseEvent]
  );

  const completeSelection = useCallback(() => {
    if (!enabled) return;

    setIsDragging(false);
    setDragStartDate(null);

    if (onSelectionComplete) {
      onSelectionComplete();
    } else {
      setIsModalOpen(true);
      setSelectedDataType(defaultCategory);
    }
  }, [enabled, defaultCategory, onSelectionComplete]);

  const handleMouseDown = useCallback(
    (date: Date) => {
      if (!enabled || isSyntheticMouseEvent()) return;
      setIsDragging(true);
      setDragStartDate(date);
      setSelectedDates([date]);
    },
    [enabled, isSyntheticMouseEvent]
  );

  const handleMouseEnter = useCallback(
    (date: Date) => {
      if (isSyntheticMouseEvent()) return;
      if (enabled && isDragging && dragStartDate) {
        setSelectedDates(getDateRange(dragStartDate, date));
      }
    },
    [enabled, isDragging, dragStartDate, isSyntheticMouseEvent]
  );

  const handleMouseUp = useCallback(() => {
    if (!enabled || isSyntheticMouseEvent()) return;

    const wasDragging = isDragging;
    setIsDragging(false);
    setDragStartDate(null);

    if (wasDragging && selectedDates.length > 0) {
      completeSelection();
    }
    // completeSelection ya limpia el estado de arrastre.
  }, [enabled, isDragging, selectedDates.length, isSyntheticMouseEvent, completeSelection]);

  const abortTouchSelection = useCallback(() => {
    lastTouchAtRef.current = Date.now();
    touchStartDateRef.current = null;
    touchStartPointRef.current = null;
    touchAbortedRef.current = true;
    setIsDragging(false);
    setDragStartDate(null);
    setSelectedDates(selectionBeforeTouchRef.current);
  }, []);

  const handleTouchStart = useCallback(
    (date: Date, clientX: number, clientY: number) => {
      if (!enabled) return;
      lastTouchAtRef.current = Date.now();
      touchStartDateRef.current = date;
      touchStartPointRef.current = { x: clientX, y: clientY };
      touchAbortedRef.current = false;
      selectionBeforeTouchRef.current = selectedDates;
      setIsDragging(true);
      setDragStartDate(date);
      setSelectedDates([date]);
    },
    [enabled, selectedDates]
  );

  const handleTouchMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled || touchAbortedRef.current) return;

      const start = touchStartPointRef.current;
      const startDate = touchStartDateRef.current;
      if (!start || !startDate) return;

      lastTouchAtRef.current = Date.now();
      const deltaX = clientX - start.x;
      const deltaY = clientY - start.y;

      // El gesto se volvió scroll vertical de la página: no seleccionar.
      if (Math.abs(deltaY) > TOUCH_SCROLL_SLOP_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
        abortTouchSelection();
        return;
      }

      if (Math.hypot(deltaX, deltaY) < TOUCH_DRAG_SLOP_PX) return;

      const date = getDateFromPoint(clientX, clientY);
      if (date) setSelectedDates(getDateRange(startDate, date));
    },
    [enabled, abortTouchSelection]
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchAtRef.current = Date.now();

    const wasActive = touchStartDateRef.current !== null;
    touchStartDateRef.current = null;
    touchStartPointRef.current = null;

    if (touchAbortedRef.current) {
      touchAbortedRef.current = false;
      return;
    }

    if (!wasActive) {
      setIsDragging(false);
      return;
    }

    completeSelection();
  }, [completeSelection]);

  const handleTouchCancel = useCallback(() => {
    if (touchStartDateRef.current === null) return;
    abortTouchSelection();
  }, [abortTouchSelection]);

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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    clearSelection,
    setSelectedDataType,
    setIsModalOpen
  };
}
