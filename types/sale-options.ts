export type SaleType = 'botella' | 'shot';
export interface SaleOption {
  tipo: SaleType;
  vender_con_anfitriona?: boolean;
  colacion_habilitada?: boolean;
  cover_habilitado?: boolean;
  en_venta?: boolean;
  ml_colacion?: number;
  acompanamiento_colacion?: { unidades: number; ml?: number };
  precio: number;
  precio_sin_anfitriona?: number;
  comision: number;
  precio_anfitriona?: number;
  ml_acompanamiento_cliente?: number;
  ml_acompanamiento_anfitriona?: number;
  acompanamiento_cliente?: boolean;
  acompanamiento?: { tipo?: 'gaseosa' | 'soda'; unidades: number };
  precios_anfitriona?: { precio: number; comision: number }[];
}
