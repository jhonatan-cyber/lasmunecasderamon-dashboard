export interface Room {
  id: string | number;
  id_habitacion?: string | number;
  name: string;
  nombre?: string;
  numero?: string;
  display_order?: number;
  price: number;
  precio?: number;
  time: number;
  tiempo?: number;
  comision_anfitriona?: number;
  status: number;
  estado?: number;
  fecha_crea?: string;
  fecha_mod?: string;
  fecha_elim?: string;
  created_at?: string | number | Date;
} 
