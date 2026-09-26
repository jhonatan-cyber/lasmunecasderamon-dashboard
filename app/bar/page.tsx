'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
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
  AlertTriangle
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { PendingApprovals } from '@/components/bar/PendingApprovals';
import { SalePrices } from '@/components/bar/SalePrices';
import { BarAnfitrionas, isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl } from '@/lib/business/shotMl';
import { useSharedSSE } from '@/hooks/shared';
import type {
  DevolucionEnvaseRegistro,
  ShotsSummary
} from '@/lib/repositories/InventoryRepository';
import { useContainerScan, MOTIVO_ENVASE } from '@/hooks/productos/useContainerScan';
import { EscaneoLote } from '@/components/products/EscaneoLote';

const isTierPriced = (item: BarStockItem) => isTierPricedItem(item);
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
  const [showTableView, setShowTableView] = useState(false);
  const [tab, setTab] = useState('productos');
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
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
    const enBar = items.filter(i => (i.stock_bar ?? 0) > 0);
    const term = search.trim().toLowerCase();
    if (!term) return enBar;
    return enBar.filter(
      i =>
        i.producto_nombre.toLowerCase().includes(term) ||
        i.nombre.toLowerCase().includes(term) ||
        (i.codigo_barras || '').toLowerCase().includes(term)
    );
  }, [items, search]);

  const totalBar = useMemo(() => items.reduce((acc, i) => acc + (i.stock_bar ?? 0), 0), [items]);

  return (
    <PermissionGuard module='products' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2'>
              <Wine className='w-6 h-6' />
              Bar
            </h1>
            <p className='text-sm sm:text-base text-gray-600'>
              Existencias del bar por presentación ({totalBar} un.)
            </p>
          </div>
          <div className='relative w-full sm:w-72'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Buscar producto, presentación...'
              className='pl-9 rounded-full'
            />
          </div>
          <Button
            variant='outline'
            onClick={() => setShowTableView(v => !v)}
            className={cn(
              'flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto',
              showTableView ? 'bg-blue-50 text-blue-700 border-blue-300' : ''
            )}
          >
            {showTableView ? (
              <>
                <TableIcon className='w-4 h-4' />
                Tabla
              </>
            ) : (
              <>
                <Grid3X3 className='w-4 h-4' />
                Cards
              </>
            )}
          </Button>
        </div>

        {/* Resumen de shots del bar: servidos hoy, ml restantes y alertas. */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div className='p-4 rounded-2xl bg-white dark:bg-slate-900/40 shadow-md'>
            <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400'>
              Shots servidos hoy
            </p>
            <p className='mt-1 text-2xl font-bold text-gray-900 dark:text-white'>
              {resumen ? resumen.shotsServidosHoy : '—'}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {resumen ? `${resumen.mlServidosHoy} ml servidos` : 'Cargando resumen del bar...'}
            </p>
          </div>

          <div className='p-4 rounded-2xl bg-white dark:bg-slate-900/40 shadow-md'>
            <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400'>
              Ml restantes en botellas abiertas
            </p>
            <p className='mt-1 text-2xl font-bold text-gray-900 dark:text-white'>
              {resumen ? `${resumen.mlRestantesTotales} ml` : '—'}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {resumen
                ? `${resumen.botellasAbiertas} botella(s) abierta(s) en bar`
                : 'Cargando resumen del bar...'}
            </p>
          </div>

          <div className='p-4 rounded-2xl bg-white dark:bg-slate-900/40 shadow-md'>
            <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400'>
              Botellas por agotarse
            </p>
            <p
              className={cn(
                'mt-1 text-2xl font-bold',
                (resumen?.botellasPorAgotarse ?? 0) > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-900 dark:text-white'
              )}
            >
              {resumen ? resumen.botellasPorAgotarse : '—'}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {resumen
                ? `Con ${resumen.shotsAlerta} shots o menos restantes`
                : 'Cargando resumen del bar...'}
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className='w-full'>
          <TabsList className='rounded-full'>
            <TabsTrigger value='productos' className='rounded-full'>
              Productos
            </TabsTrigger>
            <TabsTrigger value='pendientes' className='rounded-full flex items-center gap-1.5'>
              <Clock className='w-3.5 h-3.5' />
              Pendientes{pendientes.length > 0 ? ` (${pendientes.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value='historial' className='rounded-full flex items-center gap-1.5'>
              <History className='w-3.5 h-3.5' />
              Historial
            </TabsTrigger>
            {puedeDevolver && (
              <TabsTrigger value='envases' className='rounded-full flex items-center gap-1.5'>
                <ScanLine className='w-3.5 h-3.5' />
                Envases
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value='productos' className='mt-4'>
            <BoneyardSkeleton name='bar-table' loading={isLoading}>
              {showTableView ? (
                <div className='bg-white dark:bg-slate-900/40 rounded-3xl shadow-md overflow-hidden'>
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
                            Presentación
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
                              colSpan={8}
                              className='text-center py-8 text-gray-400 text-sm sm:text-base bg-white'
                            >
                              {isLoading ? 'Cargando...' : 'Sin productos en el bar.'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtered.map(item => {
                            const mlPorShot = resolveShotMl(item.ml_shot, shotMl);
                            return (
                              <TableRow
                                key={item.id}
                                className='border-b bg-white hover:bg-gray-50 transition-colors'
                              >
                                <TableCell className='py-3 px-2 sm:px-4 text-center'>
                                  <div
                                    data-photo-surface
                                    className='relative mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-100'
                                  >
                                    <Image
                                      data-themed-photo
                                      src={imageUrl(item.foto || item.producto_foto)}
                                      alt={`${item.producto_nombre} ${item.nombre}`}
                                      width={48}
                                      height={48}
                                      sizes='48px'
                                      className='h-12 w-12 object-cover'
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-medium'>
                                  {item.producto_nombre}
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
                                  <span className='inline-flex rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium whitespace-nowrap'>
                                    {item.nombre}
                                  </span>
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
                                  <Badge className='bg-green-100 text-green-700 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm'>
                                    {item.stock_bar ?? 0}
                                  </Badge>
                                  {Number(item.ml_abierta ?? 0) > 0 && (
                                    <p className='mt-1 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                      Abierta: {Number(item.ml_abierta)} ml
                                      {mlPorShot > 0
                                        ? ` · ≈${Math.floor(Number(item.ml_abierta) / mlPorShot)} shots`
                                        : ''}
                                    </p>
                                  )}
                                  {Number(item.ml_servidos ?? 0) > 0 && (
                                    <p className='mt-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-500'>
                                      Servido: {Number(item.ml_servidos)} ml
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className='py-3 px-2 sm:px-4 text-center'>
                                  <Badge className='bg-blue-100 text-blue-700 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm'>
                                    {item.stock ?? 0}
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
                    <div className='text-center text-gray-500 text-sm sm:text-base py-8'>
                      {isLoading ? 'Cargando...' : 'Sin productos en el bar.'}
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'>
                      {filtered.map(item => (
                        <BarCard key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </BoneyardSkeleton>
          </TabsContent>

          <TabsContent value='pendientes' className='mt-4'>
            <div className='space-y-2 mb-4'>
              <p className='text-sm sm:text-base text-gray-600'>
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
              <div className='bg-white dark:bg-slate-900/40 rounded-3xl shadow-md overflow-hidden'>
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
                            className='text-center py-8 text-gray-400 text-sm sm:text-base bg-white'
                          >
                            {loadingMovs ? 'Cargando...' : 'Sin movimientos registrados.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        movimientos.map(m => (
                          <TableRow
                            key={m.id}
                            className='border-b bg-white hover:bg-gray-50 transition-colors'
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
                <p className='text-sm sm:text-base text-gray-600'>
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
                  <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2'>
                    Devoluciones registradas ({devoluciones.length})
                  </p>
                  <BoneyardSkeleton name='bar-containers' loading={loadingDevol}>
                    <div className='bg-white dark:bg-slate-900/40 rounded-3xl shadow-md overflow-hidden'>
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
                                  className='text-center py-8 text-gray-400 text-sm sm:text-base bg-white'
                                >
                                  {loadingDevol ? 'Cargando...' : 'Sin envases entregados todavía.'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              devoluciones.map(d => (
                                <TableRow
                                  key={d.id}
                                  className='border-b bg-white hover:bg-gray-50 transition-colors dark:bg-slate-900/40'
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
