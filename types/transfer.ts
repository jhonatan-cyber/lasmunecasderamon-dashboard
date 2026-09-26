export interface TransferRecord {
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'historica';
  usuario_id: string | null;
  aceptado_por: string | null;
  aceptado_nombre: string | null;
  fecha_aceptacion: string | null;
  opciones_venta?: import('./sale-options').SaleOption[];
  id: string;
  producto_id: string;
  categoria_nombre?: string | null;
  cantidad: number;
  fecha_crea: string;
  precio_venta: number;
  comision: number;
  producto_nombre: string;
  presentacion_nombre: string;
  usuario_nombre: string;
  /** Ml por shot del producto; null/undefined = valor global de Configuraciones. */
  ml_shot?: number | null;
}
