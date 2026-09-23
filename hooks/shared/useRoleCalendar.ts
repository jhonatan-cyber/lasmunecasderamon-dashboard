'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMonthDateRange,
  matchesAnyDateKey,
  toDateKey,
  toDateKeys
} from '@/lib/utils/calendarUtils';

export type RoleType = 'garzon' | 'cajero' | 'anfitriona';

export type DataType =
  'asistencias' | 'anticipos' | 'propinas' | 'horasExtras' | 'comisiones' | 'servicios';

export interface CalendarData {
  asistencias: any[];
  anticipos: any[];
  propinas: any[];
  horasExtras: any[];
  comisiones: any[];
  servicios: any[];
}

export interface UseRoleCalendarProps {
  role: RoleType;
  userId?: number | string;
}

export interface UseRoleCalendarReturn {
  // State
  currentDate: Date;
  selectedDates: Date[];
  isDragging: boolean;
  isModalOpen: boolean;
  isLoading: boolean;
  calendarData: CalendarData;
  selectedDataType: DataType;
  selectedDateData: any[];
  isLoadingSelectedData: boolean;
  modalCounts: { [key: string]: number };
  modalTotal: number;
  roleCategories: DataType[];

  // Actions
  navigate: (direction: number) => void;
  goToToday: () => void;
  isToday: (date: Date) => boolean;
  isSelected: (date: Date) => boolean;
  getDataForDate: (date: Date) => Record<DataType, boolean>;
  hasDataForDate: (date: Date) => boolean;
  getDaysInMonth: (date: Date) => { date: Date; isCurrentMonth: boolean }[];
  handleDateClick: (date: Date) => void;
  handleMouseDown: (date: Date) => void;
  handleMouseEnter: (date: Date) => void;
  handleMouseUp: () => void;
  clearSelection: () => void;
  setSelectedDataType: (type: DataType) => void;
  setIsModalOpen: (open: boolean) => void;
}

export function useRoleCalendar({ role, userId }: UseRoleCalendarProps): UseRoleCalendarReturn {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarData>({
    asistencias: [],
    anticipos: [],
    propinas: [],
    horasExtras: [],
    comisiones: [],
    servicios: []
  });

  const isAnfitriona = role === 'anfitriona';
  const roleCategories: DataType[] = useMemo(
    () =>
      isAnfitriona
        ? ['asistencias', 'anticipos', 'comisiones', 'servicios']
        : ['asistencias', 'anticipos', 'propinas', 'horasExtras'],
    [isAnfitriona]
  );

  const [selectedDataType, setSelectedDataType] = useState<DataType>(roleCategories[0]);
  const [selectedDateData, setSelectedDateData] = useState<any[]>([]);
  const [isLoadingSelectedData, setIsLoadingSelectedData] = useState(false);
  const [modalCounts, setModalCounts] = useState<{ [key: string]: number }>({
    asistencias: 0,
    anticipos: 0,
    propinas: 0,
    horasExtras: 0,
    comisiones: 0,
    servicios: 0
  });
  const [modalTotal, setModalTotal] = useState<number>(0);

  // Sync default selected category if role changes
  useEffect(() => {
    setSelectedDataType(roleCategories[0]);
  }, [role, roleCategories]);

  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const firstDayOfWeek = firstDay.getDay();
    const days = [];

    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false
      });
    }

    return days;
  }, []);

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

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  const isSelected = useCallback(
    (date: Date) => {
      return selectedDates.some(
        selectedDate => selectedDate.toDateString() === date.toDateString()
      );
    },
    [selectedDates]
  );

  const getDataForDate = useCallback(
    (date: Date): Record<DataType, boolean> => {
      const dateKey = toDateKey(date);

      const asistenciasMatch = calendarData.asistencias.some((item: any) =>
        matchesAnyDateKey(item.fecha, [dateKey])
      );
      const anticiposMatch = calendarData.anticipos.some((item: any) =>
        matchesAnyDateKey(item.fecha_crea, [dateKey])
      );

      let thirdMatch = false;
      let fourthMatch = false;

      if (isAnfitriona) {
        thirdMatch = calendarData.comisiones.some((item: any) =>
          matchesAnyDateKey(item.fecha_crea, [dateKey])
        );
        fourthMatch = calendarData.servicios.some((item: any) =>
          matchesAnyDateKey(item.fecha_crea, [dateKey])
        );
      } else {
        thirdMatch = calendarData.propinas.some((item: any) =>
          matchesAnyDateKey(item.fecha_crea, [dateKey])
        );
        fourthMatch = calendarData.horasExtras.some((item: any) =>
          matchesAnyDateKey(item.fecha_crea, [dateKey])
        );
      }

      return {
        asistencias: asistenciasMatch,
        anticipos: anticiposMatch,
        propinas: !isAnfitriona && thirdMatch,
        horasExtras: !isAnfitriona && fourthMatch,
        comisiones: isAnfitriona && thirdMatch,
        servicios: isAnfitriona && fourthMatch
      };
    },
    [calendarData, isAnfitriona]
  );

  const hasDataForDate = useCallback(
    (date: Date) => {
      const data = getDataForDate(date);
      return (
        data.asistencias ||
        data.anticipos ||
        data.propinas ||
        data.horasExtras ||
        data.comisiones ||
        data.servicios
      );
    },
    [getDataForDate]
  );

  const handleDateClick = useCallback(
    (date: Date) => {
      setSelectedDates([date]);
      setIsModalOpen(true);
      setSelectedDataType(roleCategories[0]);
    },
    [roleCategories, setSelectedDataType]
  );

  const handleMouseDown = useCallback((date: Date) => {
    setIsDragging(true);
    setDragStartDate(date);
    setSelectedDates([date]);
  }, []);

  const handleMouseEnter = useCallback(
    (date: Date) => {
      if (isDragging && dragStartDate) {
        const dateRange = getDateRange(dragStartDate, date);
        setSelectedDates(dateRange);
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
      setSelectedDataType(roleCategories[0]);
    }
  }, [isDragging, selectedDates.length, roleCategories, setSelectedDataType]);

  const clearSelection = useCallback(() => {
    setSelectedDates([]);
    setIsModalOpen(false);
  }, []);

  const fetchCalendarData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { startDate, endDate } = getMonthDateRange(currentDate);

      const [asistenciasRes, anticiposRes, thirdRes, fourthRes] = await Promise.all([
        fetch(`/api/attendance/by-dates?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/anticipos/by-dates?startDate=${startDate}&endDate=${endDate}`),
        fetch(
          isAnfitriona
            ? `/api/commissions/user?startDate=${startDate}&endDate=${endDate}`
            : `/api/tips/user?startDate=${startDate}&endDate=${endDate}`
        ),
        fetch(
          isAnfitriona
            ? `/api/servicios/by-dates?startDate=${startDate}&endDate=${endDate}`
            : `/api/overtime/by-dates?startDate=${startDate}&endDate=${endDate}`
        )
      ]);

      const [asistenciasData, anticiposData, thirdData, fourthData] = await Promise.all([
        asistenciasRes.json(),
        anticiposRes.json(),
        thirdRes.json(),
        fourthRes.json()
      ]);

      const calendarDataToSet = {
        asistencias: asistenciasData.success ? asistenciasData.data || [] : [],
        anticipos: anticiposData.success ? anticiposData.data || [] : [],
        propinas: !isAnfitriona && thirdData.success ? thirdData.data || [] : [],
        horasExtras: !isAnfitriona && fourthData.success ? fourthData.data || [] : [],
        comisiones: isAnfitriona && thirdData.success ? thirdData.data || [] : [],
        servicios: isAnfitriona && fourthData.success ? fourthData.data || [] : []
      };

      setCalendarData(calendarDataToSet);
    } catch (error) {
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
      setModalCounts({
        asistencias: 0,
        anticipos: 0,
        propinas: 0,
        horasExtras: 0,
        comisiones: 0,
        servicios: 0
      });
      return;
    }

    setIsLoadingSelectedData(true);
    try {
      const dateKeys = toDateKeys(selectedDates);
      const datesParam = dateKeys.join(',');

      const fetchCountsPromises = [
        fetch(`/api/attendance/by-dates?dates=${datesParam}`)
          .then(res => res.json())
          .catch(() => ({ success: false })),
        fetch(`/api/anticipos/by-dates?dates=${datesParam}`)
          .then(res => res.json())
          .catch(() => ({ success: false })),
        isAnfitriona
          ? Promise.resolve({
              success: true,
              data: calendarData.comisiones.filter(item =>
                matchesAnyDateKey(item.fecha_crea, dateKeys)
              )
            })
          : Promise.resolve({
              success: true,
              data: calendarData.propinas.filter(item =>
                matchesAnyDateKey(item.fecha_crea, dateKeys)
              )
            }),
        fetch(
          isAnfitriona
            ? `/api/servicios/by-dates?dates=${datesParam}`
            : `/api/overtime/by-dates?dates=${datesParam}`
        )
          .then(res => res.json())
          .catch(() => ({ success: false }))
      ];

      const [asistenciasRes, anticiposRes, thirdRes, fourthRes] =
        await Promise.all(fetchCountsPromises);

      const newCounts = {
        asistencias: asistenciasRes.success ? asistenciasRes.data?.length || 0 : 0,
        anticipos: anticiposRes.success ? anticiposRes.data?.length || 0 : 0,
        propinas: !isAnfitriona && thirdRes.success ? thirdRes.data?.length || 0 : 0,
        horasExtras: !isAnfitriona && fourthRes.success ? fourthRes.data?.length || 0 : 0,
        comisiones: isAnfitriona && thirdRes.success ? thirdRes.data?.length || 0 : 0,
        servicios: isAnfitriona && fourthRes.success ? fourthRes.data?.length || 0 : 0
      };

      setModalCounts(newCounts);

      let total = 0;

      if (asistenciasRes.success && asistenciasRes.data) {
        const asistenciasEstado1 = asistenciasRes.data.filter((item: any) => item.estado === 1);
        total += asistenciasEstado1.reduce(
          (sum: number, item: any) => sum + (item.sueldo_final || 0),
          0
        );
      }

      if (isAnfitriona) {
        if (thirdRes.success && thirdRes.data) {
          const comisionesEstado1 = thirdRes.data.filter((item: any) => item.estado === 1);
          total += comisionesEstado1.reduce(
            (sum: number, item: any) => sum + (item.comision || 0),
            0
          );
        }
        if (fourthRes.success && fourthRes.data) {
          const serviciosValidos = fourthRes.data.filter(
            (item: any) => item.estado === 0 || item.estado === 4
          );
          total += serviciosValidos.reduce(
            (sum: number, item: any) => sum + (item.precio_servicio || 0),
            0
          );
        }
      } else {
        if (thirdRes.success && thirdRes.data) {
          const propinasEstado1 = thirdRes.data.filter((item: any) => item.estado === 1);
          total += propinasEstado1.reduce((sum: number, item: any) => sum + (item.monto || 0), 0);
        }
        if (fourthRes.success && fourthRes.data) {
          const horasExtrasEstado1 = fourthRes.data.filter((item: any) => item.estado === 1);
          total += horasExtrasEstado1.reduce(
            (sum: number, item: any) => sum + (item.total || 0),
            0
          );
        }
      }

      if (anticiposRes.success && anticiposRes.data) {
        const anticiposEstado1 = anticiposRes.data.filter((item: any) => item.estado === 1);
        total -= anticiposEstado1.reduce((sum: number, item: any) => sum + (item.monto || 0), 0);
      }

      setModalTotal(total);

      switch (selectedDataType) {
        case 'asistencias':
          setSelectedDateData(asistenciasRes.success ? asistenciasRes.data || [] : []);
          break;
        case 'anticipos':
          setSelectedDateData(anticiposRes.success ? anticiposRes.data || [] : []);
          break;
        case 'propinas':
        case 'comisiones':
          setSelectedDateData(thirdRes.success ? thirdRes.data || [] : []);
          break;
        case 'horasExtras':
        case 'servicios':
          setSelectedDateData(fourthRes.success ? fourthRes.data || [] : []);
          break;
        default:
          setSelectedDateData([]);
      }
    } catch (error) {
      console.error('Error fetching selected date data:', error);
      setSelectedDateData([]);
    } finally {
      setIsLoadingSelectedData(false);
    }
  }, [selectedDates, selectedDataType, isAnfitriona, calendarData]);

  useEffect(() => {
    if (isModalOpen && selectedDates.length > 0) {
      fetchSelectedDateData();
    }
  }, [selectedDates, selectedDataType, isModalOpen, fetchSelectedDateData, setSelectedDataType]);

  return {
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
    isToday,
    isSelected,
    getDataForDate,
    hasDataForDate,
    getDaysInMonth,
    handleDateClick,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearSelection,
    setSelectedDataType,
    setIsModalOpen
  };
}

function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
  const end = new Date(Math.max(startDate.getTime(), endDate.getTime()));

  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
