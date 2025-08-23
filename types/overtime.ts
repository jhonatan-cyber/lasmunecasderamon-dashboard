export interface Overtime {
  id_hora_extra: number;
  id_usuario: number;
  usuario: string;
  hora: number;
  monto: number;
  total: number;
  fecha_crea: string;
  fecha_mod: string;
  estado: string;
}

export interface CreateOvertimeRequest {
  usuario_id: number;
  hora: number;
  monto: number;
}