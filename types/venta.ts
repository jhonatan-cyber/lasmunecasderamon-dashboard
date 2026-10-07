export interface Venta {
  id: string | number;
  codigo: string;
  cliente_id: string | number | null;
  pedido_id?: string | number | null;
  habitacion_id: string | number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | 'mixto';
  propina: number;
  sub_total: number;
  total: number;
  fecha_crea: string;
  fecha_mod?: string;
  estado: number;
  tiempo?: number;
  anfitrionas_nicks?: string | null;
}

export interface VentaDetalle {
  presentacion_id?: string | null;
  id?: string | number;
  venta_id: string | number;
  producto_id: string | number;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
  producto_nombre?: string;
  producto_precio?: number;
  /** 'botella' | 'shot'. Ausente en ventas anteriores a la migración 039. */
  tipo_venta?: 'botella' | 'shot' | null;
  /** Shot cobrado a precio de anfitriona. */
  shot_anfitriona?: boolean | null;
}

export interface VentaUsuario {
  id?: string | number;
  usuario_id: string | number;
  venta_id: string | number;
  nick?: string;
  usuario_nombre?: string;
}

export interface VentaWithDetails extends Venta {
  comisiones_detalle?: DistribucionVenta[];
  propinas_detalle?: DistribucionVenta[];
  detalles: VentaDetalle[];
  usuarios: VentaUsuario[];
  has_anulacion_solicitada?: boolean;
  cliente_nombre?: string;
  habitacion_numero?: string;
  habitacion_nombre?: string;
  usuarios_nombres?: string[];
  cajero_nombre?: string | null;
  cajero_apellido?: string | null;
  cajero_nick?: string | null;
  garzon_nombre?: string | null;
  garzon_nick?: string | null;
}

export interface DistribucionVenta {
  usuario_id?: string | null;
  nick?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  rol?: string | null;
  monto: number;
}

export interface VentaCreate {
  cliente_id?: string | number | null;
  pedido_id?: string | number | null;
  habitacion_id?: string | number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | 'mixto';
  propina: number;
  sub_total: number;
  total: number;
  detalles: VentaDetalleCreate[];
  usuarios?: Array<string | number>;
  tiempo?: number;
}

export interface VentaDetalleCreate {
  producto_id: string | number;
  presentacion_id?: string | null;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
  hostess_id?: string | number | null;
  hostesses?: Array<string | number>;
  isChampagne?: boolean;
  /** 'shot' descuenta ml de la botella abierta; sin valor, botella entera. */
  tipo_venta?: 'botella' | 'shot';
  /** El shot se cobró al precio de anfitriona (solo con tipo_venta 'shot'). */
  shot_anfitriona?: boolean;
}

export interface VentaUpdate {
  estado?: string;
  fecha_mod?: string;
}

export interface VentaResumen {
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_propinas: number;
  total_comisiones: number;
  ventas_hoy: number;
  ventas_mes: number;
  promedio_venta: number;
  caja_abierta_desde?: string | null;
}

export interface VentaFiltros {
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  metodo_pago?: string;
  usuario_id?: string;
  cliente_id?: string;
}
