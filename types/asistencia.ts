export interface AsistenciaResumen {
  id_usuario: string;
  nick: string;
  nombre_completo: string;
  usuario_foto: string;
  total_asistencias: number;
  sueldo_total: number;
  aporte_total: number;
  descuento_total: number;
  total_final: number;
}

export interface AsistenciaStats {
  total: number;
  presentes: number;
  ausentes: number;
  porcentajeAsistencia: number;
  fechaApertura?: string | null;
  fechaCierre?: string | null;
}

export interface AsistenciaResponse {
  success: boolean;
  data?: AsistenciaResumen[];
  error?: string;
  details?: unknown;
}
