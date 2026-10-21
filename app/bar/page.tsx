'use client';
import { fetchCollection } from '@/lib/api/fetchCollection';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { SortSelect } from '@/components/shared/selects/SortSelect';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';

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
  GlassWater,
  X,
  AlertTriangle,
  Bell,
  BellOff
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useTransferPermissions } from '@/hooks/shared/useTransferPermissions';
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
import { BarProductGrid } from '@/components/bar/BarProductGrid';
import { BarStatsCards } from '@/components/bar/BarStatsCards';
import { PendingApprovals } from '@/components/bar/PendingApprovals';
import { SalePrices } from '@/components/bar/SalePrices';
import { BarAnfitrionas, isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { useConfig } from '@/hooks/shared/useConfigValue';
import { resolveBotellaMl, resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import type { DevolucionEnvaseRegistro, ShotsSummary } from '@/modules/inventario/contracts';
import { useContainerScan, MOTIVO_ENVASE } from '@/hooks/productos/useContainerScan';
import { EscaneoLote } from '@/components/products/EscaneoLote';
import { ProductImageLightbox } from '@/components/products/ProductImageLightbox';
import { ColacionesTab } from '@/components/colaciones/ColacionesTab';
import { MetricCard } from '@/components/shared/MetricCard';
import Paginate from '@/components/shared/Paginate';

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
  /** Botellas que tocó una colación y los ml que salieron de cada una. */
  unidades_consumidas?: {
    unidad_id: string;
    codigo: string;
    codigo_barras: string | null;
    ml_consumido: number;
  }[];
}

type FiltroTipoMovimiento = 'todos' | 'venta' | 'colacion' | 'traspaso' | 'devolucion';

// Tipos de `inventario_movimientos` que escribe el negocio (venta, colación,
// traspaso y devolución por anulación); «Todos» muestra también los históricos.
const TIPOS_MOVIMIENTO: { valor: FiltroTipoMovimiento; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'venta', etiqueta: 'Ventas' },
  { valor: 'colacion', etiqueta: 'Colaciones' },
  { valor: 'traspaso', etiqueta: 'Traspasos' },
  { valor: 'devolucion', etiqueta: 'Devoluciones' }
];

export default function BarPage() {
  const [items, setItems] = useState<BarStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchPendientes, setSearchPendientes] = useState('');
  const [searchHistorial, setSearchHistorial] = useState('');
  const [filtroTipoMov, setFiltroTipoMov] = useState<FiltroTipoMovimiento>('todos');
  const [searchEnvases, setSearchEnvases] = useState('');
  const [searchColaciones, setSearchColaciones] = useState('');
  const [sortField, setSortField] = useState('producto_nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [stockError, setStockError] = useState(false);
  const [movementsError, setMovementsError] = useState(false);
  const [containersError, setContainersError] = useState(false);
  const [pendingError, setPendingError] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
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
  // Historial paginado en el servidor: fecha, tipo y texto mandan el filtro al
  // backend y `metaMovs` trae el total del mismo filtro para paginar más allá de
  // los últimos movimientos.
  const [paginaMovs, setPaginaMovs] = useState(1);
  const [desdeHistorial, setDesdeHistorial] = useState('');
  const [hastaHistorial, setHastaHistorial] = useState('');
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [metaMovs, setMetaMovs] = useState<{
    total: number;
    pagina: number;
    paginas: number;
    limite: number;
  } | null>(null);
  // Cada petición lleva su número para descartar respuestas que llegaron tarde.
  const movimientosRequestId = useRef(0);
  // El esqueleto cubre la primera carga; después las filas se reemplazan en caliente.
  const historialCargadoRef = useRef(false);
  const [pendientes, setPendientes] = useState<TransferRecord[]>([]);
  const [resumen, setResumen] = useState<ShotsSummary | null>(null);
  const [loadingPend, setLoadingPend] = useState(false);
  const [devoluciones, setDevoluciones] = useState<DevolucionEnvaseRegistro[]>([]);
  const [loadingDevol, setLoadingDevol] = useState(false);
  const inputEnvaseRef = useRef<HTMLInputElement>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const resolvingRef = useRef<string | null>(null);
  const { hasPermission } = useAuth();
  const { puedeAprobar } = useTransferPermissions();
  // Solo quien tiene products/return_container ve el tab de envases (admin pasa siempre).
  const puedeDevolver = hasPermission('products', 'return_container');

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    setStockError(false);
    try {
      const rows = await fetchCollection<BarStockItem>('/api/bar', { cache: 'no-store' });
      setItems(rows);
    } catch {
      setStockError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // El texto se aplica enseguida en la tabla y al servidor 300 ms después,
  // para no pedir una página por cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => setBusquedaHistorial(searchHistorial), 300);
    return () => clearTimeout(timer);
  }, [searchHistorial]);

  const fetchMovimientos = useCallback(async () => {
    const requestId = ++movimientosRequestId.current;
    if (!historialCargadoRef.current) setLoadingMovs(true);
    setMovementsError(false);
    try {
      const params = new URLSearchParams();
      params.set('page', String(paginaMovs));
      if (desdeHistorial) params.set('desde', desdeHistorial);
      if (hastaHistorial) params.set('hasta', hastaHistorial);
      if (filtroTipoMov !== 'todos') params.set('tipo', filtroTipoMov);
      const texto = busquedaHistorial.trim();
      if (texto) params.set('q', texto);
      const response = await fetch(`/api/bar/movements?${params}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !Array.isArray(result.data))
        throw new Error(result.message || 'No se pudo cargar el historial');
      // Una respuesta vieja (el filtro cambió mientras volaba) no pisa la nueva.
      if (requestId !== movimientosRequestId.current) return;
      historialCargadoRef.current = true;
      setMovimientos(result.data as Movimiento[]);
      // Sin meta (respuesta legacy) la página única es el total.
      const total = Number(result.meta?.total ?? result.data.length);
      const paginas = Number(result.meta?.paginas ?? 1) || 1;
      setMetaMovs({
        total,
        pagina: Number(result.meta?.pagina ?? paginaMovs),
        paginas,
        limite: Number(result.meta?.limite ?? 100)
      });
      // El filtro se estrechó: si la página actual ya no existe, se vuelve a la
      // última válida en vez de quedar en un historial vacío.
      if (paginaMovs > paginas) setPaginaMovs(paginas);
    } catch {
      if (requestId !== movimientosRequestId.current) return;
      setMovementsError(true);
    } finally {
      if (requestId === movimientosRequestId.current) setLoadingMovs(false);
    }
  }, [paginaMovs, desdeHistorial, hastaHistorial, filtroTipoMov, busquedaHistorial]);
  useEffect(() => {
    if (tab === 'historial') fetchMovimientos();
  }, [tab, fetchMovimientos]);
  // Cualquier filtro nuevo vuelve a la primera página.
  useEffect(() => {
    setPaginaMovs(1);
  }, [desdeHistorial, hastaHistorial, filtroTipoMov, busquedaHistorial]);

  const fetchResumen = useCallback(async () => {
    setSummaryError(false);
    try {
      const res = await fetch('/api/bar/shots', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.data) throw new Error('No se pudo cargar el resumen');
      setResumen(data.data);
    } catch {
      setSummaryError(true);
    }
  }, []);

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  const fetchDevoluciones = useCallback(async () => {
    setLoadingDevol(true);
    setContainersError(false);
    try {
      const rows = await fetchCollection<DevolucionEnvaseRegistro>('/api/bar/containers', {
        cache: 'no-store'
      });
      setDevoluciones(rows);
    } catch {
      setContainersError(true);
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
      if (await escanearEnvase(valor)) setSearchEnvases('');
      inputEnvaseRef.current?.focus();
    },
    [escanearEnvase]
  );

  const fetchPendientes = useCallback(async () => {
    setLoadingPend(true);
    setPendingError(false);
    try {
      const rows = await fetchCollection<TransferRecord>('/api/transfers/pending', {
        cache: 'no-store'
      });
      setPendientes(rows.filter(row => row.estado === 'pendiente'));
    } catch {
      setPendingError(true);
    } finally {
      setLoadingPend(false);
    }
  }, []);
  useEffect(() => {
    if (tab === 'pendientes') fetchPendientes();
  }, [tab, fetchPendientes]);

  useRealtimeRefresh('/api/bar', () =>
    Promise.all([
      fetchStock(),
      fetchResumen(),
      ...(tab === 'historial' ? [fetchMovimientos()] : []),
      ...(tab === 'pendientes' ? [fetchPendientes()] : []),
      ...(tab === 'envases' ? [fetchDevoluciones()] : [])
    ])
  );

  const resolver = useCallback(
    async (id: string, accion: 'aprobar' | 'rechazar') => {
      if (resolvingRef.current !== null) return;
      resolvingRef.current = id;
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
        resolvingRef.current = null;
        setResolvingId(null);
      }
    },
    [fetchPendientes, fetchStock, fetchMovimientos, fetchResumen]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter(
        i =>
          (stockFilter !== 'abiertas' ||
            Number(i.ml_abierta ?? 0) > 0 ||
            Number(i.botellas_vacias_shots ?? 0) > 0) &&
          (!term ||
            i.producto_nombre.toLowerCase().includes(term) ||
            (i.categoria_nombre ?? '').toLowerCase().includes(term) ||
            i.nombre.toLowerCase().includes(term) ||
            (i.codigo_barras || '').toLowerCase().includes(term) ||
            (i.producto_codigo || '').toLowerCase().includes(term))
      )
      .sort((a, b) => {
        const compared =
          sortField === 'stock_bar'
            ? Number(a.stock_bar ?? 0) - Number(b.stock_bar ?? 0)
            : String(a[sortField as keyof BarStockItem] ?? '').localeCompare(
                String(b[sortField as keyof BarStockItem] ?? ''),
                'es',
                { numeric: true, sensitivity: 'base' }
              );
        return sortDirection === 'asc' ? compared : -compared;
      });
  }, [items, search, stockFilter, sortField, sortDirection]);

  const botellasAbiertasDetalle = useMemo(
    () =>
      items
        .filter(item => (item.botellas_abiertas?.length ?? 0) > 0 || Number(item.ml_abierta) > 0)
        .map(item => {
          const mlCliente = resolveShotMl(item.ml_shot, shotMl);
          const mlAnfitriona = resolveShotMlAnfitriona(item.ml_shot_anfitriona, mlCliente);
          const abiertas = item.botellas_abiertas ?? [];
          const disponibles = abiertas.length
            ? abiertas.reduce((total, botella) => total + Number(botella.ml_restante || 0), 0)
            : Number(item.ml_abierta || 0);
          return {
            id: item.id,
            producto_nombre: item.producto_nombre,
            foto: item.foto || item.producto_foto,
            presentacion_nombre: item.nombre,
            cantidad: abiertas.length || 1,
            ml_disponibles: disponibles,
            venta_corto_habilitada: (parseSavedOptions(item.opciones_venta) ?? []).some(
              option => option.tipo === 'shot'
            ),
            ml_cliente: mlCliente,
            ml_anfitriona: mlAnfitriona,
            shots_anfitriona_disponibles: Math.floor(disponibles / mlAnfitriona),
            shots_disponibles: Math.floor(disponibles / mlCliente)
          };
        }),
    [items, shotMl]
  );

  const totalBar = useMemo(
    () => items.reduce((acc, i) => acc + Number(i.stock_bar ?? 0), 0),
    [items]
  );
  const filteredPendientes = useMemo(() => {
    const term = searchPendientes.trim().toLocaleLowerCase('es');
    return pendientes.filter(
      row =>
        !term ||
        [
          row.producto_nombre,
          row.presentacion_nombre,
          row.usuario_nombre,
          row.categoria_nombre
        ].some(value =>
          String(value ?? '')
            .toLocaleLowerCase('es')
            .includes(term)
        )
    );
  }, [pendientes, searchPendientes]);
  const filteredMovimientos = useMemo(() => {
    const term = searchHistorial.trim().toLocaleLowerCase('es');
    return movimientos.filter(
      row =>
        (filtroTipoMov === 'todos' || row.tipo === filtroTipoMov) &&
        (!term ||
          [
            row.producto_nombre,
            row.presentacion_nombre,
            row.usuario_nombre,
            row.usuario_apellido,
            row.usuario_nick,
            // Los códigos de las botellas también son buscables en el historial.
            (row.unidades_consumidas ?? []).map(unidad => unidad.codigo).join(' ')
          ].some(value =>
            String(value ?? '')
              .toLocaleLowerCase('es')
              .includes(term)
          ))
    );
  }, [movimientos, searchHistorial, filtroTipoMov]);
  /** Filtro que la interfaz aplica sobre la página ya recibida. */
  const hayFiltroHistorial =
    filtroTipoMov !== 'todos' ||
    searchHistorial.trim() !== '' ||
    desdeHistorial !== '' ||
    hastaHistorial !== '';
  const filteredDevoluciones = useMemo(() => {
    const term = searchEnvases.trim().toLocaleLowerCase('es');
    return devoluciones.filter(
      row =>
        !term ||
        [
          row.codigo,
          row.codigo_barras,
          row.producto_nombre,
          row.presentacion_nombre,
          row.usuario_nombre,
          row.usuario_apellido,
          row.usuario_nick
        ].some(value =>
          String(value ?? '')
            .toLocaleLowerCase('es')
            .includes(term)
        )
    );
  }, [devoluciones, searchEnvases]);
  const codigoEnvaseNormalizado = searchEnvases.trim().toLocaleUpperCase('es');
  const esCodigoEnvase =
    /^\d{8,20}$/.test(codigoEnvaseNormalizado) || /^LM-\d+$/i.test(codigoEnvaseNormalizado);
  const envaseYaDevuelto = devoluciones.some(row =>
    [row.codigo, row.codigo_barras].some(
      value =>
        String(value ?? '')
          .trim()
          .toLocaleUpperCase('es') === codigoEnvaseNormalizado
    )
  );

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
            {stockError
              ? 'Stock no disponible'
              : isLoading
                ? 'Cargando stock…'
                : `${totalBar} unidades en bar`}
          </Badge>
        </div>

        {tab === 'envases' ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            <MetricCard
              label='Entregados en esta sesión'
              badge='Envases'
              value={entregadosSesion}
              icon={<PackageCheck aria-hidden='true' />}
              tone='emerald'
            />
            <MetricCard
              label='Rechazados en esta sesión'
              badge='Envases'
              value={rechazadosSesion}
              icon={<AlertTriangle aria-hidden='true' />}
              tone='red'
            />
            <MetricCard
              label='Pendientes de verificar'
              badge='Sin conexión'
              value={envasesEnCola}
              icon={<Clock aria-hidden='true' />}
              tone='amber'
              footer={
                <p>{sincronizandoEnvases ? 'Sincronizando con el servidor…' : 'En cola local'}</p>
              }
            />
          </div>
        ) : summaryError ? (
          <ListLoadError message='No se pudo cargar el resumen del bar.' onRetry={fetchResumen} />
        ) : (
          <BarStatsCards resumen={resumen} botellasAbiertas={botellasAbiertasDetalle} />
        )}

        <Tabs value={tab} onValueChange={setTab} className='w-full'>
          <div className='flex justify-center overflow-x-auto pb-2'>
            <TabsList className='mx-auto h-auto w-max max-w-full justify-center gap-1 rounded-full p-1'>
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
              <TabsTrigger value='colaciones' className={barTabClassName}>
                <GlassWater className='w-3.5 h-3.5' />
                Colación
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
            <div className='flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-3'>
              <SortSelect
                className='w-full sm:w-48'
                field={sortField}
                direction={sortDirection}
                options={[
                  { value: 'producto_nombre', label: 'Producto' },
                  { value: 'nombre', label: 'Presentación' },
                  { value: 'categoria_nombre', label: 'Categoría' },
                  { value: 'stock_bar', label: 'Stock' }
                ]}
                onChange={(field, direction) => {
                  setSortField(field);
                  setSortDirection(direction);
                }}
              />
              <div className='relative min-w-0 flex-1 basis-full sm:basis-64'>
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
                    : 'Mostrar botellas abiertas y vacías por cortos'}
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
          {tab === 'pendientes' && (
            <div className='relative rounded-2xl border bg-card p-3'>
              <Search className='pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={searchPendientes}
                onChange={event => setSearchPendientes(event.target.value)}
                placeholder='Buscar producto, presentación o solicitante'
                aria-label='Buscar transferencias pendientes'
                className='h-11 rounded-full pl-9 pr-12'
              />
              {searchPendientes && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='absolute right-5 top-1/2 size-9 -translate-y-1/2 rounded-full'
                  aria-label='Limpiar búsqueda de pendientes'
                  onClick={() => setSearchPendientes('')}
                >
                  <X />
                </Button>
              )}
            </div>
          )}
          {tab === 'historial' && (
            <div className='rounded-2xl border bg-card p-3'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={searchHistorial}
                  onChange={event => setSearchHistorial(event.target.value)}
                  placeholder='Buscar producto, presentación o usuario'
                  aria-label='Buscar en el historial del bar'
                  className='h-11 rounded-full pl-9 pr-12'
                />
                {searchHistorial && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='absolute right-5 top-1/2 size-9 -translate-y-1/2 rounded-full'
                    aria-label='Limpiar búsqueda del historial'
                    onClick={() => setSearchHistorial('')}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <div
                role='group'
                aria-label='Filtrar por tipo de movimiento'
                className='mt-3 flex flex-wrap gap-2'
              >
                {TIPOS_MOVIMIENTO.map(tipo => (
                  <Button
                    key={tipo.valor}
                    type='button'
                    size='sm'
                    variant={filtroTipoMov === tipo.valor ? 'secondary' : 'outline'}
                    aria-pressed={filtroTipoMov === tipo.valor}
                    onClick={() => setFiltroTipoMov(tipo.valor)}
                    className='h-8 rounded-full px-3 text-xs'
                  >
                    {tipo.etiqueta}
                  </Button>
                ))}
              </div>
              <div className='mt-3 flex flex-wrap items-end gap-3'>
                <div className='space-y-1'>
                  <label
                    htmlFor='historial-desde'
                    className='text-xs font-medium text-muted-foreground'
                  >
                    Fecha desde
                  </label>
                  <Input
                    id='historial-desde'
                    type='date'
                    value={desdeHistorial}
                    max={hastaHistorial || undefined}
                    onChange={event => setDesdeHistorial(event.target.value)}
                    className='h-11 w-[11rem] rounded-full px-4'
                  />
                </div>
                <div className='space-y-1'>
                  <label
                    htmlFor='historial-hasta'
                    className='text-xs font-medium text-muted-foreground'
                  >
                    Fecha hasta
                  </label>
                  <Input
                    id='historial-hasta'
                    type='date'
                    value={hastaHistorial}
                    min={desdeHistorial || undefined}
                    onChange={event => setHastaHistorial(event.target.value)}
                    className='h-11 w-[11rem] rounded-full px-4'
                  />
                </div>
                {desdeHistorial || hastaHistorial ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    aria-label='Limpiar filtro de fecha'
                    onClick={() => {
                      setDesdeHistorial('');
                      setHastaHistorial('');
                    }}
                    className='h-11 gap-1 rounded-full px-3 text-xs'
                  >
                    <X className='size-3.5' aria-hidden='true' />
                    Limpiar fechas
                  </Button>
                ) : null}
              </div>
            </div>
          )}
          {tab === 'colaciones' && (
            <div className='relative rounded-2xl border bg-card p-3'>
              <Search className='pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={searchColaciones}
                onChange={event => setSearchColaciones(event.target.value)}
                placeholder='Buscar trabajador o bebida'
                aria-label='Buscar colaciones'
                className='h-11 rounded-full pl-9 pr-12'
              />
              {searchColaciones && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='absolute right-5 top-1/2 size-9 -translate-y-1/2 rounded-full'
                  aria-label='Limpiar búsqueda de colaciones'
                  onClick={() => setSearchColaciones('')}
                >
                  <X />
                </Button>
              )}
            </div>
          )}
          {tab === 'envases' && (
            <form
              className='flex flex-col gap-2 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-3'
              onSubmit={event => {
                event.preventDefault();
                if (puedeDevolver && esCodigoEnvase && !envaseYaDevuelto && !verificando) {
                  void enviarEscaneo(codigoEnvaseNormalizado);
                }
              }}
            >
              <div className='relative min-w-0 flex-1'>
                <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  autoFocus
                  ref={inputEnvaseRef}
                  value={searchEnvases}
                  onChange={event => setSearchEnvases(event.target.value)}
                  placeholder='Busca devoluciones o escanea un código de envase'
                  aria-label='Buscar devoluciones o escanear un envase'
                  className='h-11 rounded-full pl-9 pr-12'
                />
                {searchEnvases && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-full'
                    aria-label='Limpiar búsqueda o código de envase'
                    onClick={() => setSearchEnvases('')}
                  >
                    <X />
                  </Button>
                )}
              </div>
              {puedeDevolver && (
                <Button
                  type='submit'
                  disabled={verificando || !esCodigoEnvase || envaseYaDevuelto}
                  className='h-11 shrink-0 gap-2 rounded-full'
                  title={envaseYaDevuelto ? 'Este envase ya figura en las devoluciones' : undefined}
                >
                  <PackageCheck className='size-4' />
                  {verificando ? 'Verificando...' : 'Verificar y marcar'}
                </Button>
              )}
              <Button
                type='button'
                variant='outline'
                className='h-11 shrink-0 gap-2 rounded-full'
                onClick={alternarAvisoSonoro}
                aria-pressed={avisoSonoro}
                aria-label={
                  avisoSonoro ? 'Silenciar avisos de escaneo' : 'Activar avisos de escaneo'
                }
              >
                {avisoSonoro ? <Bell className='size-4' /> : <BellOff className='size-4' />}
                <span className='hidden sm:inline'>
                  {avisoSonoro ? 'Aviso sonoro' : 'Sin aviso'}
                </span>
              </Button>
            </form>
          )}

          <TabsContent value='productos' className='mt-4'>
            {stockError ? (
              <ListLoadError message='No se pudieron cargar los productos.' onRetry={fetchStock} />
            ) : (
              <>
                <div className='mb-4'>
                  <p className='text-xs text-muted-foreground' role='status'>
                    {isLoading
                      ? 'Cargando productos…'
                      : `${filtered.length} ${filtered.length === 1 ? 'presentación' : 'presentaciones'}`}
                  </p>
                </div>
                <BoneyardSkeleton name='bar-table' loading={isLoading}>
                  {showTableView ? (
                    <div className='overflow-hidden rounded-3xl border bg-card'>
                      <div className='overflow-x-auto'>
                        <Table className='min-w-full text-center'>
                          <TableHeader>
                            <TableRow className='hover:bg-transparent'>
                              <TableHead>Foto</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead>Precio venta</TableHead>
                              <TableHead>Comisión</TableHead>
                              <TableHead>Anfitrionas</TableHead>
                              <TableHead>Stock bar</TableHead>
                              <TableHead>Stock bodega</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.length === 0 ? (
                              <TableRow key='empty'>
                                <TableCell
                                  colSpan={7}
                                  className='text-center text-muted-foreground'
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
                                    <TableCell className='sm:px-4 text-center'>
                                      <Button
                                        variant='unstyled'
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
                                      </Button>
                                    </TableCell>
                                    <TableCell className='sm:px-4 text-center sm:text-sm font-medium'>
                                      <div className='flex min-w-0 flex-col items-start gap-1.5 text-left'>
                                        {item.categoria_nombre?.trim() && (
                                          <Badge
                                            variant='outline'
                                            className='max-w-full break-words whitespace-normal'
                                          >
                                            {item.categoria_nombre}
                                          </Badge>
                                        )}
                                        <span className='text-sm font-semibold leading-snug'>
                                          {item.producto_nombre}
                                        </span>
                                        <span className='inline-flex shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium whitespace-nowrap'>
                                          {item.nombre}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
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
                                    <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
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
                                    <TableCell className='sm:px-4 text-center'>
                                      <BarAnfitrionas
                                        productoId={item.producto_id}
                                        categoriaNombre={item.categoria_nombre}
                                        maxAnfitrionas={item.max_anfitrionas}
                                        precio={item.precio_venta}
                                        compact
                                      />
                                    </TableCell>
                                    <TableCell className='sm:px-4 text-center'>
                                      <Badge
                                        className={`rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm ${Number(item.stock_bar ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                      >
                                        {Number(item.stock_bar ?? 0) > 0
                                          ? item.stock_bar
                                          : 'Agotado'}
                                      </Badge>
                                      {Number(item.ml_abierta ?? 0) > 0 && (
                                        <p className='mt-1 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                          Abierta: {Number(item.ml_abierta)} de {capacidadBotella}{' '}
                                          ml
                                          {mlPorShot > 0
                                            ? ` · ≈${Math.floor(Number(item.ml_abierta) / mlPorShot)} cortos`
                                            : ''}
                                        </p>
                                      )}
                                      {Number(item.botellas_vacias_shots ?? 0) > 0 && (
                                        <p className='mt-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400'>
                                          Vacías por cortos o dentro de tolerancia:{' '}
                                          {Number(item.botellas_vacias_shots)} · pendientes de
                                          devolución
                                        </p>
                                      )}
                                      {Number(item.ml_servidos ?? 0) > 0 && (
                                        <p className='mt-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-500'>
                                          Servido: {Number(item.ml_servidos)} ml
                                        </p>
                                      )}
                                    </TableCell>
                                    <TableCell className='sm:px-4 text-center'>
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
                        <BarProductGrid items={filtered} />
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
              </>
            )}
          </TabsContent>

          <TabsContent value='pendientes' className='mt-4'>
            {pendingError ? (
              <ListLoadError
                message='No se pudieron cargar las recepciones pendientes.'
                onRetry={fetchPendientes}
              />
            ) : (
              <>
                <div className='space-y-2 mb-4'>
                  <p className='text-sm text-muted-foreground'>
                    Solicitudes pendientes de aprobación del bar.
                  </p>
                </div>
                <PendingApprovals
                  pendientes={filteredPendientes}
                  puedeAprobar={puedeAprobar}
                  resolvingId={resolvingId}
                  loading={loadingPend}
                  onResolve={resolver}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value='historial' className='mt-4'>
            {movementsError ? (
              <ListLoadError
                message='No se pudo cargar el historial de movimientos.'
                onRetry={fetchMovimientos}
              />
            ) : (
              <>
                <BoneyardSkeleton name='bar-history' loading={loadingMovs}>
                  <div className='overflow-hidden rounded-3xl border bg-card'>
                    <div className='overflow-x-auto'>
                      <Table className='min-w-full text-center'>
                        <TableHeader>
                          <TableRow className='hover:bg-transparent'>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Presentación</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Precio venta</TableHead>
                            <TableHead>Comisión</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Recepción / resolución</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMovimientos.length === 0 ? (
                            <TableRow key='empty'>
                              <TableCell colSpan={10} className='text-center text-muted-foreground'>
                                {loadingMovs
                                  ? 'Cargando...'
                                  : hayFiltroHistorial
                                    ? 'Sin movimientos que coincidan con el filtro.'
                                    : 'Sin movimientos registrados.'}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredMovimientos.map(m => (
                              <TableRow
                                key={m.id}
                                className='border-b transition-colors hover:bg-muted/50'
                              >
                                <TableCell className='sm:px-4 text-center sm:text-sm whitespace-nowrap'>
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
                                <TableCell className='sm:px-4 text-center sm:text-sm font-medium'>
                                  {m.producto_nombre || '—'}
                                  {(m.unidades_consumidas?.length ?? 0) > 0 ? (
                                    <ul className='mt-1 space-y-0.5 text-[11px] font-normal text-muted-foreground'>
                                      {(m.unidades_consumidas ?? []).map(unidad => (
                                        <li key={unidad.unidad_id} className='tabular-nums'>
                                          {unidad.codigo || 'Sin código'}: {unidad.ml_consumido} ml
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </TableCell>
                                <TableCell className='sm:px-4 text-center sm:text-sm'>
                                  {m.presentacion_nombre || '—'}
                                </TableCell>
                                <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                                  {m.tipo === 'colacion' ? (
                                    <>
                                      {Number(m.ml ?? 0) > 0 && (
                                        <p className='text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                          {Number(m.ml)} ml
                                        </p>
                                      )}
                                      {Number(m.cantidad ?? 0) > 0 && (
                                        <p className='text-[10px] uppercase text-muted-foreground'>
                                          {m.cantidad} un.
                                        </p>
                                      )}
                                      {Number(m.ml ?? 0) === 0 &&
                                        Number(m.cantidad ?? 0) === 0 &&
                                        '—'}
                                    </>
                                  ) : (
                                    <>
                                      {m.cantidad}
                                      {Number(m.ml ?? 0) > 0 && (
                                        <p className='text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                          {Number(m.ml)} ml
                                        </p>
                                      )}
                                    </>
                                  )}
                                </TableCell>
                                <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
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
                                <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
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
                                <TableCell className='sm:px-4 text-center sm:text-sm font-mono'>
                                  {m.usuario_nombre || m.usuario_nick || '—'}
                                </TableCell>
                                <TableCell>
                                  {m.tipo === 'colacion'
                                    ? 'Colación'
                                    : m.tipo === 'venta'
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
                                  {m.tipo === 'venta' || m.tipo === 'colacion' ? (
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
                {metaMovs && metaMovs.total > 0 && (
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <p role='status' className='text-sm text-muted-foreground'>
                      {metaMovs.total} {metaMovs.total === 1 ? 'movimiento' : 'movimientos'}
                      {hayFiltroHistorial ? ` · ${filteredMovimientos.length} en esta página` : ''}
                    </p>
                    <Paginate
                      page={paginaMovs}
                      totalPages={metaMovs.paginas}
                      setPage={setPaginaMovs}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value='colaciones' className='mt-4'>
            <ColacionesTab searchTerm={searchColaciones} />
          </TabsContent>

          <TabsContent value='envases' className='mt-4'>
            {containersError ? (
              <ListLoadError
                message='No se pudo cargar el historial de envases.'
                onRetry={fetchDevoluciones}
              />
            ) : (
              <>
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
                              Envase entregado a la bodega
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
                      tituloAceptados='Entregados a la bodega'
                      mostrarContadores={false}
                      mostrarLimpiar={false}
                      mostrarAvisoSonoro={false}
                    />

                    <div>
                      <p className='text-xs font-medium text-muted-foreground mb-2'>
                        Devoluciones registradas ({filteredDevoluciones.length})
                      </p>
                      <BoneyardSkeleton name='bar-containers' loading={loadingDevol}>
                        <div className='overflow-hidden rounded-3xl border bg-card'>
                          <div className='overflow-x-auto'>
                            <Table className='min-w-full text-center'>
                              <TableHeader>
                                <TableRow className='hover:bg-transparent'>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Producto</TableHead>
                                  <TableHead>Presentación</TableHead>
                                  <TableHead>Compra</TableHead>
                                  <TableHead>Merma</TableHead>
                                  <TableHead>Entregado por</TableHead>
                                  <TableHead>Recepción en bodega</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredDevoluciones.length === 0 ? (
                                  <TableRow key='empty'>
                                    <TableCell
                                      colSpan={8}
                                      className='text-center text-muted-foreground'
                                    >
                                      {loadingDevol
                                        ? 'Cargando...'
                                        : 'Sin envases entregados todavía.'}
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  filteredDevoluciones.map(d => (
                                    <TableRow
                                      key={d.id}
                                      className='border-b transition-colors hover:bg-muted/50'
                                    >
                                      <TableCell className='sm:px-4 text-center sm:text-sm whitespace-nowrap'>
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
                                      <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                                        {d.codigo}
                                      </TableCell>
                                      <TableCell className='sm:px-4 text-center sm:text-sm font-medium'>
                                        {d.producto_nombre || '—'}
                                      </TableCell>
                                      <TableCell className='sm:px-4 text-center sm:text-sm'>
                                        {d.presentacion_nombre || '—'}
                                      </TableCell>
                                      <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                                        {d.compra_folio || '—'}
                                      </TableCell>
                                      <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                                        {Number(d.ml_merma ?? 0)} ml
                                      </TableCell>
                                      <TableCell className='sm:px-4 text-center sm:text-sm'>
                                        {d.usuario_nombre || d.usuario_nick
                                          ? `${d.usuario_nombre || ''} ${d.usuario_apellido || ''}`.trim() ||
                                            d.usuario_nick
                                          : '—'}
                                      </TableCell>
                                      <TableCell className='sm:px-4 text-center sm:text-sm'>
                                        {d.pendiente_confirmacion ? (
                                          <Badge className='bg-amber-100 text-amber-700 rounded-full px-2 sm:px-3 py-1 text-xs'>
                                            Pendiente de bodega
                                          </Badge>
                                        ) : (
                                          <>
                                            <Badge className='bg-green-100 text-green-700 rounded-full px-2 sm:px-3 py-1 text-xs'>
                                              Recibido
                                            </Badge>
                                            <p className='mt-1 text-[10px] text-gray-500'>
                                              {d.confirmado_nombre || d.confirmado_nick || '—'}
                                              {d.fecha_confirmacion
                                                ? ` · ${new Date(
                                                    d.fecha_confirmacion
                                                  ).toLocaleString('es-CL', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                  })}`
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
