'use client';

import { useState, useImperativeHandle, type Ref } from 'react';
import { SaleTypeEditor } from '@/components/bar/transfer/SaleTypeEditor';
import { ConfiguredSaleOptionsSchema } from '@/lib/business/schemas/sale-options';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import type { SaleOption, SaleType } from '@/types/sale-options';

const numeric = (value: string) => Number(value.replace(/\./g, ''));
export interface SettingsSaleOptionsHandle {
  getConfig: () => {
    opciones_venta: SaleOption[];
    ml_shot?: number | null;
    ml_shot_anfitriona?: number | null;
  };
}

/** Comparte el editor de transferencia; guardar ajustes no mueve inventario. */
export function SettingsSaleOptionsEditor({
  options,
  precio,
  comision,
  mlCliente,
  mlAnfitriona,
  saving,
  onPrecio,
  onComision,
  maxAnfitrionas,
  onMaxAnfitrionasChange,
  ref
}: {
  options: SaleOption[];
  precio: string;
  comision: string;
  mlCliente?: number | null;
  mlAnfitriona?: number | null;
  saving: boolean;
  onPrecio: (value: string) => void;
  onComision: (value: string) => void;
  /** Vacío = regla por defecto del producto. Mismo campo que en la transferencia. */
  maxAnfitrionas?: string;
  onMaxAnfitrionasChange?: (value: string) => void;
  ref: Ref<SettingsSaleOptionsHandle>;
}) {
  const shot = options.find(o => o.tipo === 'shot');
  const bottle = options.find(o => o.tipo === 'botella');
  const [colacionHabilitada, setColacionHabilitada] = useState(
    bottle?.colacion_habilitada === true
  );
  const [precioSinAnfitriona, setPrecioSinAnfitriona] = useState(
    bottle?.precio_sin_anfitriona ? String(bottle.precio_sin_anfitriona) : ''
  );
  const hostPrices = shot ? preciosCortoAnfitriona(shot) : [];
  const [tipos, setTipos] = useState<SaleType[]>(
    options.length ? options.map(o => o.tipo) : ['botella']
  );
  const [precioShot, setPrecioShot] = useState(shot?.precio ? String(shot.precio) : '');
  const [precioHost, setPrecioHost] = useState(hostPrices[0] ? String(hostPrices[0].precio) : '');
  const [comisionHost, setComisionHost] = useState(
    String(hostPrices[0]?.comision ?? shot?.comision ?? 0)
  );
  const [extras, setExtras] = useState(
    hostPrices.slice(1).map(p => ({ precio: String(p.precio), comision: String(p.comision) }))
  );
  const [mix, setMix] = useState<'ninguno' | 'gaseosa' | 'soda'>(
    (bottle?.acompanamiento?.unidades ?? 0) > 0
      ? (bottle?.acompanamiento?.tipo ?? 'gaseosa')
      : 'ninguno'
  );
  const [units, setUnits] = useState(
    bottle?.acompanamiento?.unidades ? String(bottle.acompanamiento.unidades) : ''
  );
  const [ml, setMl] = useState(mlCliente ? String(mlCliente) : '');
  const [mlHost, setMlHost] = useState(mlAnfitriona ? String(mlAnfitriona) : '');
  const [mlMixHost, setMlMixHost] = useState(String(shot?.ml_acompanamiento_anfitriona ?? ''));
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);

  useImperativeHandle(ref, () => ({
    getConfig() {
      const parsed = ConfiguredSaleOptionsSchema.safeParse(
        tipos.map(tipo =>
          tipo === 'botella'
            ? {
                tipo,
                precio: numeric(precio),
                ...(precioSinAnfitriona.trim()
                  ? { precio_sin_anfitriona: numeric(precioSinAnfitriona) }
                  : {}),
                comision: numeric(comision),
                colacion_habilitada: colacionHabilitada,
                acompanamiento: { unidades: Number(units || 0) }
              }
            : {
                tipo,
                precio: numeric(precioShot),
                comision: 0,
                ml_acompanamiento_anfitriona: Number(mlMixHost || 0),
                precio_anfitriona: numeric(precioHost),
                precios_anfitriona: [
                  ...(precioHost.trim()
                    ? [{ precio: numeric(precioHost), comision: numeric(comisionHost) }]
                    : []),
                  ...extras.map(p => ({ precio: numeric(p.precio), comision: numeric(p.comision) }))
                ]
              }
        )
      );
      if (!parsed.success)
        throw new Error(parsed.error.issues[0]?.message || 'Configuración inválida');
      if (
        tipos.includes('shot') &&
        numeric(precioShot) <= 0 &&
        !precioHost.trim() &&
        !extras.length
      )
        throw new Error('Configura el precio de corto para cliente o anfitriona');
      if (
        tipos.includes('shot') &&
        [ml, mlHost].some(
          v => v !== '' && (!Number.isInteger(Number(v)) || Number(v) < 1 || Number(v) > 10000)
        )
      )
        throw new Error('Los ml por corto deben estar entre 1 y 10000');
      return {
        opciones_venta: parsed.data,
        ...(tipos.includes('shot')
          ? {
              ml_shot: ml === '' ? null : Number(ml),
              ml_shot_anfitriona: mlHost === '' ? null : Number(mlHost)
            }
          : {})
      };
    }
  }));

  return (
    <SaleTypeEditor
      mlAcompanamientoAnfitriona={mlMixHost}
      onMlAcompanamientoAnfitrionaChange={setMlMixHost}
      context='settings'
      maxAnfitrionas={maxAnfitrionas}
      onMaxAnfitrionasChange={onMaxAnfitrionasChange}
      colacionHabilitada={colacionHabilitada}
      onColacionHabilitadaChange={setColacionHabilitada}
      tipos={tipos}
      onTiposChange={setTipos}
      etiquetaShot='Corto'
      precioSinAnfitriona={precioSinAnfitriona}
      onPrecioSinAnfitrionaChange={setPrecioSinAnfitriona}
      precioVenta={precio}
      comision={comision}
      onPrecioVentaChange={onPrecio}
      onComisionChange={onComision}
      precioShot={precioShot}
      onPrecioShotChange={setPrecioShot}
      precioShotAnfitriona={precioHost}
      onPrecioShotAnfitrionaChange={setPrecioHost}
      comisionShot={comisionHost}
      onComisionShotChange={setComisionHost}
      preciosAnfitrionaExtra={extras}
      onPreciosAnfitrionaExtraChange={setExtras}
      acompanamientoBotella={mix}
      onAcompanamientoBotellaChange={setMix}
      unidadesAcompanamiento={units}
      onUnidadesAcompanamientoChange={setUnits}
      shotMl={shotMl}
      mlShotCliente={ml}
      onMlShotClienteChange={setMl}
      mlShotAnfitriona={mlHost}
      onMlShotAnfitrionaChange={setMlHost}
      esChampagne={false}
      tiers={[]}
      onTierChange={() => {}}
      saving={saving}
    />
  );
}
