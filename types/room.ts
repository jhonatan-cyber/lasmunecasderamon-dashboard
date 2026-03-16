export interface Room {
  id: string;
  name: string;
  display_order?: number;
  price: number;
  time: number;
  comision_anfitriona?: number;
  status: number;
  fecha_crea?: string;
  fecha_mod?: string;
  fecha_elim?: string;
} 