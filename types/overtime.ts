export interface Overtime {
  id_usuario: number;
  usuario: string;
  total_horas: number;
  total_monto: number;
  estado: string;
}

export interface CreateOvertimeRequest {
  usuario_id: number;
  hora: number;
  monto: number;
}