export interface Gratificacion {
  id: string | number;
  fecha_hora: string;
  usuario_id: string | number;
  id_usuario?: string | number;
  usuario: string;
  monto: number;
  descripcion: string;
  fecha_crea: string;
  fecha_mod: string | null;
  estado: number;
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
