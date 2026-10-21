export type SaleType = 'botella' | 'shot';
export interface SaleOption {
  tipo: SaleType;
  /** Esta bebida se puede entregar como colación pagada. */
  colacion_habilitada?: boolean;
  /** Esta bebida analcohólica puede entregarse como cover de una entrada de cliente. */
  cover_habilitado?: boolean;
  /** Ml que recibe el trabajador cuando la bebida se entrega como colación. */
  ml_colacion?: number;
  /**
   * Acompañamiento de la colación: unidades incluidas y ml de cada una. Se
   * configura al transferir (hereda del corto de anfitriona cuando existe).
   * `unidades: 0` = sin acompañamiento.
   */
  acompanamiento_colacion?: { unidades: number; ml?: number };
  precio: number;
  precio_sin_anfitriona?: number;
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
