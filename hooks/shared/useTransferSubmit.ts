'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { isSimpleProduct } from '@/components/orders/productModalRules';
import type { TransferForm } from '@/hooks/shared/useTransferForm';
import type { SaleOption } from '@/types/sale-options';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';

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
        if (option.tipo === 'shot' && reutilizada.precio > 0) {
          reutilizada.precio_anfitriona = reutilizada.precio;
        }
        return reutilizada;
      });
    } else {
      const pv = Number(form.precioVenta.replace(/\./g, ''));
      const com = form.comision.trim() === '' ? 0 : Number(form.comision.replace(/\./g, ''));
      // Precio único del shot: rige para cliente y anfitriona (se guarda en ambos
      // campos para que la venta siga ofreciendo el "shot anfitriona" con comisión).
      const pvShot = Number(form.precioShot.replace(/\./g, ''));
      options = form.tipos.map(tipo => {
        if (tipo === 'botella') return { tipo, precio: pv, comision: com };
        const option: SaleOption = {
          tipo,
          precio: pvShot,
          comision: Number(form.comisionShot.replace(/\./g, ''))
        };
        if (Number.isInteger(pvShot) && pvShot > 0) {
          option.precio_anfitriona = pvShot;
        }
        return option;
      });
      if (
        !options.length ||
        options.some(
          option =>
            !Number.isInteger(option.precio) ||
            option.precio < 0 ||
            option.precio > 2147483647 ||
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
          toast.error('Los ml por shot deben estar entre 1 y 10000');
          return;
        }
        if (mlAnfNuevo !== '' && (Number(mlAnfNuevo) < 1 || Number(mlAnfNuevo) > 10000)) {
          toast.error('Los ml del shot de anfitriona deben estar entre 1 y 10000');
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
            toast.error(mlData.message || 'No se pudieron guardar los ml por shot');
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
