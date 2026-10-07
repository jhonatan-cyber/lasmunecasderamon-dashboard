'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { InteractiveProductPhoto } from '@/components/shared/InteractiveProductPhoto';
import { StaggeredEntrance } from '@/components/shared/StaggeredEntrance';
import { ArrowRight, ArrowRightLeft, Check, Clock, Loader2, RefreshCw, X } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRefreshOnFocus, useSharedSSE } from '@/hooks/shared';
import { TransferModal, type BarStockItem } from '@/components/bar/TransferModal';
import { SalePrices } from '@/components/bar/SalePrices';
import { BarAnfitrionas, isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SelectElements from '@/components/shared/SelectElements';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import type { TransferRecord } from '@/types/transfer';

function TransferPhoto({ item }: { item: BarStockItem }) {
  const [failed, setFailed] = useState<string[]>([]);
  const photos = [item.foto, item.producto_foto].filter(
    (photo): photo is string => !!photo && photo !== 'default.png'
  );
  const photo = photos.find(value => !failed.includes(value));
  const src = photo
    ? photo.startsWith('http') || photo.startsWith('/')
      ? photo
      : `/api/images/products/${encodeURIComponent(photo)}`
    : '/img/products/default.png';

  return (
    <InteractiveProductPhoto
      src={src}
      alt={`${item.producto_nombre} — ${item.nombre}`}
      containerClassName='relative aspect-square w-full shrink-0 overflow-hidden rounded-xl sm:aspect-4/3'
      photoClassName='object-contain p-3'
      onError={photo ? () => setFailed(previous => [...previous, photo]) : undefined}
    />
  );
}

const PAGE_SIZE_OPTIONS = [12, 24, 36, 48];
const PAGE_SIZE_LABEL = 'POR PÁGINA';

function buildPageItems(current: number, total: number): Array<number | 'left' | 'right'> {
  const items: Array<number | 'left' | 'right'> = [];
  if (total <= 7) {
    for (let index = 1; index <= total; index += 1) items.push(index);
    return items;
  }
  items.push(1);
  if (current > 3) items.push('left');
  for (
    let index = Math.max(2, current - 1);
    index <= Math.min(total - 1, current + 1);
    index += 1
  ) {
    items.push(index);
  }
  if (current < total - 2) items.push('right');
  items.push(total);
  return items;
}

interface TransferPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label: string;
}

function TransferPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  label
}: TransferPaginationProps) {
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <div className='mt-2 flex flex-col items-center gap-3'>
      <p aria-live='polite' className='text-xs text-muted-foreground'>
        Mostrando {start + 1}–{Math.min(start + pageSize, totalItems)} de {totalItems}
      </p>
      <Pagination aria-label={label}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href='#'
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
              onClick={event => {
                event.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
            />
          </PaginationItem>
          {pageItems.map(item =>
            typeof item === 'number' ? (
              <PaginationItem key={`page-${item}`}>
                <PaginationLink
                  href='#'
                  isActive={item === currentPage}
                  onClick={event => {
                    event.preventDefault();
                    onPageChange(item);
                  }}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationEllipsis />
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              href='#'
              aria-disabled={currentPage === totalPages}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
              onClick={event => {
                event.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export default function TransfersPage() {
  return (
    <PermissionGuard module='products' action='view'>
      <TransfersContent />
    </PermissionGuard>
  );
}

function TransfersContent() {
  const [items, setItems] = useState<BarStockItem[]>([]);
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('products');
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(12);
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(12);
  const [historyPage, setHistoryPage] = useState(1);
  const [selected, setSelected] = useState<BarStockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const puedeAprobar = ['barman'].includes((user?.role || '').toLowerCase());

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    // En silencio (SSE o foco de la pestaña) no se oculta la lista: solo se repintan los datos.
    if (!options?.silent) setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/transfers', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudieron cargar las transferencias.');
      setItems(result.data.items);
      setHistory(result.data.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // En vivo: cuando otra sesión crea una transferencia o el Barman la aprueba/rechaza,
  // el listado se actualiza sin recargar. El foco de la pestaña cubre eventos perdidos.
  const refreshSilencioso = useCallback(() => void refresh({ silent: true }), [refresh]);
  useSharedSSE('/api/notifications/sse', payload => {
    if (payload?.type === 'transfers_updated') refreshSilencioso();
  });
  useRefreshOnFocus(refreshSilencioso, { immediate: false });

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return items.filter(item =>
      [item.producto_nombre, item.producto_codigo, item.nombre, item.codigo_barras].some(value =>
        value?.toLocaleLowerCase('es').includes(term)
      )
    );
  }, [items, search]);

  const pendientes = useMemo(() => history.filter(h => h.estado === 'pendiente'), [history]);
  const historial = useMemo(() => history.filter(h => h.estado !== 'pendiente'), [history]);

  const resolver = useCallback(
    async (id: string, accion: 'aprobar' | 'rechazar') => {
      setResolvingId(id);
      try {
        const response = await fetch('/api/transfers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, accion })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'No se pudo resolver la solicitud.');
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de conexión. Intenta nuevamente.');
      } finally {
        setResolvingId(null);
      }
    },
    [refresh]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleItems = filtered.slice(pageStart, pageStart + pageSize);

  const pendingTotalPages = Math.max(1, Math.ceil(pendientes.length / pendingPageSize));
  const pendingCurrentPage = Math.min(pendingPage, pendingTotalPages);
  const pendingStart = (pendingCurrentPage - 1) * pendingPageSize;
  const visiblePendientes = pendientes.slice(pendingStart, pendingStart + pendingPageSize);

  const historyTotalPages = Math.max(1, Math.ceil(historial.length / historyPageSize));
  const historyCurrentPage = Math.min(historyPage, historyTotalPages);
  const historyStart = (historyCurrentPage - 1) * historyPageSize;
  const visibleHistory = historial.slice(historyStart, historyStart + historyPageSize);

  return (
    <main className='flex flex-col gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-3xl font-bold tracking-tight'>Transferencia</h1>
          <p className='text-sm text-muted-foreground'>
            Selecciona una presentación y la cantidad que enviarás al bar.
          </p>
        </div>
      </header>

      {error && (
        <Alert variant='destructive' role='alert'>
          <AlertTitle>No se pudo actualizar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab} className='flex flex-col gap-4'>
        <TabsList
          aria-label='Listados de transferencias'
          className='mx-auto grid h-auto w-full shrink-0 grid-cols-3 rounded-full sm:w-fit'
        >
          <TabsTrigger value='products' className='rounded-full'>
            Productos
          </TabsTrigger>
          <TabsTrigger value='pending' className='rounded-full whitespace-normal text-center'>
            Pendientes{pendientes.length > 0 ? ` (${pendientes.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value='history' className='rounded-full whitespace-normal text-center'>
            Historial de transferencias
          </TabsTrigger>
        </TabsList>
        <TabsContent value='products'>
          <section aria-labelledby='presentations-title' className='flex flex-col gap-4'>
            <div className='flex flex-wrap items-end justify-between gap-3'>
              <div className='flex flex-col gap-1'>
                <h2 id='presentations-title' className='text-lg font-semibold'>
                  Presentaciones disponibles
                </h2>
                <p className='text-sm text-muted-foreground'>
                  Consulta el stock en almacén y en bar antes de transferir.
                </p>
              </div>
              <div className='flex min-w-0 flex-1 flex-wrap items-end gap-3 sm:flex-none sm:justify-end'>
                <Input
                  aria-label='Buscar producto, presentación o código'
                  placeholder='Buscar producto, presentación o código'
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className='h-10 min-w-0 flex-1 rounded-full sm:w-64 sm:flex-none'
                />
                <div className='shrink-0'>
                  <SelectElements
                    value={pageSize}
                    onChange={setPageSize}
                    setPage={setPage}
                    options={PAGE_SIZE_OPTIONS}
                    label={PAGE_SIZE_LABEL}
                  />
                </div>
              </div>
            </div>
            {loading ? (
              <p role='status' className='py-10 text-center text-muted-foreground'>
                Cargando existencias…
              </p>
            ) : (
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
                {filtered.length === 0 ? (
                  <p className='col-span-full rounded-2xl border border-dashed py-12 text-center text-muted-foreground'>
                    {search
                      ? 'No hay coincidencias para esta búsqueda.'
                      : 'Registra productos y presentaciones en Almacén para comenzar.'}
                  </p>
                ) : (
                  visibleItems.map((item, index) => (
                    <StaggeredEntrance key={item.id} index={index} className='h-full'>
                      <Card className='flex h-full min-w-0 flex-col rounded-2xl'>
                        <CardHeader className='flex-row items-start justify-between gap-2 space-y-0 p-3 pb-2'>
                          <CardTitle
                            className='min-w-0 flex-1 line-clamp-2 text-sm leading-5'
                            title={item.producto_nombre}
                          >
                            {item.producto_nombre}
                          </CardTitle>
                          <Badge
                            variant='secondary'
                            className='max-w-[45%] shrink-0 whitespace-normal break-words'
                          >
                            {item.nombre}
                          </Badge>
                        </CardHeader>
                        <CardContent className='flex flex-1 flex-col gap-2 px-3 pb-3'>
                          <CardDescription className='text-xs break-words'>
                            Categoría: {item.categoria_nombre?.trim() || 'Sin categoría'}
                          </CardDescription>
                          <TransferPhoto item={item} />
                          <CardDescription
                            className='truncate text-center text-xs'
                            title={item.codigo_barras || item.producto_codigo}
                          >
                            Código: {item.codigo_barras || item.producto_codigo || 'Sin código'}
                          </CardDescription>
                          <dl className='mt-auto grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2 text-center'>
                            <div>
                              <dt className='text-xs text-muted-foreground'>Almacén</dt>
                              <dd className='text-base font-semibold tabular-nums'>{item.stock}</dd>
                            </div>
                            <div>
                              <dt className='text-xs text-muted-foreground'>Bar</dt>
                              <dd className='text-base font-semibold tabular-nums'>
                                {item.stock_bar ?? 0}
                              </dd>
                            </div>
                          </dl>
                        </CardContent>
                        <CardFooter className='px-3 pb-3'>
                          <PermissionGuard
                            module='products'
                            action='accept_transfer'
                            fallback={
                              <span className='text-sm text-muted-foreground'>Solo consulta</span>
                            }
                          >
                            <Button
                              variant='outline'
                              className='w-full gap-1 rounded-full px-2 text-xs'
                              disabled={item.stock < 1 || !!error}
                              onClick={() => setSelected(item)}
                              aria-label={['Transferir', item.producto_nombre, item.nombre].join(
                                ' '
                              )}
                            >
                              <ArrowRightLeft aria-hidden='true' />
                              {item.stock > 0 ? 'Transferir' : 'Sin stock'}
                            </Button>
                          </PermissionGuard>
                        </CardFooter>
                      </Card>
                    </StaggeredEntrance>
                  ))
                )}
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <TransferPagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setPage}
                label='Paginación de productos'
              />
            )}
          </section>
        </TabsContent>
        <TabsContent value='pending'>
          <section aria-labelledby='pending-title' className='flex flex-col gap-4'>
            <div className='flex flex-wrap items-end justify-between gap-3'>
              <div className='flex flex-col gap-1'>
                <h2 id='pending-title' className='text-lg font-semibold'>
                  Pendientes de aprobación
                </h2>
                <p className='text-sm text-muted-foreground'>
                  El encargado del bar (Barman) aprueba o rechaza. Al aprobar, las unidades quedan
                  disponibles en el bar.
                </p>
              </div>
              <div className='shrink-0'>
                <SelectElements
                  value={pendingPageSize}
                  onChange={setPendingPageSize}
                  setPage={setPendingPage}
                  options={PAGE_SIZE_OPTIONS}
                  label={PAGE_SIZE_LABEL}
                />
              </div>
            </div>
            {pendientes.length === 0 ? (
              <p className='rounded-2xl border border-dashed py-12 text-center text-muted-foreground'>
                {loading ? 'Cargando…' : 'No hay solicitudes pendientes.'}
              </p>
            ) : (
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
                {visiblePendientes.map(record => (
                  <Card key={record.id} className='flex h-full min-w-0 flex-col rounded-2xl'>
                    <CardHeader className='gap-2'>
                      <Badge variant='secondary' className='w-fit'>
                        <Clock className='mr-1 size-3' aria-hidden='true' />
                        Pendiente
                      </Badge>
                      <CardTitle className='break-words'>{record.producto_nombre}</CardTitle>
                      <CardDescription className='break-words'>
                        {record.presentacion_nombre} · {record.cantidad} un.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='flex-1 text-sm text-muted-foreground'>
                      <p>Solicitada por: {record.usuario_nombre}</p>
                      <p>{record.fecha_crea.replace('T', ' ').slice(0, 16)}</p>
                    </CardContent>
                    <CardFooter className='flex gap-2'>
                      {puedeAprobar ? (
                        <>
                          <Button
                            className='flex-1'
                            disabled={resolvingId === record.id}
                            onClick={() => void resolver(record.id, 'aprobar')}
                          >
                            <Check aria-hidden='true' />
                            Aprobar
                          </Button>
                          <Button
                            variant='outline'
                            className='flex-1'
                            disabled={resolvingId === record.id}
                            onClick={() => void resolver(record.id, 'rechazar')}
                          >
                            <X aria-hidden='true' />
                            Rechazar
                          </Button>
                        </>
                      ) : (
                        <span className='text-sm text-muted-foreground'>
                          Solo el Barman puede aprobar.
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
            {pendientes.length > 0 && (
              <TransferPagination
                page={pendingCurrentPage}
                totalPages={pendingTotalPages}
                totalItems={pendientes.length}
                pageSize={pendingPageSize}
                onPageChange={setPendingPage}
                label='Paginación de pendientes'
              />
            )}
          </section>
        </TabsContent>
        <TabsContent value='history'>
          <section aria-labelledby='history-title' className='flex flex-col gap-4'>
            <div className='flex flex-wrap items-end justify-between gap-3'>
              <div className='flex flex-col gap-1'>
                <h2 id='history-title' className='text-lg font-semibold'>
                  Historial de transferencias
                </h2>
                <p className='text-sm text-muted-foreground'>
                  Últimos 100 movimientos de almacén a bar.
                </p>
              </div>
              <div className='shrink-0'>
                <SelectElements
                  value={historyPageSize}
                  onChange={setHistoryPageSize}
                  setPage={setHistoryPage}
                  options={PAGE_SIZE_OPTIONS}
                  label={PAGE_SIZE_LABEL}
                />
              </div>
            </div>
            <div className='overflow-hidden rounded-2xl border bg-card'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Presentación</TableHead>
                    <TableHead>Tipos de venta</TableHead>
                    <TableHead className='text-right'>Cantidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Solicitada por</TableHead>
                    <TableHead>Recepción / resolución</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className='py-10 text-center text-muted-foreground'>
                        {loading
                          ? 'Cargando historial…'
                          : 'Todavía no hay transferencias registradas.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleHistory.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className='whitespace-nowrap'>
                          {record.fecha_crea.replace('T', ' ').slice(0, 16)}
                        </TableCell>
                        <TableCell>{record.producto_nombre}</TableCell>
                        <TableCell>{record.presentacion_nombre}</TableCell>
                        <TableCell>
                          {isTierPricedItem({
                            categoria_nombre: record.categoria_nombre,
                            opciones_venta: record.opciones_venta,
                            precio_venta: record.precio_venta
                          }) ? (
                            <BarAnfitrionas
                              productoId={record.producto_id}
                              categoriaNombre={record.categoria_nombre}
                              precio={record.precio_venta}
                              compact
                            />
                          ) : (
                            <SalePrices
                              options={record.opciones_venta}
                              price={record.precio_venta}
                              commission={record.comision}
                              mlShot={record.ml_shot}
                              mlShotAnfitriona={record.ml_shot_anfitriona}
                            />
                          )}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>{record.cantidad}</TableCell>
                        <TableCell>
                          <Badge
                            variant={record.estado === 'aceptada' ? 'default' : 'secondary'}
                            className='whitespace-nowrap'
                          >
                            {record.estado === 'aceptada'
                              ? 'Aprobada'
                              : record.estado === 'rechazada'
                                ? 'Rechazada'
                                : record.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.usuario_nombre}</TableCell>
                        <TableCell>
                          {record.aceptado_nombre || 'Sin recepción registrada'}
                          {record.fecha_aceptacion && (
                            <p className='text-xs text-muted-foreground'>
                              {record.fecha_aceptacion.replace('T', ' ').slice(0, 16)}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {!loading && historial.length > 0 && (
              <TransferPagination
                page={historyCurrentPage}
                totalPages={historyTotalPages}
                totalItems={historial.length}
                pageSize={historyPageSize}
                onPageChange={setHistoryPage}
                label='Paginación del historial'
              />
            )}
          </section>
        </TabsContent>
      </Tabs>

      <TransferModal
        open={selected !== null}
        item={selected}
        endpoint='/api/transfers'
        onOpenChange={open => {
          if (!open) setSelected(null);
        }}
        onDone={() => void refresh()}
      />
    </main>
  );
}
