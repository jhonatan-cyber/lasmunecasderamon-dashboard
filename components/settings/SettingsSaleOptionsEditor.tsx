'use client';

import { useState, useImperativeHandle, type Ref } from 'react';
import { SaleTypeEditor } from '@/components/bar/transfer/SaleTypeEditor';
import { ColacionFields } from '@/components/bar/transfer/ColacionFields';
import {
  ConfiguredSaleOptionsSchema,
  SaleOptionsSchema
} from '@/lib/business/schemas/sale-options';
import { esBebidaAnalcoholica, esCigarrillos } from '@/components/bar/transfer/transferOptions';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import { etiquetaCorto, resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
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
  categoria,
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
  /** Nombre de la categoría: analcohólicas y cigarrillos usan el modo simple. */
  categoria?: string | null;
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
  // Cigarrillos comparten el modo simple; colación/cover solo en analcohólicas.
  const esCig = esCigarrillos(categoria);
  const esAnalcoholica = esBebidaAnalcoholica(categoria);
  const esVentaSimple = esCig || esAnalcoholica;
  const [colacionHabilitada, setColacionHabilitada] = useState(
    bottle?.colacion_habilitada === true
  );
  const [coverHabilitado, setCoverHabilitado] = useState(bottle?.cover_habilitado === true);
  const [precioSinAnfitriona, setPrecioSinAnfitriona] = useState(
    bottle?.precio_sin_anfitriona ? String(bottle.precio_sin_anfitriona) : ''
  );
  const hostPrices = shot ? preciosCortoAnfitriona(shot) : [];
  const [tipos, setTipos] = useState<SaleType[]>(
    esVentaSimple ? ['botella'] : options.length ? options.map(o => o.tipo) : ['botella']
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
  // Colación: mismos campos que al transferir; el estado nace con lo guardado.
  const [mlColacion, setMlColacion] = useState(
    bottle?.ml_colacion !== undefined && bottle?.ml_colacion !== null
      ? String(bottle.ml_colacion)
      : ''
  );
  const [mlColacionAcomp, setMlColacionAcomp] = useState(
    bottle?.acompanamiento_colacion?.ml !== undefined &&
      bottle?.acompanamiento_colacion?.ml !== null
      ? String(bottle.acompanamiento_colacion.ml)
      : ''
  );
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);

  // La colación hereda los ml del corto de anfitriona cuando ese tipo de venta
  // está activo; mismos cálculos que el modal de transferencia.
  const shotActivo = !esVentaSimple && tipos.includes('shot');
  const mlPorShot = resolveShotMl(numeric(ml), shotMl);
  const mlPorShotAnfitriona = resolveShotMlAnfitriona(numeric(mlHost), mlPorShot);
  const mlColacionSugerido = shotActivo && mlPorShotAnfitriona > 0 ? mlPorShotAnfitriona : null;
  const mlAcompanamientoColacionSugerido =
    shotActivo && numeric(mlMixHost) > 0 ? numeric(mlMixHost) : null;
  const mostrarMlAcompanamiento = !esVentaSimple;
  // Cigarrillos quedan fuera de la colación, igual que su check en settings.
  const mostrarSeccionColacion = colacionHabilitada && !esCig && tipos.includes('botella');

  useImperativeHandle(ref, () => ({
    getConfig() {
      // Colación: mismo criterio que al transferir. Vacío = ml heredados del
      // corto de anfitriona; sin herencia y vacío = sin ml configurados.
      const mlColacionTexto = mlColacion.replace(/\D/g, '');
      const mlColacionValor = mlColacionTexto !== '' ? Number(mlColacionTexto) : mlColacionSugerido;
      const mlAcompTexto = mlColacionAcomp.replace(/\D/g, '');
      const mlAcompanamientoValor =
        mlAcompTexto !== '' ? Number(mlAcompTexto) : mlAcompanamientoColacionSugerido;
      const colacionAplica = colacionHabilitada && !esCig;
      if (colacionAplica) {
        if (
          mlColacionValor !== null &&
          (!Number.isInteger(mlColacionValor) || mlColacionValor < 1 || mlColacionValor > 10000)
        )
          throw new Error('Los ml de la colación deben estar entre 1 y 10000');
        if (
          mlAcompanamientoValor !== null &&
          (!Number.isInteger(mlAcompanamientoValor) ||
            mlAcompanamientoValor < 1 ||
            mlAcompanamientoValor > 10000)
        )
          throw new Error('Los ml de acompañamiento deben estar entre 1 y 10000');
      }
      // Con ml de acompañamiento la colación incluye al menos una bebida, aunque
      // la botella no tenga bebidas incluidas (misma regla que al transferir).
      const acompanamientoColacion =
        colacionAplica && mlAcompanamientoValor !== null
          ? { unidades: Number(units || 0) || 1, ml: mlAcompanamientoValor }
          : undefined;
      const baseBotella = {
        tipo: 'botella' as const,
        precio: numeric(precio),
        comision: numeric(comision),
        ...(esCig ? {} : { colacion_habilitada: colacionHabilitada }),
        ...(esAnalcoholica ? { cover_habilitado: coverHabilitado } : {}),
        ...(colacionAplica && mlColacionValor !== null ? { ml_colacion: mlColacionValor } : {}),
        ...(colacionAplica && acompanamientoColacion
          ? { acompanamiento_colacion: acompanamientoColacion }
          : {}),
        ...(!esVentaSimple
          ? {
              ...(precioSinAnfitriona.trim()
                ? { precio_sin_anfitriona: numeric(precioSinAnfitriona) }
                : {}),
              acompanamiento: { unidades: Number(units || 0) }
            }
          : bottle?.acompanamiento
            ? { acompanamiento: bottle.acompanamiento }
            : {})
      };
      const parsed = (esVentaSimple ? SaleOptionsSchema : ConfiguredSaleOptionsSchema).safeParse(
        tipos.map(tipo =>
          tipo === 'botella'
            ? baseBotella
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
    <>
      <SaleTypeEditor
        mlAcompanamientoAnfitriona={mlMixHost}
        onMlAcompanamientoAnfitrionaChange={setMlMixHost}
        context='settings'
        esCigarrillos={esCig}
        mostrarBebidasIncluidas={!esVentaSimple}
        mostrarAnfitrionas={!esVentaSimple}
        mostrarCortos={!esVentaSimple}
        colacionHabilitada={colacionHabilitada}
        onColacionHabilitadaChange={esCig ? undefined : setColacionHabilitada}
        coverHabilitado={coverHabilitado}
        onCoverHabilitadoChange={esAnalcoholica ? setCoverHabilitado : undefined}
        maxAnfitrionas={maxAnfitrionas}
        onMaxAnfitrionasChange={onMaxAnfitrionasChange}
        tipos={tipos}
        onTiposChange={setTipos}
        etiquetaShot={etiquetaCorto(mlPorShot, mlPorShotAnfitriona)}
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
      {mostrarSeccionColacion && (
        <ColacionFields
          idPrefix='settings'
          mlColacion={mlColacion}
          onMlColacionChange={setMlColacion}
          mlColacionSugerido={mlColacionSugerido}
          mostrarAcompanamiento={mostrarMlAcompanamiento}
          mlAcompanamiento={mlColacionAcomp}
          onMlAcompanamientoChange={setMlColacionAcomp}
          mlAcompanamientoSugerido={mlAcompanamientoColacionSugerido}
          saving={saving}
        />
      )}
    </>
  );
}
