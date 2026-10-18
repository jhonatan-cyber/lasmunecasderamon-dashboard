'use client';

import { useEffect, useState, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CHAMPAGNE_DEFAULT_TIERS, type ChampagneTier } from '@/lib/business/champagne';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import {
  esChampagne,
  formatMiles,
  formatNumber,
  parseSavedOptions,
  type BarStockItem,
  type ChampagneTierRow
} from '@/components/bar/transfer/transferOptions';
import type { SaleOption, SaleType } from '@/types/sale-options';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';

export interface TransferForm {
  mlAcompanamientoAnfitriona: string;
  setMlAcompanamientoAnfitriona: (value: string) => void;

  maxAnfitrionas: string;
  setMaxAnfitrionas: (value: string) => void;
  colacionHabilitada: boolean;
  setColacionHabilitada: (value: boolean) => void;
  coverHabilitado: boolean;
  setCoverHabilitado: (value: boolean) => void;
  acompanamientoBotella: 'ninguno' | 'gaseosa' | 'soda';
  setAcompanamientoBotella: (value: 'ninguno' | 'gaseosa' | 'soda') => void;
  unidadesAcompanamiento: string;
  setUnidadesAcompanamiento: (value: string) => void;
  preciosAnfitrionaExtra: { precio: string; comision: string }[];
  setPreciosAnfitrionaExtra: Dispatch<SetStateAction<{ precio: string; comision: string }[]>>;
  cantidad: string;
  setCantidad: (value: string) => void;
  precioSinAnfitriona: string;
  setPrecioSinAnfitriona: (value: string) => void;
  precioVenta: string;
  setPrecioVenta: (value: string) => void;
  comision: string;
  setComision: (value: string) => void;
  tipos: SaleType[];
  setTipos: (value: SaleType[]) => void;
  precioShot: string;
  setPrecioShot: (value: string) => void;
  precioShotAnfitriona: string;
  setPrecioShotAnfitriona: (value: string) => void;
  comisionShot: string;
  setComisionShot: (value: string) => void;
  mlShotCliente: string;
  setMlShotCliente: (value: string) => void;
  mlShotAnfitriona: string;
  setMlShotAnfitriona: (value: string) => void;
  tiers: ChampagneTierRow[];
  setTiers: Dispatch<SetStateAction<ChampagneTierRow[]>>;
  editarPrecios: boolean;
  setEditarPrecios: (value: boolean) => void;
  /** Ml por shot vigentes (lo que se edita o el valor del producto/global). */
  shotMl: number;
  mlPorShot: number;
  mlPorShotAnfitriona: number;
  etiquetaShot: string;
  esChampagneItem: boolean;
  opcionesGuardadas: SaleOption[];
  tieneConfig: boolean;
  usarConfigGuardada: boolean;
  shotActivo: boolean;
  disponible: number;
  reset: () => void;
}

/**
 * Estado completo del modal de traspaso: inputs, carga de la configuración
 * guardada (y de los precios champagne) al abrir, valores derivados de shot y
 * el ciclo de apertura/cierre. La parte de envío vive en `useTransferSubmit`.
 */
export function useTransferForm({
  item,
  open
}: {
  item: BarStockItem | null;
  open: boolean;
}): TransferForm {
  const [mlAcompanamientoAnfitriona, setMlAcompanamientoAnfitriona] = useState('');
  const [maxAnfitrionas, setMaxAnfitrionas] = useState('');
  const [colacionHabilitada, setColacionHabilitada] = useState(false);
  const [coverHabilitado, setCoverHabilitado] = useState(false);
  const [acompanamientoBotella, setAcompanamientoBotella] = useState<
    'ninguno' | 'gaseosa' | 'soda'
  >('ninguno');
  const [unidadesAcompanamiento, setUnidadesAcompanamiento] = useState('');
  const [cantidad, setCantidad] = useState('');
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const [precioVenta, setPrecioVenta] = useState('');
  const [precioSinAnfitriona, setPrecioSinAnfitriona] = useState('');
  const [comision, setComision] = useState('');
  const [tipos, setTipos] = useState<SaleType[]>(['botella']);
  const [precioShot, setPrecioShot] = useState('');
  const [precioShotAnfitriona, setPrecioShotAnfitriona] = useState('');
  const [comisionShot, setComisionShot] = useState('');
  const [preciosAnfitrionaExtra, setPreciosAnfitrionaExtra] = useState<
    { precio: string; comision: string }[]
  >([]);
  // Ml por shot para cada audiencia (anfitriona vacío = igual que cliente).
  const [mlShotCliente, setMlShotCliente] = useState('');
  const [mlShotAnfitriona, setMlShotAnfitriona] = useState('');
  const [tiers, setTiersState] = useState<ChampagneTierRow[]>([]);
  const tiersEdited = useRef(false);
  const setTiers: Dispatch<SetStateAction<ChampagneTierRow[]>> = updater => {
    tiersEdited.current = true;
    setTiersState(updater);
  };
  const [editarPrecios, setEditarPrecios] = useState(false);

  // Lo que se muestra en los labels: lo que se está editando o el valor vigente.
  const mlPorShot = resolveShotMl(Number(mlShotCliente), shotMl);
  const mlPorShotAnfitriona = resolveShotMlAnfitriona(Number(mlShotAnfitriona), mlPorShot);
  const etiquetaShot =
    mlPorShotAnfitriona !== mlPorShot
      ? `Corto · ${mlPorShot} ml · Anf ${mlPorShotAnfitriona} ml`
      : `Corto · ${mlPorShot} ml`;

  const esChampagneItem = esChampagne(item?.categoria_nombre);
  const opcionesGuardadas: SaleOption[] = parseSavedOptions(item?.opciones_venta) ?? [
    { tipo: 'botella', precio: item?.precio_venta ?? 0, comision: item?.comision ?? 0 }
  ];
  // Si ya tiene precio/comisión configurados, se reutilizan sin pedirlos manualmente.
  const tieneConfig = opcionesGuardadas.some(
    option => Number(option.precio ?? 0) > 0 || preciosCortoAnfitriona(option).length > 0
  );

  useEffect(() => {
    let cancelado = false;
    if (open && item) {
      setCantidad('');
      // Cadena: traspaso guardado → presentación → producto (un 0 intermedio se salta).
      const presPrecio =
        Number(item.precio_venta) > 0
          ? Number(item.precio_venta)
          : Number(item.producto_precio ?? 0);
      const presComision =
        Number(item.comision) > 0 ? Number(item.comision) : Number(item.producto_comision ?? 0);
      const options = parseSavedOptions(item.opciones_venta) ?? [
        { tipo: 'botella', precio: presPrecio, comision: presComision }
      ];
      setMaxAnfitrionas(Number(item.max_anfitrionas) > 0 ? String(item.max_anfitrionas) : '');
      const bottle = options.find(option => option.tipo === 'botella');
      setColacionHabilitada(bottle?.colacion_habilitada === true);
      setCoverHabilitado(bottle?.cover_habilitado === true);
      setAcompanamientoBotella(
        (bottle?.acompanamiento?.unidades ?? 0) > 0
          ? (bottle?.acompanamiento?.tipo ?? 'gaseosa')
          : 'ninguno'
      );
      setUnidadesAcompanamiento(
        bottle?.acompanamiento?.unidades ? String(bottle.acompanamiento.unidades) : ''
      );
      const shot = options.find(option => option.tipo === 'shot');
      setMlAcompanamientoAnfitriona(String(shot?.ml_acompanamiento_anfitriona ?? ''));
      const preciosAnfitriona = preciosCortoAnfitriona(shot);
      setPreciosAnfitrionaExtra(
        preciosAnfitriona.slice(1).map(row => ({
          precio: formatNumber(String(row.precio)),
          comision: formatNumber(String(row.comision))
        }))
      );
      setTipos(options.map(option => option.tipo));
      const bottlePrecio = Number(bottle?.precio) > 0 ? Number(bottle?.precio) : presPrecio;
      const bottleComision =
        bottle?.comision !== undefined ? Number(bottle.comision) : presComision;
      setPrecioSinAnfitriona(
        bottle?.precio_sin_anfitriona ? formatNumber(String(bottle.precio_sin_anfitriona)) : ''
      );
      setPrecioVenta(bottlePrecio > 0 ? formatNumber(String(bottlePrecio)) : '');
      setComision(bottleComision ? formatNumber(String(bottleComision)) : '');
      setPrecioShot(shot && Number(shot.precio) > 0 ? formatNumber(String(shot.precio)) : '');
      setPrecioShotAnfitriona(
        preciosAnfitriona[0]?.precio != null
          ? formatNumber(String(preciosAnfitriona[0].precio))
          : ''
      );
      setComisionShot(formatNumber(String(preciosAnfitriona[0]?.comision ?? shot?.comision ?? 0)));
      setMlShotCliente(
        item.ml_shot !== null && item.ml_shot !== undefined && Number(item.ml_shot) > 0
          ? String(item.ml_shot)
          : ''
      );
      setMlShotAnfitriona(
        item.ml_shot_anfitriona !== null &&
          item.ml_shot_anfitriona !== undefined &&
          Number(item.ml_shot_anfitriona) > 0
          ? String(item.ml_shot_anfitriona)
          : ''
      );
      // Con configuración existente se usa directo; solo la primera vez se pide manual.
      setEditarPrecios(
        !options.some(
          option => Number(option.precio ?? 0) > 0 || preciosCortoAnfitriona(option).length > 0
        )
      );
      tiersEdited.current = false;
      setTiersState([]);
      if (options.some(option => option.tipo === 'botella')) {
        fetch(
          `/api/products/${item.producto_id}/tiers${esChampagne(item.categoria_nombre) ? '' : '?configurados=1'}`
        )
          .then(res => res.json().catch(() => ({})))
          .then(data => {
            if (cancelado || tiersEdited.current) return;
            const rows =
              data.success && Array.isArray(data.data) && data.data.length > 0
                ? data.data
                : esChampagne(item.categoria_nombre)
                  ? CHAMPAGNE_DEFAULT_TIERS
                  : [];
            if (!rows.length) return;
            setTiersState(
              rows.map((t: ChampagneTier) => ({
                anfitrionas: t.anfitrionas,
                precio: formatMiles(t.precio),
                comision: formatMiles(t.comision)
              }))
            );
          })
          .catch(() => {
            if (cancelado || tiersEdited.current) return;
            if (!esChampagne(item.categoria_nombre)) return;
            setTiersState(
              (esChampagne(item.categoria_nombre) ? CHAMPAGNE_DEFAULT_TIERS : []).map(t => ({
                anfitrionas: t.anfitrionas,
                precio: formatMiles(t.precio),
                comision: formatMiles(t.comision)
              }))
            );
          });
      }
    }
    return () => {
      cancelado = true;
    };
  }, [open, item]);

  const tierCount = Math.min(20, Math.max(1, Number(maxAnfitrionas || 1) || 1));
  useEffect(() => {
    if (
      !open ||
      !tipos.includes('botella') ||
      Number(comision.replace(/\./g, '')) <= 0 ||
      tierCount < 2 ||
      !Number.isInteger(tierCount)
    )
      return;
    setTiersState(previous =>
      Array.from(
        { length: tierCount },
        (_, index) =>
          previous.find(row => row.anfitrionas === index + 1) ?? {
            anfitrionas: index + 1,
            precio: precioVenta || '0',
            comision: comision || '0'
          }
      )
    );
  }, [open, tierCount, tipos, comision, precioVenta, tiers.length]);

  const reset = () => {
    setMaxAnfitrionas('');
    setColacionHabilitada(false);
    setCoverHabilitado(false);
    setAcompanamientoBotella('ninguno');
    setUnidadesAcompanamiento('');
    setCantidad('');
    setPrecioVenta('');
    setPrecioSinAnfitriona('');
    setComision('');
    setPrecioShot('');
    setPrecioShotAnfitriona('');
    setComisionShot('');
    setPreciosAnfitrionaExtra([]);
    setMlShotCliente('');
    setMlShotAnfitriona('');
    setTipos(['botella']);
    setTiersState([]);
    setEditarPrecios(false);
  };

  const usarConfigGuardada = tieneConfig && !editarPrecios;
  // El input de ml solo existe cuando el tipo de venta shot está activo.
  const shotActivo = usarConfigGuardada
    ? opcionesGuardadas.some(option => option.tipo === 'shot')
    : tipos.includes('shot');

  return {
    mlAcompanamientoAnfitriona,
    setMlAcompanamientoAnfitriona,
    maxAnfitrionas,
    setMaxAnfitrionas,
    colacionHabilitada,
    setColacionHabilitada,
    coverHabilitado,
    setCoverHabilitado,
    acompanamientoBotella,
    setAcompanamientoBotella,
    unidadesAcompanamiento,
    setUnidadesAcompanamiento,
    preciosAnfitrionaExtra,
    setPreciosAnfitrionaExtra,
    cantidad,
    setCantidad,
    precioSinAnfitriona,
    setPrecioSinAnfitriona,
    precioVenta,
    setPrecioVenta,
    comision,
    setComision,
    tipos,
    setTipos,
    precioShot,
    setPrecioShot,
    precioShotAnfitriona,
    setPrecioShotAnfitriona,
    comisionShot,
    setComisionShot,
    mlShotCliente,
    setMlShotCliente,
    mlShotAnfitriona,
    setMlShotAnfitriona,
    tiers,
    setTiers,
    editarPrecios,
    setEditarPrecios,
    shotMl,
    mlPorShot,
    mlPorShotAnfitriona,
    etiquetaShot,
    esChampagneItem,
    opcionesGuardadas,
    tieneConfig,
    usarConfigGuardada,
    shotActivo,
    disponible: item?.stock ?? 0,
    reset
  };
}
