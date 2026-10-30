'use client';

import { useEffect, useState, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { type ChampagneTier } from '@/lib/business/champagne';
import { etiquetaCorto, resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import {
  esBebidaAnalcoholica,
  esCigarrillos,
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
  mlColacion: string;
  setMlColacion: (value: string) => void;
  mlAcompanamientoColacion: string;
  setMlAcompanamientoColacion: (value: string) => void;
  mlColacionSugerido: number | null;
  mlAcompanamientoColacionSugerido: number | null;
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
  venderConAnfitriona: boolean;
  setVenderConAnfitriona: (value: boolean) => void;
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
  shotMl: number;
  mlPorShot: number;
  mlPorShotAnfitriona: number;
  etiquetaShot: string;
  esChampagneItem: boolean;
  esAnalcoholicaItem: boolean;
  opcionesGuardadas: SaleOption[];
  tieneConfig: boolean;
  usarConfigGuardada: boolean;
  shotActivo: boolean;
  disponible: number;
  reset: () => void;
}

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
  const [mlColacion, setMlColacion] = useState('');
  const [mlAcompanamientoColacion, setMlAcompanamientoColacion] = useState('');
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
  const [venderConAnfitriona, setVenderConAnfitriona] = useState(true);
  const [tipos, setTipos] = useState<SaleType[]>(['botella']);
  const [precioShot, setPrecioShot] = useState('');
  const [precioShotAnfitriona, setPrecioShotAnfitriona] = useState('');
  const [comisionShot, setComisionShot] = useState('');
  const [preciosAnfitrionaExtra, setPreciosAnfitrionaExtra] = useState<
    { precio: string; comision: string }[]
  >([]);

  const [mlShotCliente, setMlShotCliente] = useState('');
  const [mlShotAnfitriona, setMlShotAnfitriona] = useState('');
  const [tiers, setTiersState] = useState<ChampagneTierRow[]>([]);
  const tiersEdited = useRef(false);
  const setTiers: Dispatch<SetStateAction<ChampagneTierRow[]>> = updater => {
    tiersEdited.current = true;
    setTiersState(updater);
  };
  const [editarPrecios, setEditarPrecios] = useState(false);
  const mlPorShot = resolveShotMl(Number(mlShotCliente), shotMl);
  const mlPorShotAnfitriona = resolveShotMlAnfitriona(Number(mlShotAnfitriona), mlPorShot);
  const etiquetaShot = etiquetaCorto(mlPorShot, mlPorShotAnfitriona);

  const esChampagneItem = esChampagne(item?.categoria_nombre);
  const esAnalcoholicaItem =
    esBebidaAnalcoholica(item?.categoria_nombre) || esCigarrillos(item?.categoria_nombre);
  const opcionesGuardadas: SaleOption[] = (
    parseSavedOptions(item?.opciones_venta) ?? [
      { tipo: 'botella', precio: item?.precio_venta ?? 0, comision: item?.comision ?? 0 }
    ]
  ).filter(option => !esAnalcoholicaItem || option.tipo === 'botella');
  const tieneConfig = opcionesGuardadas.some(
    option => Number(option.precio ?? 0) > 0 || preciosCortoAnfitriona(option).length > 0
  );

  useEffect(() => {
    let cancelado = false;
    if (open && item) {
      setCantidad('');
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
      setMlColacion(
        bottle?.ml_colacion !== undefined && bottle?.ml_colacion !== null
          ? String(bottle.ml_colacion)
          : ''
      );
      setMlAcompanamientoColacion(
        bottle?.acompanamiento_colacion?.ml !== undefined &&
          bottle?.acompanamiento_colacion?.ml !== null
          ? String(bottle.acompanamiento_colacion.ml)
          : ''
      );
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
      setTipos(
        esBebidaAnalcoholica(item.categoria_nombre) || esCigarrillos(item.categoria_nombre)
          ? ['botella']
          : options.map(option => option.tipo)
      );
      const bottlePrecio = Number(bottle?.precio) > 0 ? Number(bottle?.precio) : presPrecio;
      const bottleComision =
        bottle?.comision !== undefined ? Number(bottle.comision) : presComision;
      setPrecioSinAnfitriona(
        bottle?.precio_sin_anfitriona ? formatNumber(String(bottle.precio_sin_anfitriona)) : ''
      );
      setPrecioVenta(bottlePrecio > 0 ? formatNumber(String(bottlePrecio)) : '');
      setComision(bottleComision ? formatNumber(String(bottleComision)) : '');
      // Guardado con precio 0 significa que la bebida no se vende con anfitriona.
      const botellaGuardada = parseSavedOptions(item.opciones_venta)?.find(
        option => option.tipo === 'botella'
      );
      setVenderConAnfitriona(botellaGuardada ? Number(botellaGuardada.precio ?? 0) > 0 : true);
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
      setEditarPrecios(
        !options.some(
          option => Number(option.precio ?? 0) > 0 || preciosCortoAnfitriona(option).length > 0
        )
      );
      tiersEdited.current = false;
      setTiersState([]);
      if (options.some(option => option.tipo === 'botella')) {
        fetch(`/api/products/${item.producto_id}/tiers`)
          .then(res => res.json().catch(() => ({})))
          .then(data => {
            if (cancelado || tiersEdited.current) return;
            const rows: ChampagneTier[] = data.success && Array.isArray(data.data) ? data.data : [];
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
    setMlColacion('');
    setMlAcompanamientoColacion('');
    setCoverHabilitado(false);
    setAcompanamientoBotella('ninguno');
    setUnidadesAcompanamiento('');
    setCantidad('');
    setPrecioVenta('');
    setPrecioSinAnfitriona('');
    setComision('');
    setVenderConAnfitriona(true);
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
  const shotActivo =
    !esAnalcoholicaItem &&
    (usarConfigGuardada
      ? opcionesGuardadas.some(option => option.tipo === 'shot')
      : tipos.includes('shot'));
  const mlColacionSugerido = shotActivo && mlPorShotAnfitriona > 0 ? mlPorShotAnfitriona : null;
  const mlAcompanamientoColacionSugerido =
    shotActivo && Number(mlAcompanamientoAnfitriona) > 0
      ? Number(mlAcompanamientoAnfitriona)
      : null;

  return {
    esAnalcoholicaItem,
    mlAcompanamientoAnfitriona,
    setMlAcompanamientoAnfitriona,
    maxAnfitrionas,
    setMaxAnfitrionas,
    colacionHabilitada,
    setColacionHabilitada,
    mlColacion,
    setMlColacion,
    mlAcompanamientoColacion,
    setMlAcompanamientoColacion,
    mlColacionSugerido,
    mlAcompanamientoColacionSugerido,
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
    venderConAnfitriona,
    setVenderConAnfitriona,
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
