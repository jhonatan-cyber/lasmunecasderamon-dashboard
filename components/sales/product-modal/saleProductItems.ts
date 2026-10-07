// Modelo de vista de una presentación en el modal de productos de la venta.
// Antes todo este cálculo vivía dentro del `.map()` del modal mezclado con el
// JSX de cada celda; aquí solo viven datos y callbacks atados al producto, y el
// JSX está en los subcomponentes de `components/sales/product-modal/`.
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { hostessAllowedForPrice } from '@/components/orders/productModalRules';
import { getChampagneHostessLimit, hasCommission, isChampagneProduct } from '@/components/orders';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';

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
  opcionesTipo: { value: SaleChoice; label: string }[];
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
  onSaleTypeChange: (value: SaleChoice) => void;
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
  tiposVenta: { [key: string]: SaleChoice };
  champagneHostessSelections: { [key: string]: string[] };
  otherProductHostessSelections: { [key: string]: string[] };
  hostessSearchValues: { [key: string]: string };
  productosEnCarrito: any[];
  availableHostesses: any[];
  onSaleTypeChange: (id: string, value: SaleChoice) => void;
  onCantidadChange: (id: string, value: string) => void;
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void;
  onHostessSearchChange: (id: string, value: string) => void;
  onAgregarProducto: (producto: any) => void;
}

/** Resuelve las reglas de venta/anfitriona de una presentación y ata sus callbacks. */
export function buildSaleProductItem(producto: any, ctx: SaleProductItemContext): SaleProductItem {
  const id = String(producto.id_producto || producto.id);
  const isChampagne = isChampagneProduct(producto);
  const champagneHostessLimit = getChampagneHostessLimit(producto);

  // Ml por shot del producto; sin valor propio se usa el global de Configuraciones.
  const mlPorShot = resolveShotMl(producto.ml_shot, ctx.shotMl);
  const mlPorShotAnfitriona = resolveShotMlAnfitriona(producto.ml_shot_anfitriona, mlPorShot);
  const venta = resolverVentaProducto(producto, ctx.tiposVenta[id]);
  const { tipoVenta, esShot, tieneShot } = venta;
  const precioVenta = venta.precio;
  const comisionVenta = venta.comision;

  // El listado muestra el precio de cada forma de venta, no solo el tipo.
  // Cada audiencia muestra sus propios ml.
  const opcionesTipo = venta.opciones.map(opcion => {
    const mlOpcion = opcion.value === 'shot_anfitriona' ? mlPorShotAnfitriona : mlPorShot;
    return {
      value: opcion.value,
      label: `${opcion.nombre}${opcion.esShot ? ` · ${mlOpcion} ml` : ''} · ${formatCurrencyNoDecimals(opcion.precio)}`
    };
  });

  // Cada tipo de venta lleva su propia comisión: sin comisión no se pide anfitriona.
  const pideAnfitriona = esShot
    ? comisionVenta > 0
    : hasCommission(producto) || venta.comisionBotella > 0;
  // La regla por precio (bebida cara) es de la botella: el shot no la hereda.
  const muestraAnfitriona =
    pideAnfitriona || (!esShot && hostessAllowedForPrice(venta.precioBotella));

  // Unidades de esta presentación y forma de venta ya agregadas al carrito:
  // el shot de cliente y el de anfitriona se cobran distinto, así que cada uno
  // cuenta lo suyo.
  const enCarrito = (ctx.productosEnCarrito || [])
    .filter(c => {
      if (String(c.id) !== id) return false;
      const delCarro: SaleChoice =
        c.tipo_venta === 'shot' ? (c.shot_anfitriona ? 'shot_anfitriona' : 'shot') : 'botella';
      return delCarro === tipoVenta;
    })
    .reduce((sum, c) => sum + (Number(c.cantidad) || 0), 0);

  const cantidadActual = ctx.cantidades[id] || 1;
  const champagneSelected = ctx.champagneHostessSelections[id] || [];
  const otherSelected = ctx.otherProductHostessSelections[id] || [];
  const agregarDisabled = false;

  const onAgregar = () => {
    const productWithHostess = {
      ...producto,
      // El shot a anfitriona comparte el mismo comportamiento por ml; lo que
      // cambia es el precio, y se guarda para separarlo en reportes y caja.
      tipo_venta: tipoVenta === 'botella' ? 'botella' : 'shot',
      shot_anfitriona: tipoVenta === 'shot_anfitriona',
      precio: precioVenta,
      comision: comisionVenta,
      selectedHostesses: isChampagne ? champagneSelected : otherSelected,
      isChampagne
    };
    ctx.onAgregarProducto(productWithHostess);
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
    totalAgregar: formatCurrencyNoDecimals(precioVenta * cantidadActual),
    mlEstimacion: tipoVenta === 'shot_anfitriona' ? mlPorShotAnfitriona : mlPorShot,
    onSaleTypeChange: value => ctx.onSaleTypeChange(id, value),
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
