export interface Overtime {
  id_hora_extra: string;
  id_usuario: string;
  usuario: string;
  usuario_id: string; 
  usuario_foto: string;
  hora: number;
  monto: number;
  total: number;
  fecha_crea: string;
  fecha_mod: string | null;
  estado: number; 
  motivo?: string;
  solicitado_por?: string;
}

export interface CreateOvertimeRequest {
  usuario_id: string;
  hora: number;
  monto: number;
  motivo?: string;
  device_date?: string;
}