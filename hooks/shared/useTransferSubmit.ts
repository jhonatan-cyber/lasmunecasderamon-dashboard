'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { isSimpleProduct } from '@/components/orders/productModalRules';
import type { TransferForm } from '@/hooks/shared/useTransferForm';
import type { SaleOption } from '@/types/sale-options';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';

/**
 * Envío del traspaso: valida la cantidad, (opcionalmente) reescribe los ml por
 * shot y la tabla champagne del producto y finalmente hace el POST al backend.
 * Extraído de `TransferModal.tsx` — misma secuencia y mismos mensajes.
 */
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
  // Bloquea el cierre del modal mientras hay un envío en vuelo (mismo guard que
  // tenía el modal monolítico): el ref vive aquí, con el dueño de `setSaving`.
  const submitting = useRef(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item || submitting.current) return;
    const cant = Number(form.cantidad.replace(/\./g, ''));
    if (!Number.isInteger(cant) || cant < 1 || cant > Math.min(form.disponible, 1000)) {
      toast.error(`Cantidad debe estar entre 1 y ${Math.min(form.disponible, 1000)}`);
      return;
    }
    // Con configuración existente se reutiliza precio, comisión y anfitrionas sin pedirlos.
    let options: SaleOption[];
    if (form.usarConfigGuardada) {
      options = form.opcionesGuardadas.map(option => {
        const reutilizada: SaleOption = {
          tipo: option.tipo,
          precio: Number(option.precio ?? 0),
          comision: Number(option.comision ?? 0)
        };
        if (option.tipo === 'botella' && option.acompanamiento)
          reutilizada.acompanamiento = { ...option.acompanamiento };
        if (option.tipo === 'shot' && reutilizada.precio > 0) {
          reutilizada.precio_anfitriona = Number(option.precio_anfitriona ?? reutilizada.precio);
          reutilizada.precios_anfitriona = preciosCortoAnfitriona(option);
          reutilizada.comision = 0;
        }
        return reutilizada;
      });
    } else {
      const pv = Number(form.precioVenta.replace(/\./g, ''));
      const com = form.comision.trim() === '' ? 0 : Number(form.comision.replace(/\./g, ''));
      const pvShot = Number(form.precioShot.replace(/\./g, ''));
      const pvShotAnfitriona =
        form.precioShotAnfitriona.trim() === ''
          ? pvShot
          : Number(form.precioShotAnfitriona.replace(/\./g, ''));
      options = form.tipos.map(tipo => {
        if (tipo === 'botella')
          return {
            tipo,
            precio: pv,
            comision: com,
            ...(form.acompanamientoBotella !== 'ninguno'
              ? {
                  acompanamiento: {
                    tipo: form.acompanamientoBotella,
                    unidades: Number(form.unidadesAcompanamiento)
                  }
                }
              : {})
          };
        const option: SaleOption = {
          tipo,
          precio: pvShot,
          comision: 0,
          precios_anfitriona: [
            { precio: pvShotAnfitriona, comision: Number(form.comisionShot.replace(/\./g, '')) },
            ...form.preciosAnfitrionaExtra.map(row => ({
              precio: Number(row.precio.replace(/\./g, '')),
              comision: Number(row.comision.replace(/\./g, ''))
            }))
          ]
        };
        if (Number.isInteger(pvShot) && pvShot > 0) {
          option.precio_anfitriona = pvShotAnfitriona;
        }
        return option;
      });
      const acompanamiento = options.find(option => option.tipo === 'botella')?.acompanamiento;
      if (
        acompanamiento &&
        (!Number.isInteger(acompanamiento.unidades) ||
          acompanamiento.unidades < 1 ||
          acompanamiento.unidades > 1000)
      ) {
        toast.error('Indica entre 1 y 1000 unidades de acompañamiento por botella');
        return;
      }
      const anfitrionaRows =
        options.find(option => option.tipo === 'shot')?.precios_anfitriona ?? [];
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
    // Venta simple (Ajustes → Comisiones): la botella no lleva comisión.
    options = options.map(option =>
      option.tipo === 'botella' && isSimpleProduct(option.precio)
        ? { ...option, comision: 0 }
        : option
    );
    submitting.current = true;
    setSaving(true);
    try {
      // Ml por shot: se guardan en el producto si cambiaron, solo con el shot activo
      // (vacío anfitriona = igual que cliente; vacío cliente = valor global).
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
      // Solo se reescribe la tabla de anfitrionas si el usuario editó precios manualmente.
      if (form.esChampagneItem && form.tiers.length > 0 && !form.usarConfigGuardada) {
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
        toast.error(data.message || 'No se pudo traspasar');
        return;
      }
      toast.success(data.message || 'Traspaso realizado');
      form.reset();
      onOpenChange(false);
      onDone();
    } catch {
      toast.error('Error de red al traspasar');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  /** `true` mientras el POST está en vuelo (el modal no debe poder cerrarse). */
  const isSubmitting = () => submitting.current;

  return { saving, handleSubmit, isSubmitting };
}
