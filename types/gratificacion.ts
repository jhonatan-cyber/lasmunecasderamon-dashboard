export interface Gratificacion {
  id: string | number;
  fecha_hora: string;
  usuario_id: string | number;
  id_usuario?: string | number;
  usuario: string;
  usuario_foto?: string | null;
  /** Quién creó la fila (migración 037); null en las filas antiguas. */
  solicitante_id?: string | null;
  /** Nombre resuelto de quien la solicitó (LEFT JOIN en el GET); null si es legacy o autofirmada. */
  solicitante?: string | null;
  monto: number;
  descripcion: string;
  fecha_crea: string;
  fecha_mod: string | null;
  estado: number;
  estado_texto?: 'pagado' | 'por_pagar' | 'pendiente_aprobacion' | 'rechazada' | 'desconocido';
}

export interface CreateGratificacionRequest {
  usuario_id: string | number;
  monto: number;
  descripcion: string;
  fecha_hora?: string;
}

export interface GratificacionDetail {
  fecha_crea: string;
  fecha_mod: string | null;
  usuario: string;
  monto: number;
  descripcion: string;
  estado: number;
}
