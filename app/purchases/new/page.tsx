'use client';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { Button } from '@/components/ui/button';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PurchaseForm, type PurchaseCatalogItem } from '@/components/purchases/PurchaseForm';
import { PURCHASE_BUTTON_CLASS } from '@/components/purchases/buttonStyles';

export default function NewPurchasePage() {
  const [catalog, setCatalog] = useState<PurchaseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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
          stock: Number(item.stock ?? 0)
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
      {loading ? (
        <div className='flex min-h-[50vh] items-center justify-center gap-3 text-gray-500'>
          <Loader2 className='h-5 w-5 animate-spin' aria-hidden='true' />
          Cargando productos...
        </div>
      ) : loadError ? (
        <div className='mx-auto max-w-xl space-y-4 p-6 text-center'>
          <p className='text-sm text-red-600'>No se pudo cargar el catálogo de productos.</p>
          <Button
            variant='unstyled'
            type='button'
            onClick={() => void fetchCatalog()}
            className={`${PURCHASE_BUTTON_CLASS} px-5 py-2 text-sm font-medium`}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <PurchaseForm catalog={catalog} />
      )}
    </PermissionGuard>
  );
}
