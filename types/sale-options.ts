export type SaleType = 'botella' | 'shot';
export interface SaleOption {
  tipo: SaleType;
  precio: number;
  comision: number;
  /**
   * Precio del corto para anfitriona, independiente del precio de cliente.
   * Ausente o 0, sin precios_anfitriona, deshabilita esta audiencia.
   */
  precio_anfitriona?: number;
  ml_acompanamiento_cliente?: number;
  ml_acompanamiento_anfitriona?: number;
  acompanamiento?: { tipo?: 'gaseosa' | 'soda'; unidades: number };
  precios_anfitriona?: { precio: number; comision: number }[];
}
