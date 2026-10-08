'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PurchaseForm, type PurchaseCatalogItem } from '@/components/purchases/PurchaseForm';

export default function NewPurchasePage() {
  const [catalog, setCatalog] = useState<PurchaseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch('/api/transfers', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !Array.isArray(data.data?.items)) {
        throw new Error(data.message || 'No se pudo cargar el catálogo de productos');
      }

      setCatalog(
        data.data.items.map((item: Record<string, unknown>) => ({
          id: String(item.id),
          producto_id: String(item.producto_id),
          producto_nombre: String(item.producto_nombre ?? ''),
          nombre: String(item.nombre ?? ''),
          precio_compra: Number(item.precio_compra ?? 0),
          stock: Number(item.stock ?? 0)
        }))
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

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
          <button
            type='button'
            onClick={() => void fetchCatalog()}
            className='rounded-full border px-5 py-2 text-sm font-medium hover:bg-gray-50'
          >
            Reintentar
          </button>
        </div>
      ) : (
        <PurchaseForm catalog={catalog} />
      )}
    </PermissionGuard>
  );
}
