export const UBICACIONES_LIMPIEZA = ['almacen', 'bar', 'caja', 'local'] as const;
export type UbicacionLimpieza = (typeof UBICACIONES_LIMPIEZA)[number];
export const NOMBRES_UBICACION: Record<UbicacionLimpieza, string> = {
  almacen: 'Almacén',
  bar: 'Bar',
  caja: 'Caja',
  local: 'Local'
};
export type ArticuloLimpieza = {
  id: string;
  nombre: string;
  unidad: string;
  minimo: number;
  stock: Record<UbicacionLimpieza, number>;
  en_transito: number;
};
export type MovimientoLimpieza = {
  id: string;
  articulo_id: string;
  articulo: string;
  unidad: string;
  tipo: 'ingreso' | 'traspaso' | 'consumo';
  cantidad: number;
  origen: UbicacionLimpieza | null;
  destino: UbicacionLimpieza | null;
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  nota: string;
  proveedor: string | null;
  costo_unitario: number | null;
  creado_por: string;
  recibido_por: string | null;
  creador_nombre?: string;
  receptor_nombre?: string | null;
  fecha: string;
  fecha_resolucion: string | null;
};
export type AccesoLimpieza = { gestionar: boolean; ubicaciones: UbicacionLimpieza[] };
export type ResumenLimpieza = {
  articulos: ArticuloLimpieza[];
  movimientos: MovimientoLimpieza[];
  acceso: AccesoLimpieza;
};
