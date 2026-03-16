export interface Gratificacion {
  id: string;
  fecha_hora: string;
  usuario_id: number;
  usuario: string;
  monto: number;
  descripcion: string;
  fecha_crea: string;
  fecha_mod: string | null;
  estado: number;
}

export interface CreateGratificacionRequest {
  usuario_id: number;
  monto: number;
  descripcion: string;
}

export interface GratificacionDetail {
  fecha_crea: string;
  fecha_mod: string | null;
  usuario: string;
  monto: number;
  descripcion: string;
  estado: number;
}
