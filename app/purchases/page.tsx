'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { ReplenishmentNotice } from '@/components/purchases/ReplenishmentNotice';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import type { PurchaseRecord } from '@/types/purchase';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import { PURCHASE_BUTTON_CLASS } from '@/components/purchases/buttonStyles';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import { SortSelect } from '@/components/shared/selects/SortSelect';

const SORT_OPTIONS = [
  { value: 'date', label: 'Fecha' },
  { value: 'total', label: 'Total' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'folio', label: 'Folio' }
];
const PAGE_SIZES = [5, 10, 20, 40];
const PAGE_SIZE_STORAGE_KEY = 'purchases:page-size';
const SORT_STORAGE_KEY = 'purchases:sort-by';

export default function PurchasesPage() {
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('date-desc');
  // El token guarda campo y dirección; el select compartido los separa.
  const [sortField, sortDirection = 'asc'] = sortBy.split('-');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedPageSize = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
      const savedSort = window.localStorage.getItem(SORT_STORAGE_KEY);
      if (PAGE_SIZES.includes(savedPageSize)) setPageSize(savedPageSize);
      if (savedSort) {
        // Preferencias del formato anterior sin dirección ('supplier', 'folio').
        const token =
          savedSort.endsWith('-asc') || savedSort.endsWith('-desc')
            ? savedSort
            : `${savedSort}-asc`;
        if (SORT_OPTIONS.some(option => option.value === token.split('-')[0])) setSortBy(token);
      }
    } catch {
      // El listado funciona también cuando el navegador bloquea el almacenamiento.
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
      window.localStorage.setItem(SORT_STORAGE_KEY, sortBy);
    } catch {
      // Con almacenamiento bloqueado, las preferencias duran mientras se muestra el módulo.
    }
  }, [pageSize, sortBy, preferencesLoaded]);

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

  useRealtimeRefresh('/api/purchases', fetchHistory);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const compareText = (a: string, b: string) =>
          a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
        const dateOrder = compareText(String(a.fecha_crea || ''), String(b.fecha_crea || ''));
        const ascendente = sortDirection === 'asc';
        let order = 0;
        switch (sortField) {
          case 'total':
            order = ascendente
              ? Number(a.total || 0) - Number(b.total || 0)
              : Number(b.total || 0) - Number(a.total || 0);
            break;
          case 'supplier': {
            const porTexto = compareText(a.proveedor || '', b.proveedor || '');
            order = ascendente ? porTexto : -porTexto;
            break;
          }
          case 'folio': {
            const porTexto = compareText(a.folio, b.folio);
            order = ascendente ? porTexto : -porTexto;
            break;
          }
          default:
            order = ascendente ? dateOrder : -dateOrder;
        }
        return order || compareText(a.id, b.id);
      }),
    [filtered, sortField, sortDirection]
  );
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    setPage(current => Math.min(current, totalPages));
  }, [totalPages]);

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
              Ingresos de mercadería a la bodega ({formatCurrencyCLP(totalPeriodo)} en el listado)
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
            <PermissionGuard module='products' action='create' fallback={null}>
              <Button asChild className={`${PURCHASE_BUTTON_CLASS} flex items-center gap-2`}>
                <Link href='/purchases/new'>
                  <Plus className='w-4 h-4' />
                  Nueva compra
                </Link>
              </Button>
            </PermissionGuard>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3'>
          <div className='relative w-full sm:w-72'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
            <Input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
                setExpanded(null);
              }}
              placeholder='Buscar folio, usuario, producto...'
              className='pl-9 rounded-full'
            />
          </div>
          <div className='flex flex-wrap items-end gap-3'>
            <SortSelect
              id='purchase-sort'
              field={sortField}
              direction={sortDirection === 'desc' ? 'desc' : 'asc'}
              options={SORT_OPTIONS}
              onChange={(field, direction) => {
                setSortBy(`${field}-${direction}`);
                setPage(1);
                setExpanded(null);
              }}
              className='w-full sm:w-52'
            />
            <SelectElements
              value={pageSize}
              onChange={value => {
                setPageSize(value);
                setPage(1);
                setExpanded(null);
              }}
              options={PAGE_SIZES}
              label='Por página'
            />
            <ReplenishmentNotice compact />
          </div>
        </div>

        <BoneyardSkeleton name='purchases-table' loading={loading}>
          <div className='bg-white dark:bg-slate-900/40 rounded-3xl shadow-md overflow-hidden'>
            <div className='overflow-x-auto'>
              <Table className='min-w-full text-center'>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='w-10' />
                    <TableHead>Folio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Registró</TableHead>
                    <TableHead>Ítems</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow key='empty'>
                      <TableCell colSpan={7} className='text-center sm:text-base bg-white'>
                        <EmptyState
                          variant='text'
                          title={loading ? 'Cargando...' : 'Sin compras registradas.'}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map(h => (
                      <Fragment key={h.id}>
                        <TableRow className='border-b transition-colors'>
                          <TableCell className='text-center'>
                            <Button
                              variant='unstyled'
                              type='button'
                              onClick={() => setExpanded(v => (v === h.id ? null : h.id))}
                              className={`${PURCHASE_BUTTON_CLASS} p-1`}
                              aria-label='Ver detalle'
                            >
                              <ChevronDown
                                className={cn(
                                  'w-4 h-4 transition-transform',
                                  expanded === h.id && 'rotate-180'
                                )}
                              />
                            </Button>
                          </TableCell>
                          <TableCell className='sm:px-4 font-bold'>{h.folio}</TableCell>
                          <TableCell className='sm:px-4 sm:text-sm whitespace-nowrap'>
                            {h.fecha_crea
                              ? String(h.fecha_crea).replace('T', ' ').slice(0, 16)
                              : '—'}
                          </TableCell>
                          <TableCell className='sm:px-4 sm:text-sm'>
                            {h.proveedor || '—'}
                            {h.telefono && (
                              <span className='block text-gray-400'>{h.telefono}</span>
                            )}
                          </TableCell>
                          <TableCell className='sm:px-4 sm:text-sm'>
                            {h.usuario_nombre || '—'}
                          </TableCell>
                          <TableCell className='sm:px-4'>
                            <Badge className='bg-blue-100 text-blue-700 rounded-full px-3 py-1'>
                              {h.detalles.reduce((acc, d) => acc + Number(d.cantidad || 0), 0)} un.
                            </Badge>
                          </TableCell>
                          <TableCell className='sm:px-4 font-mono font-semibold'>
                            {formatCurrencyCLP(Number(h.total || 0))}
                          </TableCell>
                        </TableRow>
                        {expanded === h.id && (
                          <TableRow key={`${h.id}-detail`}>
                            <TableCell />
                            <TableCell colSpan={6} className='text-left'>
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
        {!loading && filtered.length > 0 && (
          <div className='flex justify-center'>
            <Paginate
              page={currentPage}
              totalPages={totalPages}
              setPage={value => {
                setPage(value);
                setExpanded(null);
              }}
            />
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
