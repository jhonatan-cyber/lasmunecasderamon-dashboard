export type SaleType = 'botella' | 'shot';
export interface SaleOption {
  tipo: SaleType;
  precio: number;
  comision: number;
}
