'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { StockLimitsSchema } from '@/lib/business/stockLimits';
import type { Presentacion } from '@/types/product';
import {
  emptyEditDraft,
  formatNumber,
  getNumericValue,
  type EditPresDraft
} from './productFormFormat';

export function usePresentationEditor({
  productId,
  activeProductIdRef,
  existentes,
  addStock,
  refreshInventario,
  addingStockRef,
  savingPresentationRef
}: {
  productId: string | null;
  activeProductIdRef: React.RefObject<string | null>;
  existentes: Presentacion[];
  addStock: (presentacionId: string, cantidad: number) => Promise<boolean>;
  refreshInventario: () => Promise<void> | void;
  addingStockRef: React.RefObject<boolean>;
  savingPresentationRef: React.RefObject<boolean>;
}) {
  const [editingPresId, setEditingPresId] = useState<string | null>(null);
  const [editPresDraft, setEditPresDraft] = useState<EditPresDraft>(emptyEditDraft);
  const [guardandoPres, setGuardandoPres] = useState<boolean>(false);
  const [codigosSeleccionados, setCodigosSeleccionados] = useState<string[]>([]);

  const startEditPres = useCallback((p: Presentacion) => {
    setEditingPresId(p.id);
    setCodigosSeleccionados([]);
    setEditPresDraft({
      nombre: p.nombre || '',
      codigo_barras: p.codigo_barras || '',
      precio_compra:
        p.precio_compra !== undefined && p.precio_compra !== null
          ? formatNumber(String(p.precio_compra))
          : '',
      precio_venta:
        p.precio_venta !== undefined && p.precio_venta !== null
          ? formatNumber(String(p.precio_venta))
          : '',
      comision:
        p.comision !== undefined && p.comision !== null ? formatNumber(String(p.comision)) : '',
      stock_minimo: p.stock_minimo == null ? '' : String(p.stock_minimo),
      stock_maximo: p.stock_maximo == null ? '' : String(p.stock_maximo),
      stock: p.stock !== undefined && p.stock !== null ? formatNumber(String(p.stock)) : ''
    });
  }, []);

  const cancelEditPres = useCallback(() => {
    setEditingPresId(null);
    setCodigosSeleccionados([]);
    setEditPresDraft(emptyEditDraft());
  }, []);

  const changeEditPresDraft = (field: keyof EditPresDraft, value: string) =>
    setEditPresDraft(prev => ({
      ...prev,
      [field]:
        field === 'precio_compra' ||
        field === 'precio_venta' ||
        field === 'comision' ||
        field === 'stock_minimo' ||
        field === 'stock_maximo'
          ? value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
          : value
    }));

  const toggleCodigoSeleccionado = (unidadId: string) =>
    setCodigosSeleccionados(prev =>
      prev.includes(unidadId) ? prev.filter(id => id !== unidadId) : [...prev, unidadId]
    );

  const saveEditPres = async () => {
    if (
      !StockLimitsSchema.safeParse({
        stock_minimo: getNumericValue(editPresDraft.stock_minimo),
        stock_maximo: getNumericValue(editPresDraft.stock_maximo)
      }).success
    ) {
      toast.error('Indica mínimo y máximo válidos, con máximo mayor o igual al mínimo');
      return;
    }
    if (!editingPresId || savingPresentationRef.current || addingStockRef.current) return;
    if (!editPresDraft.nombre.trim()) {
      toast.error('El nombre de la presentación es requerido');
      return;
    }
    const actual = existentes.find(e => e.id === editingPresId);
    const stockActual = Number(actual?.stock ?? 0);
    const stockDeseadoRaw = getNumericValue(editPresDraft.stock);
    if (stockDeseadoRaw && !/^\d+$/.test(stockDeseadoRaw)) {
      toast.error('Stock debe ser un número entero mayor o igual a 0');
      return;
    }
    const stockDeseado = stockDeseadoRaw ? Number(stockDeseadoRaw) : stockActual;
    const diferencia = stockDeseado - stockActual;
    if (!Number.isSafeInteger(stockDeseado) || stockDeseado < 0 || diferencia > 1000) {
      toast.error('Stock inválido: puedes agregar hasta 1000 unidades por operación');
      return;
    }
    if (diferencia < 0 && codigosSeleccionados.length !== Math.abs(diferencia)) {
      toast.error(
        `Selecciona ${Math.abs(diferencia)} código(s) para desactivar (llevas ${codigosSeleccionados.length})`
      );
      return;
    }
    savingPresentationRef.current = true;
    const registrationKey = crypto.randomUUID();
    setGuardandoPres(true);
    try {
      const res = await fetch('/api/products/presentations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-registration-key': registrationKey
        },
        body: JSON.stringify({
          id: editingPresId,
          stock_minimo: getNumericValue(editPresDraft.stock_minimo) || null,
          stock_maximo: getNumericValue(editPresDraft.stock_maximo) || null,
          nombre: editPresDraft.nombre.trim(),
          codigo_barras: editPresDraft.codigo_barras.trim(),
          precio_compra: getNumericValue(editPresDraft.precio_compra) || '0',
          precio_venta: getNumericValue(editPresDraft.precio_venta) || '0',
          comision: getNumericValue(editPresDraft.comision) || '0'
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        toast.error(result.message || 'No se pudo actualizar la presentación');
        return;
      }
      if (diferencia > 0 && productId) {
        const added = await addStock(editingPresId, diferencia);
        if (!added) {
          await refreshInventario();
          return;
        }
      } else if (diferencia < 0 && productId) {
        const resUni = await fetch('/api/products/units', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producto_id: productId,
            ids: codigosSeleccionados,
            estado: 'inactivo'
          })
        });
        const dataUni = await resUni.json().catch(() => ({}));
        if (!resUni.ok || !dataUni.success) {
          toast.error(dataUni.message || 'No se pudieron desactivar los códigos');
          await refreshInventario();
          return;
        }
        toast.success(`${codigosSeleccionados.length} código(s) desactivados`);
      } else {
        toast.success('Presentación actualizada correctamente');
      }
      if (activeProductIdRef.current !== productId) return;
      cancelEditPres();
      await refreshInventario();
    } catch {
      toast.error('Error de red al actualizar la presentación');
    } finally {
      savingPresentationRef.current = false;
      setGuardandoPres(false);
    }
  };

  return {
    editingPresId,
    editPresDraft,
    guardandoPres,
    codigosSeleccionados,
    startEditPres,
    cancelEditPres,
    changeEditPresDraft,
    toggleCodigoSeleccionado,
    saveEditPres
  };
}
