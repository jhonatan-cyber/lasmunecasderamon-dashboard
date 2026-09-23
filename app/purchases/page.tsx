'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, Search, ShoppingBag } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { PurchaseForm, type PurchaseCatalogItem } from '@/components/purchases/PurchaseForm';
import type { PurchaseRecord } from '@/types/purchase';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';

export default function PurchasesPage() {
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [catalog, setCatalog] = useState<PurchaseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchases', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.data)) setHistory(data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    try {
      // Catálogo de presentaciones (reutiliza stock del bar/transferencias).
      const res = await fetch('/api/transfers', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      const items =
        res.ok && data.success && Array.isArray(data.data?.items) ? data.data.items : [];
      setCatalog(
        items.map((i: any) => ({
          id: String(i.id),
          producto_id: String(i.producto_id),
          producto_nombre: i.producto_nombre,
          nombre: i.nombre,
          precio_compra: Number(i.precio_compra ?? 0),
          stock: Number(i.stock ?? 0)
        }))
      );
    } catch {}
  }, []);

  useEffect(() => {
    void fetchHistory();
    void fetchCatalog();
  }, [fetchHistory, fetchCatalog]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return history;
    return history.filter(
      h =>
        h.folio.toLowerCase().includes(term) ||
        (h.usuario_nombre || '').toLowerCase().includes(term) ||
        (h.proveedor || '').toLowerCase().includes(term) ||
        h.detalles.some(
          d =>
            d.producto_nombre.toLowerCase().includes(term) ||
            d.presentacion_nombre.toLowerCase().includes(term)
        )
    );
  }, [history, search]);

  const totalPeriodo = useMemo(
    () => history.reduce((acc, h) => acc + Number(h.total || 0), 0),
    [history]
  );

  return (
    <PermissionGuard module='products' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2'>
              <ShoppingBag className='w-6 h-6' />
              Compras
            </h1>
            <p className='text-sm sm:text-base text-gray-600'>
              Ingresos de mercadería al almacén ({formatCurrencyCLP(totalPeriodo)} en el listado)
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
            <div className='relative w-full sm:w-72'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Buscar folio, usuario, producto...'
                className='pl-9 rounded-full'
              />
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              className='rounded-full bg-black text-white hover:bg-gray-800 flex items-center gap-2'
            >
              <Plus className='w-4 h-4' />
              Nueva compra
            </Button>
          </div>
        </div>

        <BoneyardSkeleton name='purchases-table' loading={loading}>
          <div className='bg-white dark:bg-slate-900/40 rounded-3xl shadow-md overflow-hidden'>
            <div className='overflow-x-auto'>
              <Table className='min-w-full text-base text-center'>
                <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                  <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                    <TableHead className='w-10' />
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Folio
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Fecha
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Proveedor
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Registró
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Ítems
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow key='empty'>
                      <TableCell
                        colSpan={7}
                        className='text-center py-8 text-gray-400 text-sm sm:text-base bg-white'
                      >
                        {loading ? 'Cargando...' : 'Sin compras registradas.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(h => (
                      <Fragment key={h.id}>
                        <TableRow className='border-b bg-white hover:bg-gray-50 transition-colors'>
                          <TableCell className='py-3 px-2 text-center'>
                            <button
                              type='button'
                              onClick={() => setExpanded(v => (v === h.id ? null : h.id))}
                              className='rounded-full p-1 hover:bg-gray-100'
                              aria-label='Ver detalle'
                            >
                              <ChevronDown
                                className={cn(
                                  'w-4 h-4 transition-transform',
                                  expanded === h.id && 'rotate-180'
                                )}
                              />
                            </button>
                          </TableCell>
                          <TableCell className='py-3 px-2 sm:px-4 font-bold'>{h.folio}</TableCell>
                          <TableCell className='py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap'>
                            {h.fecha_crea
                              ? String(h.fecha_crea).replace('T', ' ').slice(0, 16)
                              : '—'}
                          </TableCell>
                          <TableCell className='py-3 px-2 sm:px-4 text-xs sm:text-sm'>
                            {h.proveedor || '—'}
                            {h.telefono && (
                              <span className='block text-gray-400'>{h.telefono}</span>
                            )}
                          </TableCell>
                          <TableCell className='py-3 px-2 sm:px-4 text-xs sm:text-sm'>
                            {h.usuario_nombre || '—'}
                          </TableCell>
                          <TableCell className='py-3 px-2 sm:px-4'>
                            <Badge className='bg-blue-100 text-blue-700 rounded-full px-3 py-1'>
                              {h.detalles.reduce((acc, d) => acc + Number(d.cantidad || 0), 0)} un.
                            </Badge>
                          </TableCell>
                          <TableCell className='py-3 px-2 sm:px-4 font-mono font-semibold'>
                            {formatCurrencyCLP(Number(h.total || 0))}
                          </TableCell>
                        </TableRow>
                        {expanded === h.id && (
                          <TableRow key={`${h.id}-detail`} className='bg-gray-50'>
                            <TableCell />
                            <TableCell colSpan={6} className='py-3 px-4 text-left'>
                              <div className='space-y-1'>
                                {h.detalles.map(d => (
                                  <p key={d.id} className='text-xs sm:text-sm'>
                                    <span className='font-medium'>
                                      {d.producto_nombre} — {d.presentacion_nombre}
                                    </span>{' '}
                                    <span className='text-gray-500'>
                                      × {d.cantidad} · {formatCurrencyCLP(d.precio_compra)} c/u ={' '}
                                      <span className='font-semibold text-gray-700'>
                                        {formatCurrencyCLP(d.subtotal)}
                                      </span>
                                    </span>
                                  </p>
                                ))}
                                {h.observaciones && (
                                  <p className='text-xs text-gray-400 pt-1'>
                                    Obs: {h.observaciones}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </BoneyardSkeleton>

        <PurchaseForm
          open={modalOpen}
          onOpenChange={setModalOpen}
          catalog={catalog}
          onDone={() => {
            void fetchHistory();
            void fetchCatalog();
          }}
        />
      </div>
    </PermissionGuard>
  );
}
