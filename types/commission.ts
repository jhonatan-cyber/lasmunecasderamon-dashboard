export type CommissionStatus = 'por_pagar' | 'pagado' | 'anulado';

export type CommissionType = 'producto' | 'servicio' | 'paquete' | 'evento';

export interface Commission {
  id: string;
  employeeId: string;
  employeeName: string;
  nick: string;
  venta: number;
  servicio: number;
  total: number;
  status: CommissionStatus;

  saleAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  saleType?: CommissionType;
  period?: string;
  date?: Date;
  description?: string;
  clientName?: string;

  empleado_foto?: string;
  image_version?: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export type CommissionApiResponse = ApiResponse<Commission[]>;

export type SingleCommissionApiResponse = ApiResponse<Commission>;
