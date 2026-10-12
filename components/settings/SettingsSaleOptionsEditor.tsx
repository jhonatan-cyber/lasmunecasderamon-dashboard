'use client';

import { useState, useImperativeHandle, type Ref } from 'react';
import { isSimpleProduct } from '@/components/orders/productModalRules';
import { SaleTypeEditor } from '@/components/bar/transfer/SaleTypeEditor';
import { SaleOptionsSchema } from '@/lib/business/schemas/sale-options';
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
  ref: Ref<SettingsSaleOptionsHandle>;
}) {
  const shot = options.find(o => o.tipo === 'shot');
  const bottle = options.find(o => o.tipo === 'botella');
  const hostPrices = shot ? preciosCortoAnfitriona(shot) : [];
  const [tipos, setTipos] = useState<SaleType[]>(
    options.length ? options.map(o => o.tipo) : ['botella']
  );
  const [precioShot, setPrecioShot] = useState(String(shot?.precio ?? 0));
  const [precioHost, setPrecioHost] = useState(hostPrices[0] ? String(hostPrices[0].precio) : '');
  const [comisionHost, setComisionHost] = useState(
    String(hostPrices[0]?.comision ?? shot?.comision ?? 0)
  );
  const [extras, setExtras] = useState(
    hostPrices.slice(1).map(p => ({ precio: String(p.precio), comision: String(p.comision) }))
  );
  const [mix, setMix] = useState<'ninguno' | 'gaseosa' | 'soda'>(
    bottle?.acompanamiento?.tipo ?? 'ninguno'
  );
  const [units, setUnits] = useState(String(bottle?.acompanamiento?.unidades ?? 1));
  const [ml, setMl] = useState(mlCliente ? String(mlCliente) : '');
  const [mlHost, setMlHost] = useState(mlAnfitriona ? String(mlAnfitriona) : '');
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);

  useImperativeHandle(ref, () => ({
    getConfig() {
      const parsed = SaleOptionsSchema.safeParse(
        tipos.map(tipo =>
          tipo === 'botella'
            ? {
                tipo,
                precio: numeric(precio),
                comision: isSimpleProduct(numeric(precio)) ? 0 : numeric(comision),
                ...(mix !== 'ninguno'
                  ? { acompanamiento: { tipo: mix, unidades: Number(units) } }
                  : {})
              }
            : {
                tipo,
                precio: numeric(precioShot),
                comision: 0,
                precio_anfitriona: numeric(precioHost || precioShot),
                precios_anfitriona: [
                  { precio: numeric(precioHost || precioShot), comision: numeric(comisionHost) },
                  ...extras.map(p => ({ precio: numeric(p.precio), comision: numeric(p.comision) }))
                ]
              }
        )
      );
      if (!parsed.success)
        throw new Error(parsed.error.issues[0]?.message || 'Configuración inválida');
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
      context='settings'
      tipos={tipos}
      onTiposChange={setTipos}
      etiquetaShot='Corto'
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
