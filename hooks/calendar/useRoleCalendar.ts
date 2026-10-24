'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMonthDays, isToday as isTodayDate } from './roleCalendarGrid';
import {
  categoriesFor,
  emptyCalendarData,
  emptyCounts,
  getDataForDate as getFlagsForDate,
  hasAnyData
} from './roleCalendarData';
import { fetchMonthCalendar, fetchSelectionData } from './roleCalendarQueries';
import { useCalendarSelection } from './useCalendarSelection';
import type {
  CalendarData,
  DataType,
  UseRoleCalendarProps,
  UseRoleCalendarReturn
} from './calendarTypes';

export type {
  CalendarData,
  DataType,
  RoleType,
  UseRoleCalendarProps,
  UseRoleCalendarReturn
} from './calendarTypes';

export function useRoleCalendar({ role, userId }: UseRoleCalendarProps): UseRoleCalendarReturn {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [selectedDataError, setSelectedDataError] = useState('');
  const [calendarData, setCalendarData] = useState<CalendarData>(emptyCalendarData);
  const [hostessEvents, setHostessEvents] = useState<any[]>([]);

  const isAnfitriona = role === 'anfitriona';
  const roleCategories = useMemo(() => categoriesFor(isAnfitriona), [isAnfitriona]);

  const {
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
  } = useCalendarSelection(roleCategories[0]);

  const [selectedDateData, setSelectedDateData] = useState<any[]>([]);
  const [isLoadingSelectedData, setIsLoadingSelectedData] = useState(false);
  const [modalCounts, setModalCounts] = useState(emptyCounts);
  const [modalTotal, setModalTotal] = useState<number>(0);

  useEffect(() => {
    setSelectedDataType(roleCategories[0]);
  }, [role, roleCategories, setSelectedDataType]);

  const navigate = useCallback(
    (direction: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(currentDate.getMonth() + direction);
      setCurrentDate(newDate);
    },
    [currentDate]
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const getDataForDate = useCallback(
    (date: Date): Record<DataType, boolean> => getFlagsForDate(calendarData, isAnfitriona, date),
    [calendarData, isAnfitriona]
  );

  const hasDataForDate = useCallback(
    (date: Date) => hasAnyData(getFlagsForDate(calendarData, isAnfitriona, date)),
    [calendarData, isAnfitriona]
  );

  const fetchCalendarData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setCalendarError('');
    try {
      const { calendarData: nextData, hostessEvents: nextEvents } = await fetchMonthCalendar({
        isAnfitriona,
        month: currentDate
      });
      setCalendarData(nextData);
      if (nextEvents) setHostessEvents(nextEvents);
    } catch (error) {
      setCalendarError('No se pudo cargar el calendario.');
      console.error('Error fetching calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, userId, isAnfitriona]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const fetchSelectedDateData = useCallback(async () => {
    if (selectedDates.length === 0) {
      setSelectedDateData([]);
      setModalCounts(emptyCounts());
      return;
    }

    setIsLoadingSelectedData(true);
    setSelectedDataError('');
    try {
      const snapshot = await fetchSelectionData({
        isAnfitriona,
        selectedDates,
        selectedDataType,
        calendarData,
        hostessEvents
      });
      setModalCounts(snapshot.counts);
      setModalTotal(snapshot.total);
      setSelectedDateData(snapshot.rows);
    } catch (error) {
      setSelectedDataError('No se pudieron cargar los datos de las fechas seleccionadas.');
      console.error('Error fetching selected date data:', error);
      setSelectedDateData([]);
    } finally {
      setIsLoadingSelectedData(false);
    }
  }, [selectedDates, selectedDataType, isAnfitriona, calendarData, hostessEvents]);

  useEffect(() => {
    if (isModalOpen && selectedDates.length > 0) {
      fetchSelectedDateData();
    }
  }, [selectedDates, selectedDataType, isModalOpen, fetchSelectedDateData, setSelectedDataType]);

  return {
    calendarError,
    selectedDataError,
    retryCalendar: fetchCalendarData,
    retrySelectedData: fetchSelectedDateData,
    currentDate,
    selectedDates,
    isDragging,
    isModalOpen,
    isLoading,
    calendarData,
    selectedDataType,
    selectedDateData,
    isLoadingSelectedData,
    modalCounts,
    modalTotal,
    roleCategories,
    navigate,
    goToToday,
    isToday: isTodayDate,
    isSelected,
    getDataForDate,
    hasDataForDate,
    getDaysInMonth: getMonthDays,
    handleDateClick,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearSelection,
    setSelectedDataType,
    setIsModalOpen
  };
}
