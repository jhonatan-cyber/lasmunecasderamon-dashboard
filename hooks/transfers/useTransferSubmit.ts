'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import type { TransferForm } from './useTransferForm';
import type { SaleOption } from '@/types/sale-options';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';

export function useTransferSubmit({
  item,
  form,
  endpoint = '/api/bar',
  onOpenChange,
  onDone
}: {
  item: BarStockItem | null;
  form: TransferForm;
  endpoint: string;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item || submitting.current) return;

    const mlColacionTexto = form.mlColacion.replace(/\D/g, '');
    const mlColacion =
      mlColacionTexto !== '' ? Number(mlColacionTexto) : (form.mlColacionSugerido ?? null);
    const mlAcompTexto = form.mlAcompanamientoColacion.replace(/\D/g, '');
    const mlAcompanamientoColacion =
      mlAcompTexto !== '' ? Number(mlAcompTexto) : (form.mlAcompanamientoColacionSugerido ?? null);
    if (form.colacionHabilitada) {
      if (
        mlColacion !== null &&
        (!Number.isInteger(mlColacion) || mlColacion < 1 || mlColacion > 10000)
      ) {
        toast.error('Los ml de la colación deben estar entre 1 y 10000');
        return;
      }
      if (
        mlAcompanamientoColacion !== null &&
        (!Number.isInteger(mlAcompanamientoColacion) ||
          mlAcompanamientoColacion < 1 ||
          mlAcompanamientoColacion > 10000)
      ) {
        toast.error('Los ml de acompañamiento deben estar entre 1 y 10000');
        return;
      }
    }

    const unidadesAcompanamiento = Number(form.unidadesAcompanamiento || 0) || 0;
    const acompanamientoColacion =
      unidadesAcompanamiento > 0 || mlAcompanamientoColacion !== null
        ? {
            unidades: unidadesAcompanamiento > 0 ? unidadesAcompanamiento : 1,
            ...(mlAcompanamientoColacion !== null ? { ml: mlAcompanamientoColacion } : {})
          }
        : undefined;
    const cant = Number(form.cantidad.replace(/\./g, ''));
    if (!Number.isInteger(cant) || cant < 1 || cant > Math.min(form.disponible, 1000)) {
      toast.error(`Cantidad debe estar entre 1 y ${Math.min(form.disponible, 1000)}`);
      return;
    }

    let options: SaleOption[];
    if (form.usarConfigGuardada) {
      options = form.opcionesGuardadas.map(option => {
        const reutilizada: SaleOption = {
          tipo: option.tipo,
          precio: Number(option.precio ?? 0),
          comision: Number(option.comision ?? 0)
        };
        if (option.tipo === 'botella' && option.precio_sin_anfitriona)
          reutilizada.precio_sin_anfitriona = option.precio_sin_anfitriona;
        if (option.tipo === 'botella') {
          reutilizada.colacion_habilitada = form.colacionHabilitada;
          reutilizada.cover_habilitado = form.coverHabilitado;
          if (form.colacionHabilitada && mlColacion !== null) reutilizada.ml_colacion = mlColacion;
          if (form.colacionHabilitada && acompanamientoColacion)
            reutilizada.acompanamiento_colacion = acompanamientoColacion;
          reutilizada.acompanamiento = {
            ...(option.acompanamiento ?? {}),
            unidades: Number(form.unidadesAcompanamiento || 0)
          };
        }
        if (option.tipo === 'shot') {
          reutilizada.ml_acompanamiento_anfitriona = option.ml_acompanamiento_anfitriona;
          reutilizada.precio_anfitriona = Number(option.precio_anfitriona ?? 0);
          reutilizada.precios_anfitriona = preciosCortoAnfitriona(option);
          reutilizada.comision = 0;
        }
        return reutilizada;
      });
    } else {
      const pv = Number(form.precioVenta.replace(/\./g, ''));
      const com = form.comision.trim() === '' ? 0 : Number(form.comision.replace(/\./g, ''));
      const pvBottle = form.venderConAnfitriona ? pv : 0;
      const comBottle = form.venderConAnfitriona ? com : 0;
      const pvShot = Number(form.precioShot.replace(/\./g, ''));
      const pvShotAnfitriona =
        form.precioShotAnfitriona.trim() === ''
          ? 0
          : Number(form.precioShotAnfitriona.replace(/\./g, ''));
      options = form.tipos.map(tipo => {
        if (tipo === 'botella')
          return {
            tipo,
            precio: pvBottle,
            ...(form.precioSinAnfitriona?.trim()
              ? { precio_sin_anfitriona: Number(form.precioSinAnfitriona.replace(/\./g, '')) }
              : {}),
            comision: comBottle,
            colacion_habilitada: form.colacionHabilitada,
            cover_habilitado: form.coverHabilitado,
            ...(form.colacionHabilitada && mlColacion !== null ? { ml_colacion: mlColacion } : {}),
            ...(form.colacionHabilitada && acompanamientoColacion
              ? { acompanamiento_colacion: acompanamientoColacion }
              : {}),
            acompanamiento: { unidades: Number(form.unidadesAcompanamiento || 0) }
          };
        const option: SaleOption = {
          tipo,
          precio: pvShot,
          ml_acompanamiento_anfitriona:
            form.mlAcompanamientoAnfitriona === ''
              ? undefined
              : Number(form.mlAcompanamientoAnfitriona),
          comision: 0,
          precios_anfitriona: [
            ...(form.precioShotAnfitriona.trim()
              ? [
                  {
                    precio: pvShotAnfitriona,
                    comision: Number(form.comisionShot.replace(/\./g, ''))
                  }
                ]
              : []),
            ...form.preciosAnfitrionaExtra.map(row => ({
              precio: Number(row.precio.replace(/\./g, '')),
              comision: Number(row.comision.replace(/\./g, ''))
            }))
          ]
        };
        if (Number.isInteger(pvShotAnfitriona) && pvShotAnfitriona > 0) {
          option.precio_anfitriona = pvShotAnfitriona;
        }
        return option;
      });
      const acompanamiento = options.find(option => option.tipo === 'botella')?.acompanamiento;
      if (
        acompanamiento &&
        (!Number.isInteger(acompanamiento.unidades) ||
          acompanamiento.unidades < 0 ||
          acompanamiento.unidades > 1000)
      ) {
        toast.error('Indica entre 0 y 1000 unidades de bebida por botella');
        return;
      }
      const anfitrionaRows =
        options.find(option => option.tipo === 'shot')?.precios_anfitriona ?? [];
      if (form.tipos.includes('shot') && pvShot <= 0 && !anfitrionaRows.length) {
        toast.error('Configura el precio de corto para cliente o anfitriona');
        return;
      }
      if (
        anfitrionaRows.length > 20 ||
        new Set(anfitrionaRows.map(row => row.precio)).size !== anfitrionaRows.length ||
        anfitrionaRows.some(
          row =>
            !Number.isInteger(row.precio) ||
            row.precio <= 0 ||
            row.precio > 2147483647 ||
            !Number.isInteger(row.comision) ||
            row.comision < 0 ||
            row.comision > row.precio
        )
      ) {
        toast.error(
          'Cada precio de corto para anfitriona debe ser positivo y distinto, con comisión entre 0 y su precio'
        );
        return;
      }
      if (
        !options.length ||
        options.some(
          option =>
            !Number.isInteger(option.precio) ||
            option.precio < 0 ||
            option.precio > 2147483647 ||
            (option.precio_anfitriona !== undefined &&
              (!Number.isInteger(option.precio_anfitriona) ||
                option.precio_anfitriona < 0 ||
                option.precio_anfitriona > 2147483647)) ||
            !Number.isInteger(option.comision) ||
            option.comision < 0 ||
            option.comision > 2147483647
        )
      ) {
        toast.error('Selecciona un tipo de venta e indica precios y comisiones válidos');
        return;
      }
    }
    const bottleCommission = options.some(
      option => option.tipo === 'botella' && Number(option.comision) > 0
    );
    const shortCommission = options.some(option =>
      preciosCortoAnfitriona(option).some(row => Number(row.comision) > 0)
    );
    const maxText = form.maxAnfitrionas.trim();
    const maxHostesses = bottleCommission
      ? maxText === ''
        ? null
        : Number(maxText)
      : shortCommission
        ? 1
        : null;
    if (
      bottleCommission &&
      maxHostesses !== null &&
      (!Number.isInteger(maxHostesses) || maxHostesses < 1 || maxHostesses > 20)
    ) {
      toast.error('El máximo de anfitrionas debe ser un entero entre 1 y 20');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      if (
        (bottleCommission || shortCommission) &&
        maxHostesses !== (Number(item.max_anfitrionas) > 0 ? Number(item.max_anfitrionas) : null)
      ) {
        const response = await fetch(`/api/products/${encodeURIComponent(item.producto_id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ max_anfitrionas: maxHostesses })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          toast.error(result.message || 'No se pudo guardar el máximo de anfitrionas');
          return;
        }
      }

      const mlNuevo = form.mlShotCliente.replace(/\D/g, '');
      const mlAnfNuevo = form.mlShotAnfitriona.replace(/\D/g, '');
      const mlActual =
        item.ml_shot !== null && item.ml_shot !== undefined && Number(item.ml_shot) > 0
          ? String(item.ml_shot)
          : '';
      const mlAnfActual =
        item.ml_shot_anfitriona !== null &&
        item.ml_shot_anfitriona !== undefined &&
        Number(item.ml_shot_anfitriona) > 0
          ? String(item.ml_shot_anfitriona)
          : '';
      if (form.shotActivo) {
        if (mlNuevo !== '' && (Number(mlNuevo) < 1 || Number(mlNuevo) > 10000)) {
          toast.error('Los ml por corto deben estar entre 1 y 10000');
          return;
        }
        if (mlAnfNuevo !== '' && (Number(mlAnfNuevo) < 1 || Number(mlAnfNuevo) > 10000)) {
          toast.error('Los ml del corto de anfitriona deben estar entre 1 y 10000');
          return;
        }
        if (mlNuevo !== mlActual || mlAnfNuevo !== mlAnfActual) {
          const mlRes = await fetch(`/api/products/${item.producto_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ml_shot: mlNuevo === '' ? null : Number(mlNuevo),
              ml_shot_anfitriona: mlAnfNuevo === '' ? null : Number(mlAnfNuevo)
            })
          });
          const mlData = await mlRes.json().catch(() => ({}));
          if (!mlRes.ok || !mlData.success) {
            toast.error(mlData.message || 'No se pudieron guardar los ml por corto');
            return;
          }
        }
      }

      if (bottleCommission && maxHostesses !== null && maxHostesses >= 2 && form.tiers.length > 0) {
        const tiersRes = await fetch(`/api/products/${item.producto_id}/tiers`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tiers: form.tiers.map(t => ({
              anfitrionas: t.anfitrionas,
              precio: Number(String(t.precio).replace(/\./g, '')) || 0,
              comision: Number(String(t.comision).replace(/\./g, '')) || 0
            }))
          })
        });
        const tiersData = await tiersRes.json().catch(() => ({}));
        if (!tiersRes.ok || !tiersData.success) {
          toast.error(tiersData.message || 'No se pudo guardar la tabla champagne');
          return;
        }
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: item.producto_id,
          presentacion_id: item.id,
          cantidad: cant,
          opciones_venta: options
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo transferir');
        return;
      }
      toast.success(data.message || 'Transferencia realizada');
      form.reset();
      onOpenChange(false);
      onDone();
    } catch {
      toast.error('Error de red al transferir');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const isSubmitting = () => submitting.current;

  return { saving, handleSubmit, isSubmitting };
}
