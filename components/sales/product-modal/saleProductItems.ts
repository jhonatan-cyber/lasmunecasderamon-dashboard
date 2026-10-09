// Modelo de vista de una presentación en el modal de productos de la venta.
// Antes todo este cálculo vivía dentro del `.map()` del modal mezclado con el
// JSX de cada celda; aquí solo viven datos y callbacks atados al producto, y el
// JSX está en los subcomponentes de `components/sales/product-modal/`.
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { hostessAllowedForPrice } from '@/components/orders/productModalRules';
import { getChampagneHostessLimit, hasCommission, isChampagneProduct } from '@/components/orders';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import type { SaleFormatQuantityOption } from '@/components/sales/SaleFormatQuantities';

/** Una fila/tarjeta del modal: qué mostrar y qué pasa al interactuar. */
export interface SaleProductItem {
  id: string;
  product: any;
  name: string;
  isChampagne: boolean;
  champagneHostessLimit: number;
  /** Forma de venta elegida (botella, shot cliente o shot anfitriona). */
  tipoVenta: SaleChoice;
  /** La presentación ofrece venta por ml (además de la botella). */
  tieneShot: boolean;
  /** Opciones con el label ya formateado (nombre · ml · precio). */
  opcionesTipo: SaleFormatQuantityOption[];
  precioVenta: number;
  comisionVenta: number;
  /** Tope del stepper: stock en bar para la botella, 99 para el shot. */
  maxCantidad: number;
  cantidadActual: number;
  /** Unidades de esta presentación y tipo de venta ya agregadas al carrito. */
  enCarrito: number;
  /** La forma de venta elegida ofrece comisión para una anfitriona opcional. */
  pideAnfitriona: boolean;
  muestraAnfitriona: boolean;
  agregarDisabled: boolean;
  /** Total de agregar con la cantidad actual (lo muestra la tarjeta). */
  totalAgregar: string;
  /** Ml por shot con el que se estima la botella abierta según la venta elegida. */
  mlEstimacion: number;
  onSaleTypeChange: (value: SaleChoice, cantidad: number) => void;
  onCantidadChange: (next: number) => void;
  onAgregar: () => void;
  champagneSelected: string[];
  otherSelected: string[];
  onChampagneSelect: (hostessIds: string[]) => void;
  onOtherSelect: (hostessIds: string[]) => void;
  hostessSearch: string;
  onHostessSearchChange: (value: string) => void;
}

/** Estado del modal + callbacks del consumidor, para construir cada item. */
export interface SaleProductItemContext {
  shotMl: number;
  cantidades: { [key: string]: number };
  cantidadesPorTipo: { [key: string]: number };
  champagneHostessSelections: { [key: string]: string[] };
  otherProductHostessSelections: { [key: string]: string[] };
  hostessSearchValues: { [key: string]: string };
  productosEnCarrito: any[];
  availableHostesses: any[];
  onSaleTypeChange: (id: string, value: SaleChoice, cantidad: number) => void;
  onCantidadChange: (id: string, value: string) => void;
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void;
  onHostessSearchChange: (id: string, value: string) => void;
  onAgregarProducto: (producto: any) => void;
}

/** Resuelve las reglas de venta/anfitriona de una presentación y ata sus callbacks. */
export function buildSaleProductItem(producto: any, ctx: SaleProductItemContext): SaleProductItem {
  // La identidad del selector y del carrito es la presentación; producto_id se
  // conserva aparte para persistencia y puede repetirse entre presentaciones.
  const id = String(producto.id || producto.id_producto);
  const isChampagne = isChampagneProduct(producto);
  const champagneHostessLimit = getChampagneHostessLimit(producto);

  // Ml por shot del producto; sin valor propio se usa el global de Configuraciones.
  const mlPorShot = resolveShotMl(producto.ml_shot, ctx.shotMl);
  const mlPorShotAnfitriona = resolveShotMlAnfitriona(producto.ml_shot_anfitriona, mlPorShot);
  const venta = resolverVentaProducto(producto);
  const { tipoVenta, esShot, tieneShot } = venta;
  const precioVenta = venta.precio;
  const comisionVenta = venta.comision;

  // El listado muestra el precio de cada forma de venta, no solo el tipo.
  // Cada audiencia muestra sus propios ml.
  const opcionesTipo: SaleFormatQuantityOption[] = venta.opciones.map(opcion => {
    const mlOpcion = opcion.value === 'shot_anfitriona' ? mlPorShotAnfitriona : mlPorShot;
    return {
      value: opcion.value,
      label: `${opcion.nombre}${opcion.esShot ? ` · ${mlOpcion} ml` : ''}`,
      precio: opcion.precio,
      comision: opcion.comision,
      cantidad: ctx.cantidadesPorTipo[`${id}:${opcion.value}`] || 0,
      maxCantidad: opcion.esShot ? 99 : Number(producto.stock_bar ?? 0)
    };
  });

  // Cada tipo de venta lleva su propia comisión: sin comisión no se pide anfitriona.
  const pideAnfitriona =
    opcionesTipo.some(opcion => opcion.comision > 0) || hasCommission(producto);
  // La regla por precio (bebida cara) es de la botella: el shot no la hereda.
  const muestraAnfitriona = pideAnfitriona || hostessAllowedForPrice(venta.precioBotella);

  // Unidades de esta presentación y forma de venta ya agregadas al carrito:
  // el shot de cliente y el de anfitriona se cobran distinto, así que cada uno
  // cuenta lo suyo.
  const enCarrito = (ctx.productosEnCarrito || [])
    .filter(c => String(c.id) === id)
    .reduce((sum, c) => sum + (Number(c.cantidad) || 0), 0);

  const cantidadActual = opcionesTipo.reduce((sum, opcion) => sum + opcion.cantidad, 0);
  const champagneSelected = ctx.champagneHostessSelections[id] || [];
  const otherSelected = ctx.otherProductHostessSelections[id] || [];
  const agregarDisabled = cantidadActual === 0;

  const onAgregar = () => {
    opcionesTipo
      .filter(opcion => opcion.cantidad > 0)
      .forEach(opcion => {
        ctx.onAgregarProducto({
          ...producto,
          tipo_venta: opcion.value === 'botella' ? 'botella' : 'shot',
          shot_anfitriona: opcion.value === 'shot_anfitriona',
          precio: opcion.precio,
          comision: opcion.comision,
          cantidad: opcion.cantidad,
          selectedHostesses: isChampagne ? champagneSelected : otherSelected,
          isChampagne
        });
        ctx.onSaleTypeChange(id, opcion.value, 0);
      });
  };

  return {
    id,
    product: producto,
    name: producto.nombre || producto.name,
    isChampagne,
    champagneHostessLimit,
    tipoVenta,
    tieneShot,
    opcionesTipo,
    precioVenta,
    comisionVenta,
    maxCantidad: venta.maxCantidad,
    cantidadActual,
    enCarrito,
    pideAnfitriona,
    muestraAnfitriona,
    agregarDisabled,
    totalAgregar: formatCurrencyNoDecimals(
      opcionesTipo.reduce((sum, opcion) => sum + opcion.precio * opcion.cantidad, 0)
    ),
    mlEstimacion: tipoVenta === 'shot_anfitriona' ? mlPorShotAnfitriona : mlPorShot,
    onSaleTypeChange: (value, cantidad) => ctx.onSaleTypeChange(id, value, cantidad),
    onCantidadChange: next => ctx.onCantidadChange(id, String(next)),
    onAgregar,
    champagneSelected,
    otherSelected,
    onChampagneSelect: ids => ctx.onChampagneHostessChange(id, ids),
    onOtherSelect: ids => ctx.onOtherProductHostessChange(id, ids),
    hostessSearch: ctx.hostessSearchValues[id] || '',
    onHostessSearchChange: value => ctx.onHostessSearchChange(id, value)
  };
}
