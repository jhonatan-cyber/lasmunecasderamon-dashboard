'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Presentacion } from '@/types/product';
import logger from '@/lib/utils/logger';
import { getNumericValue, validarArchivoFoto } from './productFormFormat';
import type { UnidadCodigoItem } from './productFormTypes';

export function useProductInventory({
  productId,
  activeProductIdRef,
  addingStockRef,
  savingPresentationRef
}: {
  productId: string | null;
  activeProductIdRef: React.RefObject<string | null>;
  addingStockRef: React.RefObject<boolean>;
  savingPresentationRef: React.RefObject<boolean>;
}) {
  const queryClient = useQueryClient();
  const [existentes, setExistentes] = useState<Presentacion[]>([]);
  const [unidadesTotal, setUnidadesTotal] = useState<number>(0);
  const [unidadesInactivas, setUnidadesInactivas] = useState<number>(0);
  const [unidadesCodigos, setUnidadesCodigos] = useState<UnidadCodigoItem[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState<boolean>(false);
  const [stockExtra, setStockExtra] = useState<Record<string, string>>({});
  const [agregandoStock, setAgregandoStock] = useState<boolean>(false);
  const inventoryRequest = useRef<AbortController | null>(null);

  const fetchInventario = useCallback(
    async (productoId: string) => {
      if (activeProductIdRef.current !== productoId) return;
      inventoryRequest.current?.abort();
      const controller = new AbortController();
      inventoryRequest.current = controller;
      setCargandoInventario(true);
      try {
        const [presRes, uniRes] = await Promise.all([
          fetch(`/api/products/presentations?producto_id=${encodeURIComponent(productoId)}`, {
            signal: controller.signal
          }),
          fetch(`/api/products/units?producto_id=${encodeURIComponent(productoId)}`, {
            signal: controller.signal
          })
        ]);
        const presData = await presRes.json().catch(() => ({}));
        const uniData = await uniRes.json().catch(() => ({}));
        if (controller.signal.aborted) return;
        if (!presRes.ok || !uniRes.ok || !presData.success || !uniData.success)
          throw new Error(presData.message || uniData.message || 'No se pudo cargar el inventario');
        if (Array.isArray(presData.data)) {
          setExistentes(presData.data);
          await queryClient.invalidateQueries({ queryKey: ['product-presentations'] });
        }
        if (controller.signal.aborted) return;
        if (uniData.success && uniData.data) {
          setUnidadesTotal(Number(uniData.data.total ?? 0));
          setUnidadesInactivas(Number(uniData.data.inactivas ?? 0));
          setUnidadesCodigos(
            Array.isArray(uniData.data.unidades)
              ? uniData.data.unidades.map((u: any) => ({
                  id: String(u.id),
                  codigo: String(u.codigo),
                  codigo_barras: u.codigo_barras ? String(u.codigo_barras) : null,
                  compra_folio: u.compra_folio ?? null,
                  fecha_crea: u.fecha_crea ?? null,
                  fecha_impresion: u.fecha_impresion ?? null,
                  presentacion_id: u.presentacion_id ?? null,
                  estado: u.estado || 'almacen'
                }))
              : []
          );
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.warn('[useProductForm] No se pudo cargar inventario del producto', err);
        toast.error(err instanceof Error ? err.message : 'No se pudo cargar el inventario');
      } finally {
        if (!controller.signal.aborted) setCargandoInventario(false);
      }
    },
    [queryClient, activeProductIdRef]
  );

  const resetInventario = useCallback(() => {
    setCargandoInventario(false);
    setExistentes([]);
    setUnidadesTotal(0);
    setUnidadesInactivas(0);
    setUnidadesCodigos([]);
  }, []);

  const abortarInventario = useCallback(() => {
    inventoryRequest.current?.abort();
  }, []);

  const refreshInventario = useCallback(() => {
    if (productId) void fetchInventario(productId);
  }, [productId, fetchInventario]);

  const changeStockExtra = (presentacionId: string, value: string) =>
    setStockExtra(prev => ({
      ...prev,
      [presentacionId]: value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }));

  const agregarStockCantidad = async (
    presentacionId: string,
    cantidad: number
  ): Promise<boolean> => {
    if (!productId || addingStockRef.current) return false;
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 1000) {
      toast.error('Indica una cantidad entre 1 y 1000');
      return false;
    }
    addingStockRef.current = true;
    setAgregandoStock(true);
    try {
      const res = await fetch('/api/products/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productId,
          presentacion_id: presentacionId,
          cantidad
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo agregar stock');
        return false;
      }
      toast.success(data.message || `${cantidad} códigos generados`);
      return true;
    } catch {
      toast.error('Error de red al agregar stock');
      return false;
    } finally {
      addingStockRef.current = false;
      setAgregandoStock(false);
    }
  };

  const agregarStock = async (presentacionId: string) => {
    if (savingPresentationRef.current) return;
    const cantidad = Number(getNumericValue(stockExtra[presentacionId] || ''));
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 1000) {
      toast.error('Indica una cantidad entre 1 y 1000');
      return;
    }
    if (!productId) return;
    const ok = await agregarStockCantidad(presentacionId, cantidad);
    if (ok) {
      setStockExtra(prev => ({ ...prev, [presentacionId]: '' }));
      await fetchInventario(productId);
    }
  };

  const updateExistenteFoto = async (id: string, file: File) => {
    const problema = validarArchivoFoto(file);
    if (problema === 'tipo') {
      toast.error('Solo se permiten imágenes JPG, PNG, GIF o WEBP');
      return;
    }
    if (problema === 'tamano') {
      toast.error('La imagen no puede superar los 5MB');
      return;
    }
    const data = new FormData();
    data.append('id', id);
    data.append('foto', file);
    try {
      const res = await fetch('/api/products/presentations', { method: 'PATCH', body: data });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        toast.error(result.message || 'No se pudo actualizar la foto');
        return;
      }
      toast.success('Foto actualizada correctamente');
      if (productId) await fetchInventario(productId);
    } catch {
      toast.error('Error de red al actualizar la foto');
    }
  };

  const updateExistenteFotoUrl = async (id: string, url: string) => {
    const clean = url.trim();
    if (!clean) {
      toast.error('Pega la URL de la imagen');
      return;
    }
    try {
      const res = await fetch('/api/products/presentations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, foto: clean })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        toast.error(result.message || 'No se pudo actualizar la foto');
        return;
      }
      toast.success('Foto actualizada correctamente');
      if (productId) await fetchInventario(productId);
    } catch {
      toast.error('Error de red al actualizar la foto');
    }
  };

  const deleteExistente = async (id: string) => {
    const pres = existentes.find(e => e.id === id);
    if (pres && (pres.stock ?? 0) > 0) {
      toast.error(
        `No se puede eliminar: esta presentación tiene ${pres.stock} unidades con códigos generados`
      );
      return;
    }
    try {
      const response = await fetch(`/api/products/presentations?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success)
        throw new Error(
          result.message || result.error?.message || 'Error al eliminar presentación'
        );
      toast.success('Presentación eliminada correctamente');
      if (productId) await fetchInventario(productId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar presentación');
    }
  };

  return {
    existentes,
    unidadesTotal,
    unidadesInactivas,
    unidadesCodigos,
    cargandoInventario,
    stockExtra,
    agregandoStock,
    fetchInventario,
    refreshInventario,
    resetInventario,
    abortarInventario,
    changeStockExtra,
    agregarStock,
    agregarStockCantidad,
    updateExistenteFoto,
    updateExistenteFotoUrl,
    deleteExistente
  };
}
