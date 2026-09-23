// Mapea filas de GET /api/products/for-sale al shape que usa el carro de ventas.
// Clave: el id del ítem es la presentación (única por formato); producto_id se
// conserva para la FK de detalle_ventas y presentacion_id para trazabilidad.
// Venta simple (ver Ajustes → Comisiones): sin comisión.
import { isSimpleProduct } from '@/components/orders/productModalRules';
export interface ForSaleItem {
  presentacion_id: string;
  presentacion_nombre: string;
  codigo_barras?: string | null;
  foto?: string | null;
  precio_venta: number;
  comision?: number | null;
  stock_bar?: number | null;
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
    cantidad: 1
  };
}
