import { esBotella } from '@/lib/sales/saleChoice';
import type { AcompanamientoBotellaItem } from '@/lib/sales/acompanamientoBotella';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
import { esCortoAnfitriona, permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';
import {
  bottleMixerUnits,
  clienteShortSinAcompanamiento,
  hostessMixerMl,
  shortMixerConsumption
} from '@/lib/sales/productConfiguration';

import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { precioUnitarioAcompanamiento } from '@/lib/sales/recargoAcompanamiento';
import { getChampagneHostessLimit, isChampagneProduct } from '@/components/orders';
import { resolverVentaEnBar, type SaleChoice } from '@/lib/sales/saleChoice';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import type { SaleFormatQuantityOption } from '@/components/sales/SaleFormatQuantities';
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
  tipoVenta: SaleChoice;
  tieneShot: boolean;
  opcionesTipo: SaleFormatQuantityOption[];
  precioVenta: number;
  comisionVenta: number;
  maxCantidad: number;
  cantidadActual: number;
  enCarrito: number;
  pideAnfitriona: boolean;
  muestraAnfitriona: boolean;
  agregarDisabled: boolean;
  totalAgregar: string;
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

export function getSaleProductFormatColumns(item: SaleProductItem) {
  return {
    hasDrink: item.opcionesTipo.some(option =>
      esBotella(option.value)
        ? bottleMixerUnits(item.product ?? {}) > 0
        : !clienteShortSinAcompanamiento({
            ...item.product,
            tipo_venta: 'shot',
            shot_anfitriona: esCortoAnfitriona(option.value)
          })
    ),
    hasHostess: item.opcionesTipo.some(option =>
      permiteAnfitrionaConComision(option.value, option.comision, esCortoAnfitriona(option.value))
    )
  };
}

export interface SaleProductMixer {
  unitIndex?: number;
  value: SaleChoice;
  label: string;
  cantidad: number;
  unidades?: number;
  ml_por_corto?: number;
  bottle: boolean;
  selected: any;
  choices: any[];
  needsConfiguration: boolean;
  onChange: (id: string) => void;
  onDistribute?: (next: AcompanamientoBotellaItem[]) => void;
}

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

export function buildSaleProductItem(producto: any, ctx: SaleProductItemContext): SaleProductItem {
  const id = String(producto.id || producto.id_producto);
  const isChampagne = isChampagneProduct(producto);
  const champagneHostessLimit = getChampagneHostessLimit(producto);

  const mlPorShot = resolveShotMl(producto.ml_shot, ctx.shotMl);
  const mlPorShotAnfitriona = resolveShotMlAnfitriona(producto.ml_shot_anfitriona, mlPorShot);
  // Sin unidades selladas la presentación solo se vende por cortos.
  const venta = resolverVentaEnBar(producto);
  const { tipoVenta, esShot, tieneShot } = venta;
  const precioVenta = venta.precio;
  const comisionVenta = venta.comision;

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

  const enCarrito = (ctx.productosEnCarrito || [])
    .filter(c => String(c.id) === id)
    .reduce((sum, c) => sum + (Number(c.cantidad) || 0), 0);

  const cantidadActual = opcionesTipo.reduce((sum, opcion) => sum + opcion.cantidad, 0);
  const champagneSelected = ctx.champagneHostessSelections[id] || [];
  const otherSelected = ctx.otherProductHostessSelections[id] || [];
  const mixers: SaleProductMixer[] = opcionesTipo
    .filter(
      opcion =>
        opcion.cantidad > 0 &&
        !(
          !esBotella(opcion.value) &&
          clienteShortSinAcompanamiento({
            ...producto,
            tipo_venta: 'shot',
            shot_anfitriona: esCortoAnfitriona(opcion.value)
          })
        ) &&
        (!esBotella(opcion.value) || bottleMixerUnits(producto) > 0)
    )
    .flatMap(opcion =>
      Array.from({ length: esBotella(opcion.value) ? 1 : opcion.cantidad }, (_, unitIndex) => {
        const bottle = esBotella(opcion.value);
        const quantity = bottle ? opcion.cantidad : 1;
        const product = { ...producto, shot_anfitriona: esCortoAnfitriona(opcion.value) };
        const consumption = bottle
          ? { unidades: bottleMixerUnits(producto) }
          : shortMixerConsumption(product);
        const needsConfiguration = esCortoAnfitriona(opcion.value) && hostessMixerMl(product) <= 0;
        const key = `${id}:${opcion.value}${unitIndex > 0 ? `:unit:${unitIndex}` : ''}`;
        const rawSelected = ctx.mixers?.[key];
        const selected = bottle ? (Array.isArray(rawSelected) ? rawSelected : []) : rawSelected;
        const choices = (ctx.bar ?? []).filter(b => {
          if (String(b.id) === id) return false;
          const bottleOption = parseSavedOptions(b.opciones_venta)?.find(
            option => option.tipo === 'botella'
          );
          if (!bottle && esCortoAnfitriona(opcion.value)) {
            if (bottleOption?.corto_anfitriona_habilitado === false) return false;
          } else if (!bottle && bottleOption?.cover_habilitado !== true) {
            return false;
          }
          if (bottle) return Number(b.stock_bar) >= Math.max(1, quantity);
          if ('unidades' in consumption)
            return (
              Number(b.stock_bar) > 0 && Number(b.stock_bar) >= consumption.unidades * quantity
            );
          return (
            Number(b.stock_bar) > 0 ||
            (consumption.ml_por_corto > 0 &&
              Number(b.ml_abierta) >= consumption.ml_por_corto * quantity)
          );
        });
        return {
          unitIndex,
          value: opcion.value,
          label: opcion.label,
          cantidad: quantity,
          bottle,
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
                    precio: precioUnitarioAcompanamiento(choice),
                    ...consumption
                  }
                : undefined
            );
          },
          onDistribute: bottle
            ? (next: AcompanamientoBotellaItem[]) => ctx.onMixerChange?.(key, next)
            : undefined
        };
      })
    );
  const agregarDisabled =
    cantidadActual === 0 ||
    mixers.some(mixer => {
      if (mixer.bottle) {
        const sabores: AcompanamientoBotellaItem[] = Array.isArray(mixer.selected)
          ? mixer.selected
          : [];
        const total = sabores.reduce((sum, sabor) => sum + (Number(sabor.unidades) || 0), 0);
        if (total !== Number(mixer.unidades ?? 0) * mixer.cantidad) return true;
        return sabores.some(sabor => {
          const stock = Number(
            (sabor as { stock_bar?: number }).stock_bar ??
              ctx.bar?.find(choice => String(choice.id) === String(sabor.presentacion_id))
                ?.stock_bar ??
              0
          );
          return Number(sabor.unidades) < 1 || stock < Number(sabor.unidades);
        });
      }
      if (!mixer.selected || mixer.unidades === undefined) return false;
      const required = mixers
        .filter(
          other =>
            !other.bottle &&
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
        !mixer.bottle &&
        !mixer.needsConfiguration &&
        (!mixer.selected ||
          !mixer.choices.some(choice => String(choice.id) === mixer.selected.presentacion_id))
    );

  const normalizarAcompanamientoBotella = (
    selected: AcompanamientoBotellaItem[] | undefined,
    cantidadBotellas: number
  ) => {
    if (!Array.isArray(selected) || cantidadBotellas < 2) return selected;
    const normalizado = selected.map(item => ({
      ...item,
      unidades: Math.floor((Number(item.unidades) || 0) / cantidadBotellas)
    }));
    const baseUnits = bottleMixerUnits(producto);
    const asignado = normalizado.reduce((sum, item) => sum + (Number(item.unidades) || 0), 0);
    if (normalizado.length > 0 && asignado !== baseUnits) {
      normalizado[normalizado.length - 1].unidades += baseUnits - asignado;
    }
    return normalizado;
  };

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
            ? normalizarAcompanamientoBotella(
                mixers.find(m => m.value === opcion.value)?.selected as
                  AcompanamientoBotellaItem[] | undefined,
                opcion.cantidad
              )
            : undefined,
          unidades_acompanamiento: esBotella(opcion.value)
            ? parseSavedOptions(producto.opciones_venta)?.find(o => o.tipo === 'botella')
                ?.acompanamiento?.unidades
            : undefined,
          tipo_venta: esBotella(opcion.value) ? 'botella' : 'shot',
          shot_anfitriona: esCortoAnfitriona(opcion.value),
          botella_anfitriona: esBotella(opcion.value)
            ? opcion.value !== 'botella_sin_anfitriona'
            : undefined,
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
