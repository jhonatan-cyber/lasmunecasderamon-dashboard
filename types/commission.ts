// Tipos para el sistema de comisiones

export type CommissionStatus = "por_pagar" | "pagado" | "anulado";

export type CommissionType = "producto" | "servicio" | "paquete" | "evento";

export interface Commission {
  id: string;
  employeeId: string;
  employeeName: string; // anfitriona
  nick: string; // nick
  venta: number; // venta
  servicio: number; // servicio
  total: number; // total (suma de venta + servicio)
  status: CommissionStatus;
  
  // Campos adicionales para compatibilidad con el frontend existente
  saleAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  saleType?: CommissionType;
  period?: string;
  date?: Date;
  description?: string;
  clientName?: string;
}

export interface CommissionFilters {
  searchTerm: string;
  statusFilter: string;
  employeeFilter: string;
}

export interface CommissionStats {
  totalCommissions: number;
  totalSales: number;
  pendingCommissions: number;
  paidCommissions: number;
  avgCommissionRate: number;
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface CommissionApiResponse extends ApiResponse<Commission[]> {}

export interface SingleCommissionApiResponse extends ApiResponse<Commission> {}