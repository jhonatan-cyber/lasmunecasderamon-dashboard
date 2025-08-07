// types/asistencia.ts
export interface AsistenciaResumen {
  id_usuario: number;
  nick: string;
  nombre_completo: string;
  total_asistencias: number;
  sueldo_total: number;
  aporte_total: number;
  descuento_total: number;
  total_final: number;
}

export interface AsistenciaResponse {
  success: boolean;
  data?: AsistenciaResumen[]; // Hacemos data opcional con el operador ?
  error?: string;
  details?: any;
}