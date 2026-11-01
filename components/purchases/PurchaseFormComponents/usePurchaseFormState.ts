'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { matchesProductSearch } from '@/lib/utils/productSearch';
import { matchesInventoryQuery } from '@/lib/utils/inventoryQueries';
import { vencimientoCalculado } from '@/lib/business/vencimiento';
import type { PurchaseRegistered } from '@/types/purchase';
import { Line, PurchaseCatalogItem, formatMiles, toNumber } from './types';

export function usePurchaseFormState(
  catalog: PurchaseCatalogItem[],
  initialItems?: { presentacion_id: string; cantidad: number }[]
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const submitting = useRef(false);

  const [step, setStep] = useState<1 | 2 | 3>(initialItems && initialItems.length > 0 ? 2 : 1);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Line[]>(() =>
    (initialItems ?? []).flatMap(item => {
      const catalogItem = catalog.find(entry => entry.id === item.presentacion_id);
      if (!catalogItem) return [];
      return [
        {
          presentacion_id: catalogItem.id,
          producto_id: catalogItem.producto_id,
          producto_nombre: catalogItem.producto_nombre,
          presentacion_nombre: catalogItem.nombre,
          foto: catalogItem.foto,
          cantidad: formatMiles(String(item.cantidad)),
          precio_compra: formatMiles(String(catalogItem.precio_compra ?? 0)),
          fecha_elaboracion: '',
          duracion_meses: '',
          fecha_vencimiento: ''
        }
      ];
    })
  );

  const [proveedor, setProveedor] = useState('');
  const [telefono, setTelefono] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>(
    'efectivo'
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PurchaseRegistered | null>(null);

  useEffect(() => {
    if (initialItems && initialItems.length > 0 && step === 1) {
      const initialLines = initialItems.flatMap(item => {
        const catalogItem = catalog.find(entry => entry.id === item.presentacion_id);
        if (!catalogItem) return [];
        return [
          {
            presentacion_id: catalogItem.id,
            producto_id: catalogItem.producto_id,
            producto_nombre: catalogItem.producto_nombre,
            presentacion_nombre: catalogItem.nombre,
            foto: catalogItem.foto,
            cantidad: formatMiles(String(item.cantidad)),
            precio_compra: formatMiles(String(catalogItem.precio_compra ?? 0)),
            fecha_elaboracion: '',
            duracion_meses: '',
            fecha_vencimiento: ''
          }
        ];
      });

      if (initialLines.length > 0) {
        setLines(initialLines);
        setStep(2);
      }
    }
  }, [initialItems, catalog, step]);

  const total = useMemo(
    () => lines.reduce((acc, l) => acc + toNumber(l.cantidad) * toNumber(l.precio_compra), 0),
    [lines]
  );

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return catalog;
    return catalog.filter(item => matchesProductSearch(item, term));
  }, [catalog, search]);

  const addItem = useCallback(
    (item: PurchaseCatalogItem) => {
      if (lines.some(l => l.presentacion_id === item.id)) {
        toast.info('Esa presentación ya está en la compra');
        return;
      }
      // La verificación también va dentro del setter: dos clics seguidos antes
      // de re-renderizar comparten el mismo closure y agregarían la línea dos
      // veces si solo se validara contra `lines`.
      setLines(prev => {
        if (prev.some(l => l.presentacion_id === item.id)) return prev;
        return [
          ...prev,
          {
            presentacion_id: item.id,
            producto_id: item.producto_id,
            producto_nombre: item.producto_nombre,
            presentacion_nombre: item.nombre,
            foto: item.foto,
            cantidad: '1',
            precio_compra: formatMiles(String(item.precio_compra ?? 0)),
            fecha_elaboracion: '',
            duracion_meses: '',
            fecha_vencimiento: ''
          }
        ];
      });
    },
    [lines]
  );

  const removeItem = useCallback(
    (presentacionId: string) =>
      setLines(prev => prev.filter(line => line.presentacion_id !== presentacionId)),
    []
  );

  const adjustQuantity = useCallback((presentacionId: string, delta: number) => {
    setLines(prev =>
      prev.map(line =>
        line.presentacion_id === presentacionId
          ? {
              ...line,
              cantidad: formatMiles(
                String(Math.min(1000, Math.max(1, toNumber(line.cantidad) + delta)))
              )
            }
          : line
      )
    );
  }, []);

  const changeLineFechas = useCallback(
    (
      presentacionId: string,
      campo: 'fecha_elaboracion' | 'duracion_meses' | 'fecha_vencimiento',
      valor: string
    ) =>
      setLines(prev =>
        prev.map(item => {
          if (item.presentacion_id !== presentacionId) return item;
          const siguiente = {
            ...item,
            [campo]: campo === 'duracion_meses' ? valor.replace(/\D/g, '') : valor
          };
          const calculado = vencimientoCalculado(
            siguiente.fecha_elaboracion,
            siguiente.duracion_meses
          );
          if (campo !== 'fecha_vencimiento' && calculado) siguiente.fecha_vencimiento = calculado;
          return siguiente;
        })
      ),
    []
  );

  const reset = useCallback(() => {
    setLines([]);
    setProveedor('');
    setTelefono('');
    setObservaciones('');
    setMetodoPago('efectivo');
    setStep(1);
    setSearch('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || result || step !== 3) return;
    if (lines.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    const detalles = lines.map(l => ({
      producto_id: l.producto_id,
      presentacion_id: l.presentacion_id,
      cantidad: toNumber(l.cantidad),
      precio_compra: toNumber(l.precio_compra),
      fecha_elaboracion: l.fecha_elaboracion || null,
      duracion_meses: l.duracion_meses ? Number(l.duracion_meses) : null,
      fecha_vencimiento: l.fecha_vencimiento || null
    }));

    const hoy = new Date().toISOString().slice(0, 10);

    for (const d of detalles) {
      if (!Number.isInteger(d.cantidad) || d.cantidad < 1 || d.cantidad > 1000) {
        toast.error('Cantidad inválida en uno de los productos');
        return;
      }
      if (!Number.isInteger(d.precio_compra) || d.precio_compra < 0) {
        toast.error('Precio inválido en uno de los productos');
        return;
      }
      if (d.fecha_elaboracion && d.fecha_elaboracion > hoy) {
        toast.error('La fecha de elaboración no puede ser futura');
        return;
      }
      if (d.fecha_vencimiento && d.fecha_vencimiento < hoy) {
        toast.error('La fecha de vencimiento no puede ser anterior a hoy');
        return;
      }
    }

    submitting.current = true;
    setSaving(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detalles,
          proveedor: proveedor.trim() || null,
          telefono: telefono.trim() || null,
          observaciones: observaciones.trim() || null,
          metodo_pago: metodoPago
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo registrar la compra');
        return;
      }
      toast.success(data.message || 'Compra registrada');
      reset();
      setResult(data.data as PurchaseRegistered);
      void queryClient.invalidateQueries({
        predicate: query => matchesInventoryQuery(query.queryKey)
      });
    } catch {
      toast.error('Error de red al registrar');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return {
    step,
    setStep,
    search,
    setSearch,
    lines,
    setLines,
    proveedor,
    setProveedor,
    telefono,
    setTelefono,
    observaciones,
    setObservaciones,
    metodoPago,
    setMetodoPago,
    saving,
    result,
    total,
    filteredCatalog,
    addItem,
    removeItem,
    adjustQuantity,
    changeLineFechas,
    handleSubmit
  };
}
