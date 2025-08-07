// types/codigo.ts
export interface Codigo {
  id_codigo: number;
  codigo: string;
  activo?: boolean;
  fecha_crea?: string;
  fecha_expiracion?: string | null;
  usado?: boolean;
}