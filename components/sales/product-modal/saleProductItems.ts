import { esBotella } from '@/lib/sales/saleChoice';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
import { esCortoAnfitriona, permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';
import {
  bottleMixerUnits,
  hostessMixerMl,
  shortMixerConsumption
} from '@/lib/sales/productConfiguration';
// Modelo de vista de una presentación en el modal de productos de la venta.
// Antes todo este cálculo vivía dentro del `.map()` del modal mezclado con el
// JSX de cada celda; aquí solo viven datos y callbacks atados al producto, y el
// JSX está en los subcomponentes de `components/sales/product-modal/`.
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { getChampagneHostessLimit, isChampagneProduct } from '@/components/orders';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import type { SaleFormatQuantityOption } from '@/components/sales/SaleFormatQuantities';

/** Una fila/tarjeta del modal: qué mostrar y qué pasa al interactuar. */
export interface SaleProductItem {
  hostessFormats?: Array<{
    unitIndex?: number;
    value: SaleChoice;
    label: string;
    cantidad: number;
    comision: number;
    selected: string[];
    onChange: (ids: string[]) => void;
  }>;

  mixers?: SaleProductMixer[];
  mixerLoading?: boolean;
  mixerError?: string;
  onMixerRetry?: () => void;
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
  onAgregar: () => Promise<void>;
  champagneSelected: string[];
  otherSelected: string[];
  onChampagneSelect: (hostessIds: string[]) => void;
  onOtherSelect: (hostessIds: string[]) => void;
  hostessSearch: string;
  onHostessSearchChange: (value: string) => void;
}

export interface SaleProductMixer {
  unitIndex?: number;
  value: SaleChoice;
  label: string;
  cantidad: number;
  unidades?: number;
  ml_por_corto?: number;
  selected: any;
  choices: any[];
  needsConfiguration: boolean;
  onChange: (id: string) => void;
}

/** Estado del modal + callbacks del consumidor, para construir cada item. */
export interface SaleProductItemContext {
  mixers?: Record<string, any>;
  bar?: any[];
  mixerLoading?: boolean;
  mixerError?: string;
  onMixerChange?: (key: string, value: any) => void;
  onMixerRetry?: () => void;
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
    const mlOpcion = esCortoAnfitriona(opcion.value) ? mlPorShotAnfitriona : mlPorShot;
    return {
      value: opcion.value,
      label: `${opcion.nombre}${opcion.esShot ? ` · ${mlOpcion} ml` : ''}`,
      precio: opcion.precio,
      comision: opcion.comision,
      cantidad: ctx.cantidadesPorTipo[`${id}:${opcion.value}`] || 0,
      maxCantidad: opcion.esShot ? 99 : Number(producto.stock_bar ?? 0)
    };
  });

  // Cada formato usa su comisión; la comisión de otro formato no lo habilita.
  const admiteAnfitriona = (opcion: SaleFormatQuantityOption) =>
    permiteAnfitrionaConComision(opcion.value, opcion.comision);
  const pideAnfitriona = opcionesTipo.some(
    opcion => opcion.cantidad > 0 && admiteAnfitriona(opcion)
  );
  const muestraAnfitriona = pideAnfitriona;
  const hostessFormats = opcionesTipo
    .filter(option => option.cantidad > 0 && admiteAnfitriona(option))
    .flatMap(option =>
      Array.from({ length: esBotella(option.value) ? 1 : option.cantidad }, (_, unitIndex) => {
        const key = esBotella(option.value)
          ? id
          : `${id}:${option.value}${unitIndex > 0 ? `:unit:${unitIndex}` : ''}`;
        return {
          unitIndex,
          value: option.value,
          label: option.label,
          cantidad: esBotella(option.value) ? option.cantidad : 1,
          comision: option.comision,
          selected:
            esBotella(option.value) && isChampagne
              ? ctx.champagneHostessSelections[id] || []
              : (ctx.otherProductHostessSelections[key] || []).slice(
                  0,
                  esBotella(option.value) ? undefined : 1
                ),
          onChange: (ids: string[]) =>
            esBotella(option.value) && isChampagne
              ? ctx.onChampagneHostessChange(id, ids)
              : ctx.onOtherProductHostessChange(
                  key,
                  esBotella(option.value) ? ids : ids.slice(0, 1)
                )
        };
      })
    );

  // Unidades de esta presentación y forma de venta ya agregadas al carrito:
  // el shot de cliente y el de anfitriona se cobran distinto, así que cada uno
  // cuenta lo suyo.
  const enCarrito = (ctx.productosEnCarrito || [])
    .filter(c => String(c.id) === id)
    .reduce((sum, c) => sum + (Number(c.cantidad) || 0), 0);

  const cantidadActual = opcionesTipo.reduce((sum, opcion) => sum + opcion.cantidad, 0);
  const champagneSelected = ctx.champagneHostessSelections[id] || [];
  const otherSelected = ctx.otherProductHostessSelections[id] || [];
  const mixers: SaleProductMixer[] = opcionesTipo
    .filter(
      opcion => opcion.cantidad > 0 && (!esBotella(opcion.value) || bottleMixerUnits(producto) > 0)
    )
    .flatMap(opcion =>
      Array.from({ length: esBotella(opcion.value) ? 1 : opcion.cantidad }, (_, unitIndex) => {
        const quantity = esBotella(opcion.value) ? opcion.cantidad : 1;
        const product = { ...producto, shot_anfitriona: esCortoAnfitriona(opcion.value) };
        const consumption = esBotella(opcion.value)
          ? { unidades: bottleMixerUnits(producto) }
          : shortMixerConsumption(product);
        const needsConfiguration = esCortoAnfitriona(opcion.value) && hostessMixerMl(product) <= 0;
        const key = `${id}:${opcion.value}${unitIndex > 0 ? `:unit:${unitIndex}` : ''}`;
        const selected = ctx.mixers?.[key];
        const choices = (ctx.bar ?? []).filter(
          b =>
            String(b.id) !== id &&
            ('unidades' in consumption
              ? Number(b.stock_bar) > 0 && Number(b.stock_bar) >= consumption.unidades * quantity
              : Number(b.stock_bar) > 0 ||
                (consumption.ml_por_corto > 0 &&
                  Number(b.ml_abierta) >= consumption.ml_por_corto * quantity))
        );
        return {
          unitIndex,
          value: opcion.value,
          label: opcion.label,
          cantidad: quantity,
          ...consumption,
          selected,
          choices,
          needsConfiguration,
          onChange: (selectedId: string) => {
            const choice = choices.find(b => String(b.id) === selectedId);
            ctx.onMixerChange?.(
              key,
              choice
                ? {
                    presentacion_id: String(choice.id),
                    nombre: `${choice.producto_nombre} ${choice.nombre}`,
                    foto:
                      choice.foto && choice.foto !== 'default.png'
                        ? choice.foto
                        : choice.producto_foto,
                    stock_bar: Number(choice.stock_bar) || 0,
                    ml_abierta: Number(choice.ml_abierta) || 0,
                    ...consumption
                  }
                : undefined
            );
          }
        };
      })
    );
  const agregarDisabled =
    cantidadActual === 0 ||
    mixers.some(mixer => {
      if (!mixer.selected || mixer.unidades === undefined) return false;
      const required = mixers
        .filter(
          other =>
            other.selected?.presentacion_id === mixer.selected.presentacion_id &&
            other.unidades !== undefined
        )
        .reduce((sum, other) => sum + other.cantidad * (other.unidades ?? 0), 0);
      return (
        required >
        Number(
          mixer.selected.stock_bar ??
            ctx.bar?.find(choice => String(choice.id) === mixer.selected.presentacion_id)
              ?.stock_bar ??
            0
        )
      );
    }) ||
    mixers.some(
      mixer =>
        !mixer.needsConfiguration &&
        (!mixer.selected ||
          !mixer.choices.some(choice => String(choice.id) === mixer.selected.presentacion_id))
    );

  const onAgregar = async () => {
    if (agregarDisabled) return;
    for (const opcion of opcionesTipo.filter(opcion => opcion.cantidad > 0)) {
      for (
        let unitIndex = 0;
        unitIndex < (esBotella(opcion.value) ? 1 : opcion.cantidad);
        unitIndex++
      ) {
        await ctx.onAgregarProducto({
          ...producto,
          acompanamiento_corto: !esBotella(opcion.value)
            ? mixers.find(
                m => m.value === opcion.value && m.unitIndex === unitIndex && !m.needsConfiguration
              )?.selected
            : undefined,
          acompanamiento_botella: esBotella(opcion.value)
            ? mixers.find(m => m.value === opcion.value)?.selected
            : undefined,
          unidades_acompanamiento: esBotella(opcion.value)
            ? parseSavedOptions(producto.opciones_venta)?.find(o => o.tipo === 'botella')
                ?.acompanamiento?.unidades
            : undefined,
          tipo_venta: esBotella(opcion.value) ? 'botella' : 'shot',
          shot_anfitriona: esCortoAnfitriona(opcion.value),
          precio: opcion.precio,
          comision: opcion.comision,
          cantidad: esBotella(opcion.value) ? opcion.cantidad : 1,
          selectedHostesses: admiteAnfitriona(opcion)
            ? (
                hostessFormats.find(
                  format => format.value === opcion.value && format.unitIndex === unitIndex
                )?.selected || []
              ).slice(0, esBotella(opcion.value) ? undefined : opcion.cantidad)
            : [],
          isChampagne
        });
      }
      ctx.onSaleTypeChange(id, opcion.value, 0);
    }
  };

  return {
    mixers,
    mixerLoading: ctx.mixerLoading,
    mixerError: ctx.mixerError,
    onMixerRetry: ctx.onMixerRetry,
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
    hostessFormats,
    agregarDisabled,
    totalAgregar: formatCurrencyNoDecimals(
      opcionesTipo.reduce((sum, opcion) => sum + opcion.precio * opcion.cantidad, 0)
    ),
    mlEstimacion: esCortoAnfitriona(tipoVenta) ? mlPorShotAnfitriona : mlPorShot,
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
