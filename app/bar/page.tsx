'use client';
import { fetchCollection } from '@/lib/api/fetchCollection';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarPageHeader, BarSummaryRow } from '@/components/bar/BarPageHeader';
import { BarTabsList } from '@/components/bar/BarTabsNav';
import { BarProductosTab } from '@/components/bar/BarProductosTab';
import { BarPendientesTab } from '@/components/bar/BarPendientesTab';
import { BarHistorialTab, type Movimiento } from '@/components/bar/BarHistorialTab';
import { BarEnvasesTab } from '@/components/bar/BarEnvasesTab';
import {
  BarColacionesToolbar,
  BarCortesiasToolbar,
  BarEnvasesToolbar,
  BarHistorialToolbar,
  BarPendientesToolbar,
  BarProductosToolbar,
  type FiltroTipoMovimiento
} from '@/components/bar/BarTabToolbars';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useTransferPermissions } from '@/hooks/transfers/useTransferPermissions';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { type BarStockItem } from '@/components/bar/TransferModal';
import { moverEnListadoFiltrado } from '@/components/bar/barOrder';
import { useConfig } from '@/hooks/shared/useConfigValue';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import type { DevolucionEnvaseRegistro, ShotsSummary } from '@/modules/inventario/contracts';
import { useContainerScan } from '@/hooks/products/useContainerScan';
import { ColacionesTab } from '@/components/meals/ColacionesTab';
import { CortesiasTab } from '@/components/bar/CortesiasTab';

import type { TransferRecord } from '@/types/transfer';

export default function BarPage() {
  const [items, setItems] = useState<BarStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchPendientes, setSearchPendientes] = useState('');
  const [searchHistorial, setSearchHistorial] = useState('');
  const [filtroTipoMov, setFiltroTipoMov] = useState<FiltroTipoMovimiento>('todos');
  const [searchEnvases, setSearchEnvases] = useState('');
  const [searchColaciones, setSearchColaciones] = useState('');
  const [searchCortesias, setSearchCortesias] = useState('');
  // El orden manual es el que se arma con drag & drop y se guarda por
  // presentación; cualquier otro criterio solo ordena en pantalla y, si se
  // arrastra desde ahí, se vuelve al manual al soltar.
  const [sortField, setSortField] = useState('orden');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // Aviso pasajero que explica por qué el listado se reacomodó al arrastrar
  // desde un orden distinto al manual.
  const [avisoOrdenManual, setAvisoOrdenManual] = useState(false);
  const avisoOrdenManualRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const savingOrderRef = useRef(false);
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
  useEffect(
    () => () => {
      if (avisoOrdenManualRef.current) clearTimeout(avisoOrdenManualRef.current);
    },
    []
  );
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
  // Reordenar es editar el catálogo que ve el bar: par del catálogo `products.edit`
  // (el flag `write` de la API sale de ahí con matrixFlagsFor).
  const canReorder = hasPermission('products', 'edit');

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
        // Orden manual: el arreglo ya viene en el orden guardado por el bar.
        if (sortField === 'orden') return 0;
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

  /**
   * Mueve una presentación dentro de lo que dejan ver los filtros y guarda el
   * orden completo. El listado se ve movido antes de la respuesta; si el
   * servidor falla, se vuelve al orden anterior.
   *
   * Arrastrar implica orden manual: si el listado venía ordenado por otro
   * criterio, al soltar se cambia a orden manual para que quede a la vista lo
   * que el usuario acaba de mover.
   */
  const moverPresentacion = useCallback(
    async (activeId: string, overId: string) => {
      if (!canReorder || savingOrderRef.current) return;
      const nuevoOrden = moverEnListadoFiltrado(items, filtered, activeId, overId);
      if (!nuevoOrden) return;
      const anterior = items;
      setItems(nuevoOrden);
      if (sortField !== 'orden') {
        setSortField('orden');
        setAvisoOrdenManual(true);
        if (avisoOrdenManualRef.current) clearTimeout(avisoOrdenManualRef.current);
        avisoOrdenManualRef.current = setTimeout(() => setAvisoOrdenManual(false), 6000);
      }
      savingOrderRef.current = true;
      setSavingOrder(true);
      try {
        const res = await fetch('/api/bar/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            presentation_orders: nuevoOrden.map((item, index) => ({
              id: item.id,
              orden: index + 1
            }))
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success)
          throw new Error(data.message || 'No se pudo guardar el orden');
        toast.success('Orden actualizado correctamente');
      } catch (error) {
        setItems(anterior);
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el orden');
      } finally {
        savingOrderRef.current = false;
        setSavingOrder(false);
      }
    },
    [canReorder, sortField, items, filtered]
  );
  // Se puede arrastrar con cualquier orden visible: al soltar se guarda y se
  // pasa a orden manual.
  const puedeReordenar = canReorder;

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

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setAvisoOrdenManual(false);
  };
  const handleClearProductFilters = () => {
    setSearch('');
    setStockFilter('todos');
  };
  const handleLimpiarFechasHistorial = () => {
    setDesdeHistorial('');
    setHastaHistorial('');
  };
  const handleEnvasesSubmit = () => {
    if (puedeDevolver && esCodigoEnvase && !envaseYaDevuelto && !verificando) {
      void enviarEscaneo(codigoEnvaseNormalizado);
    }
  };

  return (
    <PermissionGuard module='products' action='view'>
      <div className='flex w-full min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-10'>
        <BarPageHeader stockError={stockError} isLoading={isLoading} totalBar={totalBar} />
        <BarSummaryRow
          tab={tab}
          entregadosSesion={entregadosSesion}
          rechazadosSesion={rechazadosSesion}
          envasesEnCola={envasesEnCola}
          sincronizandoEnvases={sincronizandoEnvases}
          summaryError={summaryError}
          onRetrySummary={fetchResumen}
          resumen={resumen}
          botellasAbiertas={botellasAbiertasDetalle}
        />

        <Tabs value={tab} onValueChange={setTab} className='w-full'>
          <BarTabsList pendientesCount={pendientes.length} puedeDevolver={puedeDevolver} />

          {tab === 'productos' && (
            <BarProductosToolbar
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              search={search}
              onSearchChange={setSearch}
              stockFilter={stockFilter}
              onToggleStockFilter={() =>
                setStockFilter(value => (value === 'todos' ? 'abiertas' : 'todos'))
              }
              showTableView={showTableView}
              onToggleTableView={() => setShowTableView(value => !value)}
            />
          )}
          {tab === 'pendientes' && (
            <BarPendientesToolbar search={searchPendientes} onSearchChange={setSearchPendientes} />
          )}
          {tab === 'historial' && (
            <BarHistorialToolbar
              search={searchHistorial}
              onSearchChange={setSearchHistorial}
              filtroTipoMov={filtroTipoMov}
              onFiltroTipoMovChange={setFiltroTipoMov}
              desde={desdeHistorial}
              hasta={hastaHistorial}
              onDesdeChange={setDesdeHistorial}
              onHastaChange={setHastaHistorial}
              onLimpiarFechas={handleLimpiarFechasHistorial}
            />
          )}
          {tab === 'colaciones' && (
            <BarColacionesToolbar search={searchColaciones} onSearchChange={setSearchColaciones} />
          )}
          {tab === 'cortesias' && (
            <BarCortesiasToolbar search={searchCortesias} onSearchChange={setSearchCortesias} />
          )}
          {tab === 'envases' && (
            <BarEnvasesToolbar
              search={searchEnvases}
              onSearchChange={setSearchEnvases}
              inputRef={inputEnvaseRef}
              puedeDevolver={puedeDevolver}
              esCodigoEnvase={esCodigoEnvase}
              envaseYaDevuelto={envaseYaDevuelto}
              verificando={verificando}
              onSubmit={handleEnvasesSubmit}
              avisoSonoro={avisoSonoro}
              onAlternarSonido={alternarAvisoSonoro}
            />
          )}

          <TabsContent value='productos' className='mt-4'>
            <BarProductosTab
              stockError={stockError}
              onRetryStock={fetchStock}
              isLoading={isLoading}
              filtered={filtered}
              puedeReordenar={puedeReordenar}
              savingOrder={savingOrder}
              avisoOrdenManual={avisoOrdenManual}
              showTableView={showTableView}
              search={search}
              stockFilter={stockFilter}
              onClearFilters={handleClearProductFilters}
              shotMl={shotMl}
              botellaMl={botellaMl}
              onMove={moverPresentacion}
              tablePhoto={tablePhoto}
              onTablePhotoChange={setTablePhoto}
            />
          </TabsContent>

          <TabsContent value='pendientes' className='mt-4'>
            <BarPendientesTab
              pendingError={pendingError}
              onRetry={fetchPendientes}
              pendientes={filteredPendientes}
              puedeAprobar={puedeAprobar}
              resolvingId={resolvingId}
              loading={loadingPend}
              onResolve={resolver}
            />
          </TabsContent>

          <TabsContent value='historial' className='mt-4'>
            <BarHistorialTab
              movementsError={movementsError}
              onRetry={fetchMovimientos}
              loading={loadingMovs}
              movimientos={filteredMovimientos}
              hayFiltro={hayFiltroHistorial}
              meta={metaMovs}
              page={paginaMovs}
              onPageChange={setPaginaMovs}
            />
          </TabsContent>

          <TabsContent value='colaciones' className='mt-4'>
            <ColacionesTab searchTerm={searchColaciones} />
          </TabsContent>

          <TabsContent value='cortesias' className='mt-4'>
            <CortesiasTab searchTerm={searchCortesias} />
          </TabsContent>

          <TabsContent value='envases' className='mt-4'>
            <BarEnvasesTab
              containersError={containersError}
              onRetry={fetchDevoluciones}
              resultado={resultadoEnvase}
              entregadosSesion={entregadosSesion}
              rechazadosSesion={rechazadosSesion}
              envasesEnCola={envasesEnCola}
              sesion={sesionEnvases}
              sincronizando={sincronizandoEnvases}
              avisoSonoro={avisoSonoro}
              onAlternarSonido={alternarAvisoSonoro}
              onLimpiar={limpiarSesionEnvases}
              onReintentar={reintentarEnvases}
              devoluciones={filteredDevoluciones}
              loadingDevol={loadingDevol}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
