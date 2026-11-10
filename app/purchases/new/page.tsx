'use client';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { Button } from '@/components/ui/button';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PurchaseForm, type PurchaseCatalogItem } from '@/components/purchases/PurchaseForm';
import {
  limpiarBorradorCompraReposicion,
  leerBorradorCompraReposicion,
  type CompraPresetReposicion
} from '@/lib/business/replenishmentOrder';

export default function NewPurchasePage() {
  const [catalog, setCatalog] = useState<PurchaseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draftItems, setDraftItems] = useState<CompraPresetReposicion[]>([]);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const data = leerBorradorCompraReposicion();
    if (data.length > 0) {
      setDraftItems(data);
      limpiarBorradorCompraReposicion();
    }
    setDraftReady(true);
  }, []);

  const fetchCatalog = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    try {
      const response = await fetch('/api/purchases/catalog', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !Array.isArray(data.data)) {
        throw new Error(data.message || 'No se pudo cargar el catálogo de productos');
      }

      setCatalog(
        data.data.map((item: Record<string, unknown>) => ({
          id: String(item.id),
          producto_id: String(item.producto_id),
          producto_nombre: String(item.producto_nombre ?? ''),
          categoria_nombre: String(item.categoria_nombre ?? ''),
          codigo_barras: String(item.codigo_barras ?? ''),
          nombre: String(item.nombre ?? ''),
          foto: String(item.foto ?? 'default.png'),
          precio_compra: Number(item.precio_compra ?? 0),
          stock: Number(item.stock ?? 0),
          resumen_stock: (() => {
            const resumen = item.resumen_stock;
            if (!resumen || typeof resumen !== 'object') return undefined;
            const toGroup = (value: unknown) => {
              if (!value || typeof value !== 'object') {
                return { cantidad: 0, codigos: [] as string[] };
              }
              const group = value as { cantidad?: unknown; codigos?: unknown };
              return {
                cantidad: Number(group.cantidad ?? 0),
                codigos: Array.isArray(group.codigos)
                  ? group.codigos.map(codigo => String(codigo))
                  : ([] as string[])
              };
            };
            const typed = resumen as {
              vencidas?: unknown;
              por_vencer?: unknown;
              buen_estado?: unknown;
            };
            return {
              vencidas: toGroup(typed.vencidas),
              por_vencer: toGroup(typed.por_vencer),
              buen_estado: toGroup(typed.buen_estado)
            };
          })()
        }))
      );
    } catch {
      if (!silent) setLoadError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useRealtimeRefresh('/api/purchases/catalog', () => fetchCatalog(true));

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  return (
    <PermissionGuard module='products' action='create'>
      {loading || !draftReady ? (
        <div className='flex min-h-[50vh] items-center justify-center gap-3 text-gray-500'>
          <Loader2 className='h-5 w-5 animate-spin' aria-hidden='true' />
          Cargando productos...
        </div>
      ) : loadError ? (
        <div className='mx-auto max-w-xl space-y-4 p-4 text-center sm:p-6'>
          <p className='text-sm text-red-600'>No se pudo cargar el catálogo de productos.</p>
          <Button type='button' onClick={() => void fetchCatalog()} className='rounded-full px-5'>
            Reintentar
          </Button>
        </div>
      ) : (
        <PurchaseForm catalog={catalog} initialItems={draftItems} />
      )}
    </PermissionGuard>
  );
}
