'use client';

import { useEffect, useState } from 'react';
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

export interface TransferForm {
  cantidad: string;
  setCantidad: (value: string) => void;
  precioVenta: string;
  setPrecioVenta: (value: string) => void;
  comision: string;
  setComision: (value: string) => void;
  tipos: SaleType[];
  setTipos: (value: SaleType[]) => void;
  precioShot: string;
  setPrecioShot: (value: string) => void;
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
  const [cantidad, setCantidad] = useState('');
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const [precioVenta, setPrecioVenta] = useState('');
  const [comision, setComision] = useState('');
  const [tipos, setTipos] = useState<SaleType[]>(['botella']);
  const [precioShot, setPrecioShot] = useState('');
  const [comisionShot, setComisionShot] = useState('');
  // Ml por shot para cada audiencia (anfitriona vacío = igual que cliente).
  const [mlShotCliente, setMlShotCliente] = useState('');
  const [mlShotAnfitriona, setMlShotAnfitriona] = useState('');
  const [tiers, setTiers] = useState<ChampagneTierRow[]>([]);
  const [editarPrecios, setEditarPrecios] = useState(false);

  // Lo que se muestra en los labels: lo que se está editando o el valor vigente.
  const mlPorShot = resolveShotMl(Number(mlShotCliente), shotMl);
  const mlPorShotAnfitriona = resolveShotMlAnfitriona(Number(mlShotAnfitriona), mlPorShot);
  const etiquetaShot =
    mlPorShotAnfitriona !== mlPorShot
      ? `Shot · ${mlPorShot} ml · Anf ${mlPorShotAnfitriona} ml`
      : `Shot · ${mlPorShot} ml`;

  const esChampagneItem = esChampagne(item?.categoria_nombre);
  const opcionesGuardadas: SaleOption[] = parseSavedOptions(item?.opciones_venta) ?? [
    { tipo: 'botella', precio: item?.precio_venta ?? 0, comision: item?.comision ?? 0 }
  ];
  // Si ya tiene precio/comisión configurados, se reutilizan sin pedirlos manualmente.
  const tieneConfig = opcionesGuardadas.some(option => Number(option.precio ?? 0) > 0);

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
      const bottle = options.find(option => option.tipo === 'botella');
      const shot = options.find(option => option.tipo === 'shot');
      setTipos(options.map(option => option.tipo));
      const bottlePrecio = Number(bottle?.precio) > 0 ? Number(bottle?.precio) : presPrecio;
      const bottleComision = Number(bottle?.comision) > 0 ? Number(bottle?.comision) : presComision;
      setPrecioVenta(bottlePrecio > 0 ? formatNumber(String(bottlePrecio)) : '');
      setComision(bottleComision ? formatNumber(String(bottleComision)) : '');
      setPrecioShot(shot && Number(shot.precio) > 0 ? formatNumber(String(shot.precio)) : '');
      setComisionShot(shot?.comision ? formatNumber(String(shot.comision)) : '');
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
      setEditarPrecios(!options.some(option => Number(option.precio ?? 0) > 0));
      setTiers([]);
      if (esChampagne(item.categoria_nombre)) {
        fetch(`/api/products/${item.producto_id}/tiers`)
          .then(res => res.json().catch(() => ({})))
          .then(data => {
            if (cancelado) return;
            const rows =
              data.success && Array.isArray(data.data) && data.data.length > 0
                ? data.data
                : CHAMPAGNE_DEFAULT_TIERS;
            setTiers(
              rows.map((t: ChampagneTier) => ({
                anfitrionas: t.anfitrionas,
                precio: formatMiles(t.precio),
                comision: formatMiles(t.comision)
              }))
            );
          })
          .catch(() => {
            if (cancelado) return;
            setTiers(
              CHAMPAGNE_DEFAULT_TIERS.map(t => ({
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

  const reset = () => {
    setCantidad('');
    setPrecioVenta('');
    setComision('');
    setPrecioShot('');
    setComisionShot('');
    setMlShotCliente('');
    setMlShotAnfitriona('');
    setTipos(['botella']);
    setTiers([]);
    setEditarPrecios(false);
  };

  const usarConfigGuardada = tieneConfig && !editarPrecios;
  // El input de ml solo existe cuando el tipo de venta shot está activo.
  const shotActivo = usarConfigGuardada
    ? opcionesGuardadas.some(option => option.tipo === 'shot')
    : tipos.includes('shot');

  return {
    cantidad,
    setCantidad,
    precioVenta,
    setPrecioVenta,
    comision,
    setComision,
    tipos,
    setTipos,
    precioShot,
    setPrecioShot,
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
