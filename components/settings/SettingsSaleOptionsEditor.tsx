'use client';

import { useMemo, useImperativeHandle, type Ref } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import type { SaleOption } from '@/types/sale-options';

const numeric = (value: string) => Number(value.replace(/\./g, ''));
const editorFieldsSchema = z.object({
  colacionHabilitada: z.boolean(),
  coverHabilitado: z.boolean(),
  enVenta: z.boolean(),
  cortoAnfitrionaHabilitado: z.boolean(),
  precioSinAnfitriona: z.string(),
  tipos: z.array(z.enum(['botella', 'shot'])),
  precioShot: z.string(),
  precioHost: z.string(),
  comisionHost: z.string(),
  extras: z.array(z.object({ precio: z.string(), comision: z.string() })),
  mix: z.enum(['ninguno', 'gaseosa', 'soda']),
  units: z.string(),
  ml: z.string(),
  mlHost: z.string(),
  mlMixHost: z.string(),
  acompanamientoCliente: z.boolean(),
  venderConAnfitriona: z.boolean(),
  mlColacion: z.string(),
  mlColacionAcomp: z.string()
});
type EditorFields = z.infer<typeof editorFieldsSchema>;
export interface SettingsSaleOptionsHandle {
  getConfig: () => {
    opciones_venta: SaleOption[];
    ml_shot?: number | null;
    ml_shot_anfitriona?: number | null;
  };
}

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
  categoria?: string | null;
  precio: string;
  comision: string;
  mlCliente?: number | null;
  mlAnfitriona?: number | null;
  saving: boolean;
  onPrecio: (value: string) => void;
  onComision: (value: string) => void;
  maxAnfitrionas?: string;
  onMaxAnfitrionasChange?: (value: string) => void;
  ref: Ref<SettingsSaleOptionsHandle>;
}) {
  const bottle = options.find(o => o.tipo === 'botella');
  const esCig = esCigarrillos(categoria);
  const esAnalcoholica = esBebidaAnalcoholica(categoria);
  const esVentaSimple = esCig || esAnalcoholica;
  // Solo los datos persistidos reinician el formulario, no los precios que se están editando.
  const values = useMemo<EditorFields>(() => {
    const bottle = options.find(o => o.tipo === 'botella');
    const shot = options.find(o => o.tipo === 'shot');
    const hostPrices = shot ? preciosCortoAnfitriona(shot) : [];
    return {
      colacionHabilitada: bottle?.colacion_habilitada === true,
      coverHabilitado: bottle?.cover_habilitado === true,
      enVenta: bottle?.en_venta !== false,
      cortoAnfitrionaHabilitado: bottle?.corto_anfitriona_habilitado !== false,
      precioSinAnfitriona: String(bottle?.precio_sin_anfitriona ?? ''),
      tipos: esVentaSimple ? ['botella'] : options.length ? options.map(o => o.tipo) : ['botella'],
      precioShot: String(shot?.precio ?? ''),
      precioHost: hostPrices[0] ? String(hostPrices[0].precio) : '',
      comisionHost: String(hostPrices[0]?.comision ?? shot?.comision ?? 0),
      extras: hostPrices
        .slice(1)
        .map(p => ({ precio: String(p.precio), comision: String(p.comision) })),
      mix:
        (bottle?.acompanamiento?.unidades ?? 0) > 0
          ? (bottle?.acompanamiento?.tipo ?? 'gaseosa')
          : 'ninguno',
      units: String(bottle?.acompanamiento?.unidades ?? ''),
      ml: String(mlCliente ?? ''),
      mlHost: String(mlAnfitriona ?? ''),
      mlMixHost: String(shot?.ml_acompanamiento_anfitriona ?? ''),
      acompanamientoCliente: shot?.acompanamiento_cliente !== false,
      venderConAnfitriona: bottle?.vender_con_anfitriona ?? Number(bottle?.precio ?? 0) > 0,
      mlColacion: String(bottle?.ml_colacion ?? ''),
      mlColacionAcomp: String(bottle?.acompanamiento_colacion?.ml ?? '')
    };
  }, [options, esVentaSimple, mlCliente, mlAnfitriona]);
  const { watch, setValue, getValues } = useForm<EditorFields>({
    resolver: zodResolver(editorFieldsSchema),
    values
  });
  const {
    colacionHabilitada,
    coverHabilitado,
    enVenta,
    cortoAnfitrionaHabilitado,
    precioSinAnfitriona,
    tipos,
    precioShot,
    precioHost,
    comisionHost,
    extras,
    mix,
    units,
    ml,
    mlHost,
    mlMixHost,
    acompanamientoCliente,
    venderConAnfitriona,
    mlColacion,
    mlColacionAcomp
  } = watch();
  const field =
    <K extends keyof EditorFields>(name: K) =>
    (value: EditorFields[K]) =>
      setValue<keyof EditorFields>(name, value, { shouldDirty: true });
  const setColacionHabilitada = field('colacionHabilitada');
  const setCoverHabilitado = field('coverHabilitado');
  const setEnVenta = field('enVenta');
  const setCortoAnfitrionaHabilitado = field('cortoAnfitrionaHabilitado');
  const setPrecioSinAnfitriona = field('precioSinAnfitriona');
  const setTipos = field('tipos');
  const setPrecioShot = field('precioShot');
  const setPrecioHost = field('precioHost');
  const setComisionHost = field('comisionHost');
  const setExtras = field('extras');
  const setMix = field('mix');
  const setUnits = field('units');
  const setMl = field('ml');
  const setMlHost = field('mlHost');
  const setMlMixHost = field('mlMixHost');
  const setAcompanamientoCliente = field('acompanamientoCliente');
  const setVenderConAnfitriona = field('venderConAnfitriona');
  const setMlColacion = field('mlColacion');
  const setMlColacionAcomp = field('mlColacionAcomp');
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const shotActivo = !esVentaSimple && tipos.includes('shot');
  const mlPorShot = resolveShotMl(numeric(ml), shotMl);
  const mlPorShotAnfitriona = resolveShotMlAnfitriona(numeric(mlHost), mlPorShot);
  const mlColacionSugerido = shotActivo && mlPorShotAnfitriona > 0 ? mlPorShotAnfitriona : null;
  const mlAcompanamientoColacionSugerido =
    shotActivo && numeric(mlMixHost) > 0 ? numeric(mlMixHost) : null;
  const mostrarMlAcompanamiento = !esVentaSimple;
  const mostrarSeccionColacion = colacionHabilitada && !esCig && tipos.includes('botella');

  useImperativeHandle(ref, () => ({
    getConfig() {
      const {
        colacionHabilitada,
        coverHabilitado,
        enVenta,
        cortoAnfitrionaHabilitado,
        precioSinAnfitriona,
        tipos,
        precioShot,
        precioHost,
        comisionHost,
        extras,
        units,
        ml,
        mlHost,
        mlMixHost,
        acompanamientoCliente,
        venderConAnfitriona,
        mlColacion,
        mlColacionAcomp
      } = editorFieldsSchema.parse(getValues());
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
      const acompanamientoColacion =
        colacionAplica && mlAcompanamientoValor !== null
          ? { unidades: Number(units || 0) || 1, ml: mlAcompanamientoValor }
          : undefined;
      const ventaBotellaHabilitada = !esAnalcoholica || enVenta;
      // Sin venta con anfitriona la botella solo usa `precio_sin_anfitriona`:
      // el precio y la comisión "con anfitriona" quedan en cero.
      const botellaVendible = ventaBotellaHabilitada && (esVentaSimple || venderConAnfitriona);
      const baseBotella = {
        tipo: 'botella' as const,
        precio: botellaVendible ? numeric(precio) : 0,
        comision: botellaVendible ? numeric(comision) : 0,
        ...(!esVentaSimple ? { vender_con_anfitriona: venderConAnfitriona } : {}),
        ...(esCig ? {} : { colacion_habilitada: colacionHabilitada }),
        ...(esAnalcoholica ? { cover_habilitado: coverHabilitado } : {}),
        ...(esAnalcoholica ? { en_venta: enVenta } : {}),
        ...(esAnalcoholica ? { corto_anfitriona_habilitado: cortoAnfitrionaHabilitado } : {}),
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
            ? {
                acompanamiento: ventaBotellaHabilitada ? bottle.acompanamiento : { unidades: 0 }
              }
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
                acompanamiento_cliente: acompanamientoCliente,
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
        cortoAnfitrionaHabilitado={cortoAnfitrionaHabilitado}
        onCortoAnfitrionaHabilitadoChange={
          esAnalcoholica ? setCortoAnfitrionaHabilitado : undefined
        }
        enVenta={enVenta}
        onEnVentaChange={esAnalcoholica ? setEnVenta : undefined}
        venderConAnfitriona={venderConAnfitriona}
        onVenderConAnfitrionaChange={esVentaSimple ? undefined : setVenderConAnfitriona}
        acompanamientoCliente={acompanamientoCliente}
        onAcompanamientoClienteChange={setAcompanamientoCliente}
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
