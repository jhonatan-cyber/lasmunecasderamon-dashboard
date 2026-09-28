// Mapea filas de GET /api/products/for-sale al shape que usa el carro de ventas.
// Clave: el id del ítem es la presentación (única por formato); producto_id se
// conserva para la FK de detalle_ventas y presentacion_id para trazabilidad.
// Venta simple (ver Ajustes → Comisiones): sin comisión.
import { isSimpleProduct } from '@/components/orders/productModalRules';
import type { SaleOption } from '@/types/sale-options';
export interface ForSaleItem {
  presentacion_id: string;
  presentacion_nombre: string;
  codigo_barras?: string | null;
  foto?: string | null;
  precio_venta: number;
  comision?: number | null;
  stock_bar?: number | null;
  /** Precios de botella/shot guardados en el bar (shot habilitado para vender por shot). */
  opciones_venta?: SaleOption[] | null;
  /** Capacidad de la botella en ml (null = default de Configuraciones). */
  ml_botella?: number | null;
  /** Ml servidos por shot de ese producto (null = default de Configuraciones). */
  ml_shot?: number | null;
  /** Ml servidos por shot a anfitriona (null = igual que a cliente). */
  ml_shot_anfitriona?: number | null;
  /** Máximo de anfitrionas por producto (null = regla por defecto). */
  max_anfitrionas?: number | null;
  /** ml que quedan en la botella abierta de esa presentación en el bar. */
  ml_abierta?: number | null;
  producto_id: string;
  producto_codigo?: string | null;
  producto_nombre: string;
  categoria_id?: string | null;
  categoria_nombre?: string | null;
}

export interface CartSaleItem {
  id: string;
  producto_id: string;
  presentacion_id: string;
  codigo: string;
  code: string;
  nombre: string;
  name: string;
  precio: number;
  price: number;
  comision: number;
  commission: number;
  categoria: string;
  category: string;
  category_name: string;
  foto: string;
  stock_bar: number;
  cantidad: number;
  opciones_venta?: SaleOption[];
  ml_botella?: number | null;
  ml_shot?: number | null;
  ml_shot_anfitriona?: number | null;
  /** Máximo de anfitrionas por producto (null = regla por defecto). */
  max_anfitrionas?: number | null;
  ml_abierta?: number;
  /** 'shot' descuenta ml de la botella abierta; 'botella' gasta una unidad completa. */
  tipo_venta?: 'botella' | 'shot';
  /** Shot cobrado al precio de anfitriona (lo elige quien vende en el modal). */
  shot_anfitriona?: boolean;
}

export function mapForSaleToCartItem(item: ForSaleItem): CartSaleItem {
  const nombre = `${item.producto_nombre} ${item.presentacion_nombre}`.trim();
  const codigo = item.codigo_barras || item.producto_codigo || '';
  const categoria = item.categoria_nombre || '';
  const precio = Number(item.precio_venta ?? 0);
  const comision = isSimpleProduct(precio) ? 0 : Number(item.comision ?? 0);
  return {
    id: String(item.presentacion_id),
    producto_id: String(item.producto_id),
    presentacion_id: String(item.presentacion_id),
    codigo,
    code: codigo,
    nombre,
    name: nombre,
    precio,
    price: precio,
    comision,
    commission: comision,
    categoria,
    category: categoria,
    category_name: categoria,
    foto: item.foto || 'default.png',
    stock_bar: Number(item.stock_bar ?? 0),
    cantidad: 1,
    ...(Array.isArray(item.opciones_venta) ? { opciones_venta: item.opciones_venta } : {}),
    ml_botella:
      item.ml_botella === null || item.ml_botella === undefined ? null : Number(item.ml_botella),
    ml_shot: item.ml_shot === null || item.ml_shot === undefined ? null : Number(item.ml_shot),
    ml_shot_anfitriona:
      item.ml_shot_anfitriona === null || item.ml_shot_anfitriona === undefined
        ? null
        : Number(item.ml_shot_anfitriona),
    max_anfitrionas:
      item.max_anfitrionas === null || item.max_anfitrionas === undefined
        ? null
        : Number(item.max_anfitrionas),
    ml_abierta: Number(item.ml_abierta ?? 0),
    tipo_venta: 'botella' as const
  };
}
