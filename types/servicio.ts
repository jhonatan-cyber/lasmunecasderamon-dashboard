// Tipos para servicios
export interface Servicio {
  id_servicio?: string | number;
  codigo: string;
  cliente_id: string | number;
  habitacion_id: string | number;
  precio_habitacion: number;
  precio_servicio: number;
  iva: number;
  sub_total: number;
  total: number;
  tiempo: number;
  metodo_pago?: string;
  fecha_crea: string;
  estado: number;
}

export interface ServicioWithDetails extends Servicio {
  cliente_nombre?: string;
  habitacion_numero?: string;
  habitacion_comision?: number;
  anfitrionas_nombres?: string;
  total_usuarios?: number;
  created_by?: string;
  creator_name?: string;
}

// Tipos para estadísticas
export interface ServiceStatsData {
  totalServicios: number;
  serviciosActivos: number;
  ingresosTotales: number;
  promedioTiempo: number;
}

export interface RoomStatsData {
  habitacionesDisponibles: number;
  habitacionesOcupadas: number;
}

// Tipos para filtros
export interface ServiceFiltersState {
  searchTerm: string;
  showAllServices: boolean;
  currentPage: number;
  itemsPerPage: number;
}

// Tipos para paginación
export interface PaginationData {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
}

// Tipos para formularios
export interface ServiceFormData {
  cliente_id: string;
  habitacion_id: string | null;
  precio_servicio: number;
  iva: number;
  tiempo: number;
  metodo_pago: string;
  usuarios: string[];
}

// Tipos para validación
export interface ServiceValidationResult {
  isValid: boolean;
  errors: string[];
}

// Tipos para acciones
export interface ServiceActions {
  handleCreateServicio: () => void;
  handleShowActiveServices: () => Promise<void>;
  handleShowAllServices: () => Promise<void>;
  handleStopTimer: (servicioId: string | number) => Promise<void>;
} 
