'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { toast } from 'sonner';
import {
  Wine,
  Search,
  Table as TableIcon,
  Grid3X3,
  History,
  Clock,
  ScanLine,
  PackageCheck,
  X,
  AlertTriangle
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { type BarStockItem } from '@/components/bar/TransferModal';
import { BarCard } from '@/components/bar/BarCard';
import { BarStatsCards } from '@/components/bar/BarStatsCards';
import { PendingApprovals } from '@/components/bar/PendingApprovals';
import { SalePrices } from '@/components/bar/SalePrices';
import { BarAnfitrionas, isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { useConfig } from '@/hooks/shared/useConfigValue';
import { resolveBotellaMl, resolveShotMl } from '@/lib/business/shotMl';
import { useSharedSSE } from '@/hooks/shared';
import type { DevolucionEnvaseRegistro, ShotsSummary } from '@/modules/inventario/contracts';
import { useContainerScan, MOTIVO_ENVASE } from '@/hooks/productos/useContainerScan';
import { EscaneoLote } from '@/components/products/EscaneoLote';
import { ProductImageLightbox } from '@/components/products/ProductImageLightbox';

const isTierPriced = (item: BarStockItem) => isTierPricedItem(item);
const barTabClassName =
  'cursor-pointer rounded-full gap-1.5 transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-accent-foreground data-[state=active]:hover:bg-primary/10 data-[state=active]:hover:shadow-md data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-primary/30';
import type { TransferRecord } from '@/types/transfer';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

function imageUrl(foto?: string | null): string {
  if (!foto || foto === 'default.png' || foto === '') return '/api/images/products/default.png';
  if (foto.startsWith('http')) return foto;
  return `/api/images/products/${foto}`;
}

interface Movimiento {
  estado?: string;
  aceptado_nombre?: string | null;
  fecha_aceptacion?: string | null;
  opciones_venta?: import('@/types/sale-options').SaleOption[];
  producto_id: string;
  categoria_nombre?: string | null;
  id: string;
  tipo: string;
  cantidad: number;
  /** Ml servidos por shots en una venta (null = solo botellas). */
  ml?: number | null;
  /** Ml por shot del producto; null/undefined = valor global de Configuraciones. */
  ml_shot?: number | null;
  /** Ml por shot a anfitriona; null/undefined = igual que a cliente. */
  ml_shot_anfitriona?: number | null;
  precio_venta: number | null;
  comision: number | null;
  fecha_crea: string;
  producto_nombre: string | null;
  presentacion_nombre: string | null;
  usuario_nombre: string | null;
  usuario_apellido: string | null;
  usuario_nick: string | null;
}

export default function BarPage() {
  const [items, setItems] = useState<BarStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('todos');
  const [showTableView, setShowTableView] = useState(false);
  const [tablePhoto, setTablePhoto] = useState<{ src: string; alt: string } | null>(null);
  const [tab, setTab] = useState('productos');
  const shotMl = useConfig<number>('shot_ml');
  const botellaMl = useConfig<number>('botella_ml');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'pendientes')
      setTab('pendientes');
  }, []);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [pendientes, setPendientes] = useState<TransferRecord[]>([]);
  const [resumen, setResumen] = useState<ShotsSummary | null>(null);
  const [loadingPend, setLoadingPend] = useState(false);
  const [devoluciones, setDevoluciones] = useState<DevolucionEnvaseRegistro[]>([]);
  const [loadingDevol, setLoadingDevol] = useState(false);
  const [codigoEnvase, setCodigoEnvase] = useState('');
  const inputEnvaseRef = useRef<HTMLInputElement>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const { hasPermission } = useAuth();
  const puedeAprobar = ['barman'].includes((user?.role || '').toLowerCase());
  // Solo quien tiene products/return_container ve el tab de envases (admin pasa siempre).
  const puedeDevolver = hasPermission('products', 'return_container');

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bar');
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.data)) setItems(data.data);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const fetchMovimientos = useCallback(async () => {
    setLoadingMovs(true);
    try {
      const res = await fetch('/api/bar/movements?limit=100');
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.data)) setMovimientos(data.data);
    } catch {
    } finally {
      setLoadingMovs(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'historial') fetchMovimientos();
  }, [tab, fetchMovimientos]);

  const fetchResumen = useCallback(async () => {
    try {
      const res = await fetch('/api/bar/shots', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.data) setResumen(data.data);
    } catch {
      // el panel queda vacío y se reintenta al próximo refresco
    }
  }, []);

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  // Un shot que cruza el umbral dispara el aviso en vivo: el panel se refresca al toque.
  useSharedSSE('/api/notifications/sse', payload => {
    if (payload?.type === 'bar_shot_alert') fetchResumen();
  });

  const fetchDevoluciones = useCallback(async () => {
    setLoadingDevol(true);
    try {
      const res = await fetch('/api/bar/containers', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.data)) setDevoluciones(data.data);
    } catch {
      // el historial queda vacío y se recarga al volver a entrar al tab
    } finally {
      setLoadingDevol(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'envases') fetchDevoluciones();
  }, [tab, fetchDevoluciones]);

  // Escaneo continuo del lote: verifica (es nuestro + vacío + sin entregar),
  // marca en un paso y lleva los contadores de la sesión con aviso sonoro.
  const {
    escanear: escanearEnvase,
    escaneando: verificando,
    resultado: resultadoEnvase,
    sesion: sesionEnvases,
    aceptados: entregadosSesion,
    rechazados: rechazadosSesion,
    enCola: envasesEnCola,
    sincronizando: sincronizandoEnvases,
    sincronizar: reintentarEnvases,
    limpiar: limpiarSesionEnvases,
    sonido: avisoSonoro,
    alternarSonido: alternarAvisoSonoro
  } = useContainerScan({ endpoint: '/api/bar/containers', onAceptado: fetchDevoluciones });

  // Tras cada lectura se limpia el campo y se devuelve el foco: el lector de
  // código de barras escribe donde esté el cursor, así que el lote no se corta.
  const enviarEscaneo = useCallback(
    async (valor: string) => {
      if (await escanearEnvase(valor)) setCodigoEnvase('');
      inputEnvaseRef.current?.focus();
    },
    [escanearEnvase]
  );

  const fetchPendientes = useCallback(async () => {
    setLoadingPend(true);
    try {
      const res = await fetch('/api/transfers/pending', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success)
        throw new Error(data.message || 'No se pudieron cargar las recepciones');
      const history = data.data;
      setPendientes(
        Array.isArray(history)
          ? history.filter((h: TransferRecord) => h.estado === 'pendiente')
          : []
      );
    } catch {
    } finally {
      setLoadingPend(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'pendientes') fetchPendientes();
  }, [tab, fetchPendientes]);

  const resolver = useCallback(
    async (id: string, accion: 'aprobar' | 'rechazar') => {
      setResolvingId(id);
      try {
        const res = await fetch('/api/transfers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, accion })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'No se pudo resolver la solicitud.');
        }
        toast.success(accion === 'aprobar' ? 'Transferencia aprobada' : 'Transferencia rechazada');
        await Promise.all([fetchPendientes(), fetchStock(), fetchMovimientos(), fetchResumen()]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al resolver la solicitud');
      } finally {
        setResolvingId(null);
      }
    },
    [fetchPendientes, fetchStock, fetchMovimientos, fetchResumen]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(
      i =>
        (stockFilter !== 'abiertas' || Number(i.ml_abierta ?? 0) > 0) &&
        (!term ||
          i.producto_nombre.toLowerCase().includes(term) ||
          (i.categoria_nombre ?? '').toLowerCase().includes(term) ||
          i.nombre.toLowerCase().includes(term) ||
          (i.codigo_barras || '').toLowerCase().includes(term) ||
          (i.producto_codigo || '').toLowerCase().includes(term))
    );
  }, [items, search, stockFilter]);

  const totalBar = useMemo(() => items.reduce((acc, i) => acc + (i.stock_bar ?? 0), 0), [items]);

  return (
    <PermissionGuard module='products' action='view'>
      <div className='mx-auto flex w-full max-w-[1600px] min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-10'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
              <Wine className='size-7 text-primary' aria-hidden='true' />
              Bar
            </h1>
            <p className='mt-2 text-sm text-muted-foreground'>
              Stock, botellas abiertas y movimientos del bar.
            </p>
          </div>
          <Badge variant='secondary' className='w-fit px-3 py-1.5'>
            {isLoading ? 'Cargando stock…' : `${totalBar} unidades en bar`}
          </Badge>
        </div>

        <BarStatsCards resumen={resumen} />

        <Tabs value={tab} onValueChange={setTab} className='w-full'>
          <div className='flex min-w-0 flex-wrap items-center gap-3'>
            <div className='max-w-full shrink-0 overflow-x-auto pb-1 lg:pb-0'>
              <TabsList className='h-auto w-max min-w-full justify-start gap-1 rounded-full p-1 sm:min-w-0'>
                <TabsTrigger value='productos' className={barTabClassName}>
                  Productos
                </TabsTrigger>
                <TabsTrigger value='pendientes' className={barTabClassName}>
                  <Clock className='w-3.5 h-3.5' />
                  Pendientes{pendientes.length > 0 ? ` (${pendientes.length})` : ''}
                </TabsTrigger>
                <TabsTrigger value='historial' className={barTabClassName}>
                  <History className='w-3.5 h-3.5' />
                  Historial
                </TabsTrigger>
                {puedeDevolver && (
                  <TabsTrigger value='envases' className={barTabClassName}>
                    <ScanLine className='w-3.5 h-3.5' />
                    Envases
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {tab === 'productos' && (
              <div className='flex min-w-0 flex-[1_1_520px] flex-wrap items-center gap-2'>
                <div className='relative min-w-0 flex-[1_1_220px]'>
                  <Search
                    className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                    aria-hidden='true'
                  />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder='Buscar producto, categoría, presentación o código'
                    aria-label='Buscar productos del bar'
                    className='h-11 rounded-full pl-9 pr-11'
                  />
                  {search && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='absolute right-0 top-0 size-11 rounded-full'
                          aria-label='Limpiar búsqueda'
                          onClick={() => setSearch('')}
                        >
                          <X />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Limpiar búsqueda</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={stockFilter === 'abiertas' ? 'secondary' : 'outline'}
                      className='h-11 shrink-0 gap-2 rounded-full'
                      onClick={() =>
                        setStockFilter(value => (value === 'todos' ? 'abiertas' : 'todos'))
                      }
                      aria-label='Filtrar solo botellas abiertas'
                      aria-pressed={stockFilter === 'abiertas'}
                    >
                      <Wine />
                      {stockFilter === 'abiertas' ? 'Botellas abiertas' : 'Todos'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {stockFilter === 'abiertas'
                      ? 'Mostrar todos'
                      : 'Mostrar solo botellas abiertas'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      className='h-11 shrink-0 gap-2 rounded-full'
                      onClick={() => setShowTableView(value => !value)}
                      aria-label={showTableView ? 'Cambiar a tarjetas' : 'Cambiar a tabla'}
                    >
                      {showTableView ? <Grid3X3 /> : <TableIcon />}
                      {showTableView ? 'Tarjetas' : 'Tabla'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showTableView ? 'Cambiar a tarjetas' : 'Cambiar a tabla'}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          <TabsContent value='productos' className='mt-4'>
            <div className='mb-4'>
              <p className='text-xs text-muted-foreground' role='status'>
                {isLoading
                  ? 'Cargando productos…'
                  : `${filtered.length} ${filtered.length === 1 ? 'presentación' : 'presentaciones'}`}
              </p>
            </div>
            <BoneyardSkeleton name='bar-table' loading={isLoading}>
              {showTableView ? (
                <div className='overflow-hidden rounded-2xl border bg-card'>
                  <div className='overflow-x-auto'>
                    <Table className='min-w-full text-base text-center'>
                      <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                        <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Foto
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Producto
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Precio venta
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Comisión
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Anfitrionas
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Stock bar
                          </TableHead>
                          <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                            Stock almacén
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow key='empty'>
                            <TableCell
                              colSpan={7}
                              className='py-10 text-center text-sm text-muted-foreground'
                            >
                              {isLoading
                                ? 'Cargando...'
                                : search || stockFilter !== 'todos'
                                  ? 'No hay productos que coincidan con los filtros.'
                                  : 'Sin productos en el bar.'}
                              {(search || stockFilter !== 'todos') && (
                                <Button
                                  variant='link'
                                  onClick={() => {
                                    setSearch('');
                                    setStockFilter('todos');
                                  }}
                                >
                                  Limpiar filtros
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtered.map(item => {
                            const mlPorShot = resolveShotMl(item.ml_shot, shotMl);
                            // Misma resolución de capacidad que usa el descuento de la
                            // venta, para comparar lo que queda con lo que trae la botella.
                            const capacidadBotella = resolveBotellaMl(
                              item.ml_botella,
                              item.nombre,
                              botellaMl
                            );
                            return (
                              <TableRow
                                key={item.id}
                                className='border-b transition-colors hover:bg-muted/50'
                              >
                                <TableCell className='py-3 px-2 sm:px-4 text-center'>
                                  <button
                                    type='button'
                                    onClick={() =>
                                      setTablePhoto({
                                        src: imageUrl(item.foto || item.producto_foto),
                                        alt: `${item.producto_nombre} ${item.nombre}`
                                      })
                                    }
                                    aria-label={`Ver ${item.producto_nombre} ${item.nombre} en grande`}
                                    className='mx-auto block cursor-zoom-in rounded-xl focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-hidden'
                                  >
                                    <div
                                      data-photo-surface
                                      className='relative mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-100'
                                    >
                                      <ProductPhoto
                                        src={imageUrl(item.foto || item.producto_foto)}
                                        alt={`${item.producto_nombre} ${item.nombre}`}
                                        width={48}
                                        height={48}
                                        className='h-12 w-12 object-contain p-0.5'
                                      />
                                    </div>
                                  </button>
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-medium'>
                                  <div className='flex flex-wrap items-center justify-center gap-2'>
                                    {item.categoria_nombre?.trim() && (
                                      <Badge
                                        variant='outline'
                                        className='max-w-full break-words whitespace-normal'
                                      >
                                        {item.categoria_nombre}
                                      </Badge>
                                    )}
                                    <span>{item.producto_nombre}</span>
                                    <span className='inline-flex shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium whitespace-nowrap'>
                                      {item.nombre}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                                  {isTierPriced(item) ? (
                                    <span className='text-muted-foreground'>Según N° anf.</span>
                                  ) : (
                                    <SalePrices
                                      options={item.opciones_venta}
                                      price={item.precio_venta}
                                      commission={item.comision}
                                      field='precio'
                                      mlShot={item.ml_shot}
                                      mlShotAnfitriona={item.ml_shot_anfitriona}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                                  {isTierPriced(item) ? (
                                    <span className='text-muted-foreground'>Según N° anf.</span>
                                  ) : (
                                    <SalePrices
                                      options={item.opciones_venta}
                                      price={item.precio_venta}
                                      commission={item.comision}
                                      field='comision'
                                      mlShot={item.ml_shot}
                                      mlShotAnfitriona={item.ml_shot_anfitriona}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center'>
                                  <BarAnfitrionas
                                    productoId={item.producto_id}
                                    categoriaNombre={item.categoria_nombre}
                                    maxAnfitrionas={item.max_anfitrionas}
                                    precio={item.precio_venta}
                                    compact
                                  />
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center'>
                                  <Badge
                                    className={`rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm ${Number(item.stock_bar ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                  >
                                    {Number(item.stock_bar ?? 0) > 0 ? item.stock_bar : 'Agotado'}
                                  </Badge>
                                  {Number(item.ml_abierta ?? 0) > 0 && (
                                    <p className='mt-1 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                      Abierta: {Number(item.ml_abierta)} de {capacidadBotella} ml
                                      {mlPorShot > 0
                                        ? ` · ≈${Math.floor(Number(item.ml_abierta) / mlPorShot)} shots`
                                        : ''}
                                    </p>
                                  )}
                                  {Number(item.botellas_vacias_shots ?? 0) > 0 && (
                                    <p className='mt-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400'>
                                      Vacías por shots: {Number(item.botellas_vacias_shots)} ·
                                      pendientes de devolución
                                    </p>
                                  )}
                                  {Number(item.ml_servidos ?? 0) > 0 && (
                                    <p className='mt-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-500'>
                                      Servido: {Number(item.ml_servidos)} ml
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center'>
                                  <Badge
                                    className={`rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm ${Number(item.stock ?? 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}
                                  >
                                    {Number(item.stock ?? 0) > 0 ? item.stock : 'Agotado'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <>
                  {filtered.length === 0 ? (
                    <div className='flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center'>
                      <Search className='size-8 text-muted-foreground' aria-hidden='true' />
                      <p className='font-medium'>
                        {isLoading
                          ? 'Cargando...'
                          : search || stockFilter !== 'todos'
                            ? 'No encontramos coincidencias'
                            : 'Sin productos en el bar'}
                      </p>
                      <p className='max-w-sm text-sm text-muted-foreground'>
                        {search || stockFilter !== 'todos'
                          ? 'Prueba con otro nombre o código, o limpia los filtros para ver todas las presentaciones.'
                          : 'Los productos aparecerán aquí cuando se registren sus presentaciones.'}
                      </p>
                      {(search || stockFilter !== 'todos') && (
                        <Button
                          variant='outline'
                          onClick={() => {
                            setSearch('');
                            setStockFilter('todos');
                          }}
                        >
                          Limpiar filtros
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className='grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4 sm:gap-5'>
                      {filtered.map((item, index) => (
                        <BarCard key={item.id} item={item} entranceIndex={index} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </BoneyardSkeleton>
            <ProductImageLightbox
              open={Boolean(tablePhoto)}
              onOpenChange={open => {
                if (!open) setTablePhoto(null);
              }}
              src={tablePhoto?.src ?? ''}
              alt={tablePhoto?.alt ?? ''}
            />
          </TabsContent>

          <TabsContent value='pendientes' className='mt-4'>
            <div className='space-y-2 mb-4'>
              <p className='text-sm text-muted-foreground'>
                Solicitudes pendientes de aprobación del bar.
              </p>
            </div>
            <PendingApprovals
              pendientes={pendientes}
              puedeAprobar={puedeAprobar}
              resolvingId={resolvingId}
              loading={loadingPend}
              onResolve={resolver}
            />
          </TabsContent>

          <TabsContent value='historial' className='mt-4'>
            <BoneyardSkeleton name='bar-history' loading={loadingMovs}>
              <div className='overflow-hidden rounded-2xl border bg-card'>
                <div className='overflow-x-auto'>
                  <Table className='min-w-full text-base text-center'>
                    <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                      <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                          Fecha
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                          Producto
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                          Presentación
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                          Cantidad
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                          Precio venta
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                          Comisión
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                          Usuario
                        </TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Recepción / resolución</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimientos.length === 0 ? (
                        <TableRow key='empty'>
                          <TableCell
                            colSpan={10}
                            className='py-10 text-center text-sm text-muted-foreground'
                          >
                            {loadingMovs ? 'Cargando...' : 'Sin movimientos registrados.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        movimientos.map(m => (
                          <TableRow
                            key={m.id}
                            className='border-b transition-colors hover:bg-muted/50'
                          >
                            <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm whitespace-nowrap'>
                              {m.fecha_crea
                                ? (() => {
                                    const f = new Date(m.fecha_crea);
                                    const fecha = f.toLocaleDateString('es-CL', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    });
                                    const hora = f.toLocaleTimeString('es-CL', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    });
                                    return (
                                      <span>
                                        {fecha}
                                        <br />
                                        <span className='text-gray-400'>{hora}</span>
                                      </span>
                                    );
                                  })()
                                : '—'}
                            </TableCell>
                            <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-medium'>
                              {m.producto_nombre || '—'}
                            </TableCell>
                            <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
                              {m.presentacion_nombre || '—'}
                            </TableCell>
                            <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                              {m.cantidad}
                              {Number(m.ml ?? 0) > 0 && (
                                <p className='text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                  {Number(m.ml)} ml
                                </p>
                              )}
                            </TableCell>
                            <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                              {isTierPricedItem(m) ? (
                                <BarAnfitrionas
                                  productoId={m.producto_id}
                                  categoriaNombre={m.categoria_nombre}
                                  precio={m.precio_venta}
                                  compact
                                />
                              ) : m.opciones_venta ? (
                                <SalePrices
                                  options={m.opciones_venta}
                                  field='precio'
                                  mlShot={m.ml_shot}
                                  mlShotAnfitriona={m.ml_shot_anfitriona}
                                />
                              ) : m.precio_venta !== null && m.precio_venta !== undefined ? (
                                formatCurrencyCLP(Number(m.precio_venta))
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                              {isTierPricedItem(m) ? (
                                <span className='text-muted-foreground'>Según tabla</span>
                              ) : m.opciones_venta ? (
                                <SalePrices
                                  options={m.opciones_venta}
                                  field='comision'
                                  mlShot={m.ml_shot}
                                  mlShotAnfitriona={m.ml_shot_anfitriona}
                                />
                              ) : m.comision !== null && m.comision !== undefined ? (
                                formatCurrencyCLP(Number(m.comision))
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-mono'>
                              {m.usuario_nombre || m.usuario_nick || '—'}
                            </TableCell>
                            <TableCell>
                              {m.tipo === 'venta'
                                ? 'Vendida'
                                : m.estado === 'aceptada'
                                  ? 'Aceptada'
                                  : m.estado === 'pendiente'
                                    ? 'Pendiente'
                                    : m.estado === 'rechazada'
                                      ? 'Rechazada'
                                      : 'Histórica'}
                            </TableCell>
                            <TableCell>
                              {m.tipo === 'venta' ? (
                                <span className='text-muted-foreground'>—</span>
                              ) : (
                                <>
                                  <span>{m.aceptado_nombre || 'Sin recepción registrada'}</span>
                                  {m.fecha_aceptacion && (
                                    <p className='text-xs text-muted-foreground'>
                                      {m.fecha_aceptacion.replace('T', ' ').slice(0, 16)}
                                    </p>
                                  )}
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </BoneyardSkeleton>
          </TabsContent>

          <TabsContent value='envases' className='mt-4'>
            <PermissionGuard
              module='products'
              action='return_container'
              fallback={
                <div className='text-center text-gray-500 text-sm sm:text-base py-8'>
                  No tienes permiso para verificar la entrega de envases.
                </div>
              }
            >
              <div className='space-y-4'>
                <p className='text-sm text-muted-foreground'>
                  Escanea el envase vacío (EAN-13 o SKU LM-…) antes de entregarlo al almacén: el
                  sistema confirma que es nuestro, que está vacío y que no se entregó antes, y lo
                  marca en el mismo paso. La recepción queda pendiente hasta que el almacén la
                  confirme desde Almacén → Envases devueltos. Puedes escanear envases uno tras otro
                  sin recargar: el contador y la lista de la sesión quedan abajo. Si no hay red, los
                  escaneos se guardan localmente y se verifican solos al reconectar.
                </p>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    enviarEscaneo(codigoEnvase);
                  }}
                  className='flex flex-col sm:flex-row gap-2'
                >
                  <Input
                    autoFocus
                    ref={inputEnvaseRef}
                    value={codigoEnvase}
                    onChange={e => setCodigoEnvase(e.target.value)}
                    placeholder='Escanea o digita el código del envase'
                    aria-label='Código del envase'
                    className='rounded-full font-mono'
                  />
                  <Button
                    type='submit'
                    disabled={verificando || !codigoEnvase.trim()}
                    className='rounded-full flex items-center gap-2'
                  >
                    <PackageCheck className='w-4 h-4' />
                    {verificando ? 'Verificando...' : 'Verificar y marcar'}
                  </Button>
                </form>

                {resultadoEnvase && (
                  <div
                    className={cn(
                      'p-4 rounded-2xl border text-sm',
                      resultadoEnvase.ok
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : resultadoEnvase.motivo === 'ya_devuelto'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                    )}
                    role='status'
                  >
                    <p className='font-bold flex items-center gap-2'>
                      {resultadoEnvase.ok ? (
                        <>
                          <PackageCheck className='w-4 h-4' />
                          Envase entregado al almacén
                        </>
                      ) : (
                        <>
                          <AlertTriangle className='w-4 h-4' />
                          {MOTIVO_ENVASE[resultadoEnvase.motivo] ?? 'No es nuestro'}
                        </>
                      )}
                    </p>
                    <p className='mt-1'>{resultadoEnvase.mensaje}</p>
                    {resultadoEnvase.unidad && (
                      <p className='text-xs mt-1 font-mono'>
                        {resultadoEnvase.unidad.producto_nombre || '—'} ·{' '}
                        {resultadoEnvase.unidad.presentacion_nombre || '—'} · SKU{' '}
                        {resultadoEnvase.unidad.codigo}
                      </p>
                    )}
                  </div>
                )}

                <EscaneoLote
                  aceptados={entregadosSesion}
                  rechazados={rechazadosSesion}
                  enCola={envasesEnCola}
                  sesion={sesionEnvases}
                  sincronizando={sincronizandoEnvases}
                  sonido={avisoSonoro}
                  onAlternarSonido={alternarAvisoSonoro}
                  onLimpiar={limpiarSesionEnvases}
                  onReintentar={reintentarEnvases}
                  etiquetaAceptado='Entregado'
                  tituloAceptados='Entregados al almacén'
                />

                <div>
                  <p className='text-xs font-medium text-muted-foreground mb-2'>
                    Devoluciones registradas ({devoluciones.length})
                  </p>
                  <BoneyardSkeleton name='bar-containers' loading={loadingDevol}>
                    <div className='overflow-hidden rounded-2xl border bg-card'>
                      <div className='overflow-x-auto'>
                        <Table className='min-w-full text-base text-center'>
                          <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                            <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                                Fecha
                              </TableHead>
                              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                                SKU
                              </TableHead>
                              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                                Producto
                              </TableHead>
                              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                                Presentación
                              </TableHead>
                              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                                Compra
                              </TableHead>
                              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                                Entregado por
                              </TableHead>
                              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                                Recepción en almacén
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {devoluciones.length === 0 ? (
                              <TableRow key='empty'>
                                <TableCell
                                  colSpan={7}
                                  className='py-10 text-center text-sm text-muted-foreground'
                                >
                                  {loadingDevol ? 'Cargando...' : 'Sin envases entregados todavía.'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              devoluciones.map(d => (
                                <TableRow
                                  key={d.id}
                                  className='border-b transition-colors hover:bg-muted/50'
                                >
                                  <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm whitespace-nowrap'>
                                    {d.fecha_devolucion
                                      ? (() => {
                                          const f = new Date(d.fecha_devolucion);
                                          return (
                                            <span>
                                              {f.toLocaleDateString('es-CL', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                              })}
                                              <br />
                                              <span className='text-gray-400'>
                                                {f.toLocaleTimeString('es-CL', {
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </span>
                                            </span>
                                          );
                                        })()
                                      : '—'}
                                  </TableCell>
                                  <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                                    {d.codigo}
                                  </TableCell>
                                  <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-medium'>
                                    {d.producto_nombre || '—'}
                                  </TableCell>
                                  <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
                                    {d.presentacion_nombre || '—'}
                                  </TableCell>
                                  <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                                    {d.compra_folio || '—'}
                                  </TableCell>
                                  <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
                                    {d.usuario_nombre || d.usuario_nick
                                      ? `${d.usuario_nombre || ''} ${d.usuario_apellido || ''}`.trim() ||
                                        d.usuario_nick
                                      : '—'}
                                  </TableCell>
                                  <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
                                    {d.pendiente_confirmacion ? (
                                      <Badge className='bg-amber-100 text-amber-700 rounded-full px-2 sm:px-3 py-1 text-xs'>
                                        Pendiente de almacén
                                      </Badge>
                                    ) : (
                                      <>
                                        <Badge className='bg-green-100 text-green-700 rounded-full px-2 sm:px-3 py-1 text-xs'>
                                          Recibido
                                        </Badge>
                                        <p className='mt-1 text-[10px] text-gray-500'>
                                          {d.confirmado_nombre || d.confirmado_nick || '—'}
                                          {d.fecha_confirmacion
                                            ? ` · ${new Date(d.fecha_confirmacion).toLocaleString(
                                                'es-CL',
                                                {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                }
                                              )}`
                                            : ''}
                                        </p>
                                      </>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </BoneyardSkeleton>
                </div>
              </div>
            </PermissionGuard>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
