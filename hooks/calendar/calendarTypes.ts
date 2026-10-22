export type RoleType = 'garzon' | 'cajero' | 'anfitriona' | 'barman';

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

  calendarError: string;
  selectedDataError: string;
  retryCalendar: () => Promise<void>;
  retrySelectedData: () => Promise<void>;

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
