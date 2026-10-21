'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  FileSpreadsheet,
  GlassWater,
  LoaderCircle,
  ReceiptText,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { exportarColacionesExcel } from '@/components/colaciones/colacionesExport';
import {
  acompanamientoDeColacion,
  mlColacionConfigurado,
  mlDeColacion
} from '@/lib/business/colacionConfig';
import { reglaColacionPorRol, urlCatalogoColacion } from '@/lib/business/colacionRoles';
import { cn } from '@/lib/utils/utils';
import { horaDeNegocio } from '@/lib/business/timezoneService';
import logger from '@/lib/utils/logger';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

type Worker = { id: string; name: string; lastName: string; nick?: string; role?: string };
type Drink = {
  presentacion_id: string;
  presentacion_nombre: string;
  producto_nombre: string;
  ml_botella?: number | null;
  opciones_venta?: {
    tipo: string;
    ml_colacion?: number;
    acompanamiento?: { tipo?: 'gaseosa' | 'soda'; unidades: number };
    acompanamiento_colacion?: { unidades: number; ml?: number };
  }[];
  foto?: string | null;
  categoria_nombre?: string | null;
  stock_bar?: number;
  ml_abierta?: number;
};
type RecordRow = {
  id: string;
  usuario_id: string;
  trabajador: string;
  nick?: string | null;
  nombre_bebida?: string | null;
  ml_bebida: number;
  acompanamiento?: 'gaseosa' | 'soda' | null;
  acompanamiento_presentacion_id?: string | null;
  acompanamiento_nombre?: string | null;
  registrado_por_nombre: string;
  fecha_crea: string;
};

type AcompanamientoOption = {
  id: string;
  producto_nombre: string;
  nombre: string;
  stock_bar: number;
  /** Ml que quedan en las botellas ya abiertas de esa presentación. */
  ml_abierta: number;
  ml_botella: number | null;
};

function imageUrl(foto?: string | null): string {
  if (!foto || foto === 'default.png' || foto === '') return '/api/images/products/default.png';
  if (foto.startsWith('http')) return foto;
  return `/api/images/products/${foto}`;
}

function opcionBotella(drink: Drink) {
  return Array.isArray(drink.opciones_venta)
    ? drink.opciones_venta.find(option => option.tipo === 'botella')
    : undefined;
}

/**
 * Ml configurados para la colación; null si la opción botella no los define.
 * La cuenta es la del servidor (`mlDeColacion`): la UI y la API calculan lo
 * mismo, así que lo que se registra es lo que se muestra y lo que se descuenta.
 */
function mlColacionConfigurada(drink: Drink): number | null {
  return mlColacionConfigurado(opcionBotella(drink));
}

/** Ml que se entregan; si no hay configuración, la capacidad de la botella. */
function mlColacion(drink: Drink): number {
  return mlDeColacion(opcionBotella(drink), drink.ml_botella);
}

/** Minutos sin refrescar a partir de los cuales el ml abierto se resalta. */
export const MINUTOS_AVISO_ACTUALIZACION = 2;

/**
 * Antigüedad del último catálogo recibido: etiqueta breve para la card
 * ("hace un momento") y aviso cuando el dato lleva varios minutos sin
 * refrescarse.
 */
export function antiguedadActualizacion(
  actualizadoEn: Date | null,
  ahora: number
): { texto: string; desactualizada: boolean } | null {
  if (!actualizadoEn) return null;
  const minutos = Math.floor(Math.max(0, ahora - actualizadoEn.getTime()) / 60_000);
  if (minutos < 1) return { texto: 'hace un momento', desactualizada: false };
  return {
    texto: `hace ${minutos} min`,
    desactualizada: minutos >= MINUTOS_AVISO_ACTUALIZACION
  };
}

function ColacionProductCard({
  drink,
  selected,
  actualizadoEn,
  antiguedad,
  onSelect
}: {
  drink: Drink;
  selected: boolean;
  actualizadoEn: Date | null;
  antiguedad: { texto: string; desactualizada: boolean } | null;
  onSelect: (presentacionId: string) => void;
}) {
  const nombre = `${drink.producto_nombre} ${drink.presentacion_nombre}`.trim();
  const mlProducto = Number(drink.ml_botella ?? 0) || 0;
  const mlConfigurada = mlColacionConfigurada(drink);
  const acompanamiento = acompanamientoDeColacion(opcionBotella(drink));
  const horaActualizacion = actualizadoEn?.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return (
    <Button
      type='button'
      variant='unstyled'
      aria-pressed={selected}
      onClick={() => onSelect(drink.presentacion_id)}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-background text-left font-normal whitespace-normal transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected
          ? 'border-primary ring-2 ring-primary/25'
          : 'hover:border-primary/40 hover:bg-muted/30'
      )}
    >
      <span className='relative block h-24 w-full bg-muted/40'>
        <ProductPhoto src={imageUrl(drink.foto)} alt={nombre} fill className='object-contain p-3' />
        <span
          className={cn(
            'absolute right-2 top-2 flex size-5 items-center justify-center rounded-full',
            selected ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-transparent'
          )}
          aria-hidden='true'
        >
          <Check className='size-3.5' />
        </span>
      </span>
      <span className='flex flex-1 flex-col gap-1 border-t p-3'>
        <span className='line-clamp-2 text-sm font-semibold leading-snug'>
          {drink.producto_nombre}
        </span>
        <span className='line-clamp-1 text-xs text-muted-foreground'>
          {drink.presentacion_nombre}
        </span>
        <span className='mt-auto flex flex-wrap items-center gap-1.5 pt-1'>
          {drink.categoria_nombre?.trim() ? (
            <span className='rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground'>
              {drink.categoria_nombre}
            </span>
          ) : null}
          {Number(drink.stock_bar ?? 0) > 0 ? (
            <span className='text-[11px] text-muted-foreground'>{drink.stock_bar} en bar</span>
          ) : null}
          {Number(drink.ml_abierta ?? 0) > 0 ? (
            <span
              className={cn(
                'text-[11px] tabular-nums',
                antiguedad?.desactualizada
                  ? 'font-medium text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
              )}
              title={
                horaActualizacion
                  ? `Ml abierto actualizado a las ${horaActualizacion}${
                      antiguedad ? ` (${antiguedad.texto})` : ''
                    }`
                  : 'Ml abierto sin actualizar'
              }
            >
              {`Abierta: ${Number(drink.ml_abierta)} ml${
                antiguedad ? ` · ${antiguedad.texto}` : ''
              }`}
            </span>
          ) : null}
          {mlProducto > 0 ? (
            <span className='text-[11px] text-muted-foreground tabular-nums'>
              Producto: {mlProducto} ml
            </span>
          ) : null}
          {mlConfigurada !== null ? (
            <span className='text-[11px] text-muted-foreground tabular-nums'>
              Colación: {mlConfigurada} ml
            </span>
          ) : null}
          {acompanamiento.unidades > 0 ? (
            <span className='text-[11px] text-muted-foreground tabular-nums'>
              Acompañamiento: {acompanamiento.unidades}
              {acompanamiento.ml !== null ? ` × ${acompanamiento.ml} ml` : ''}
            </span>
          ) : null}
        </span>
      </span>
    </Button>
  );
}

/**
 * Carga una lista sin tirar abajo el resto de la pestaña: si falla, devuelve el
 * error y la lista vacía, y la vista muestra ese error en vez de un mensaje que
 * confundiria "no se pudo cargar" con "no hay nada".
 */
async function cargarLista<T>(
  url: string,
  etiqueta: string
): Promise<{ data: T[]; error: string | null }> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      throw new Error(json?.message || `No se pudo cargar ${etiqueta}`);
    }
    return { data: Array.isArray(json.data) ? (json.data as T[]) : [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : `No se pudo cargar ${etiqueta}`
    };
  }
}

export function ColacionesTab({ searchTerm = '' }: { searchTerm?: string }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  // La anfitriona recibe los productos habilitados para colación; los roles de
  // bar reciben solo las bebidas analcohólicas habilitadas. Se cargan ambos
  // catálogos y se muestra el que corresponde al trabajador seleccionado.
  const [productosColacion, setProductosColacion] = useState<Drink[]>([]);
  const [analcoholicas, setAnalcoholicas] = useState<Drink[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [workerId, setWorkerId] = useState('');
  const [presentacionId, setPresentacionId] = useState('');
  const [acompanamientoId, setAcompanamientoId] = useState('');
  const [acompanamientos, setAcompanamientos] = useState<AcompanamientoOption[]>([]);
  const [loadingAcompanamientos, setLoadingAcompanamientos] = useState(false);
  // Error de cada carga por separado: una fuente caída no oculta las demás.
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const [errorAnalcoholicas, setErrorAnalcoholicas] = useState<string | null>(null);
  const [errorRegistros, setErrorRegistros] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Momento del último catálogo recibido; se muestra junto al ml abierto.
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  // Reloj ligero para que la antigüedad mostrada avance sin depender del SSE.
  const [ahora, setAhora] = useState(() => Date.now());
  const [recargando, setRecargando] = useState(false);
  // Descarga del detalle del turno en Excel (una sola a la vez).
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (!actualizadoEn) return;
    const id = setInterval(() => setAhora(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [actualizadoEn]);

  // Antigüedad compartida: la usan las cards y el botón de recarga manual.
  const antiguedadCatalogo = antiguedadActualizacion(actualizadoEn, ahora);
  const { hasOpenCaja, cajaInfo } = useCashRegisterStatus();
  const cajaId = cajaInfo?.id_caja;
  const { hasPermission } = useUserPermissions();
  // El vocabulario es el del catálogo de permisos (`view`/`create`/`edit`), no el
  // de la matriz de flags que usa el servidor (`read`/`write`). `products.read`
  // no existe en el catálogo: ningún rol podía concederlo y el control quedaba
  // muerto para todos los no-administradores.
  //
  // `products.write` (lo que exige el POST) lo conceden `create` y `edit`: el
  // formulario se ofrece a quien tenga cualquiera de los dos, igual que el
  // servidor. Con solo `create` se escondía el formulario a un usuario que sí
  // podía registrar por API.
  const canCreate = hasPermission('products', 'create') || hasPermission('products', 'edit');
  // Mismo permiso que GET /api/colaciones: sin lectura no hay detalle que exportar.
  const canRead = hasPermission('products', 'view');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cajaId) params.set('caja_id', String(cajaId));
      const [usuarios, productos, alcoholic, registros] = await Promise.all([
        cargarLista<Worker>('/api/users?status=active&limit=500', 'el personal'),
        cargarLista<Drink>(urlCatalogoColacion('productos'), 'los productos habilitados'),
        cargarLista<Drink>(urlCatalogoColacion('analcoholicas'), 'las bebidas analcohólicas'),
        cargarLista<RecordRow>(`/api/colaciones?${params}`, 'las colaciones del turno')
      ]);

      setErrorUsuarios(usuarios.error);
      setErrorProductos(productos.error);
      setErrorAnalcoholicas(alcoholic.error);
      setErrorRegistros(registros.error);

      setWorkers(usuarios.data.filter(person => person.role?.toLowerCase() !== 'administrador'));
      setProductosColacion(productos.data);
      setAnalcoholicas(alcoholic.data);
      setActualizadoEn(new Date());
      setRecords(registros.data);
      setPresentacionId(current =>
        [...productos.data, ...alcoholic.data].some(
          (drink: Drink) => drink.presentacion_id === current
        )
          ? current
          : ''
      );
    } finally {
      setLoading(false);
    }
  }, [cajaId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Refresco silencioso: el inventario del bar cambia el ml abierto de cada botella. */
  const refrescarCatalogos = useCallback(async () => {
    const [productosResponse, analcoholicasResponse] = await Promise.all([
      fetch(urlCatalogoColacion('productos'), { cache: 'no-store' }),
      fetch(urlCatalogoColacion('analcoholicas'), { cache: 'no-store' })
    ]);
    const [productosJson, analcoholicasJson] = await Promise.all([
      productosResponse.json(),
      analcoholicasResponse.json()
    ]);
    if (!productosResponse.ok || !productosJson.success)
      throw new Error('No se pudieron actualizar los productos habilitados para colación');
    if (!analcoholicasResponse.ok || !analcoholicasJson.success)
      throw new Error('No se pudieron actualizar las bebidas analcohólicas habilitadas');
    const productos = productosJson.data || [];
    const bebidas = analcoholicasJson.data || [];
    setProductosColacion(productos);
    setAnalcoholicas(bebidas);
    setActualizadoEn(new Date());
    setPresentacionId(current =>
      [...productos, ...bebidas].some((drink: Drink) => drink.presentacion_id === current)
        ? current
        : ''
    );
  }, []);

  // `/api/products/for-sale` cuelga de `/api/products`: cualquier evento de
  // inventario, transferencia o venta refresca el catálogo y su ml abierto.
  useRealtimeRefresh('/api/products/for-sale', refrescarCatalogos);

  /** Recarga manual: mismo refresco silencioso, con aviso si algo falla. */
  const recargarManual = useCallback(async () => {
    if (recargando) return;
    setRecargando(true);
    try {
      await refrescarCatalogos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el catálogo');
    } finally {
      setRecargando(false);
    }
  }, [recargando, refrescarCatalogos]);

  const attended = useMemo(() => new Set(records.map(row => row.usuario_id)), [records]);
  const visibleRecords = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('es');
    return records.filter(
      row =>
        !term ||
        [
          row.trabajador,
          row.nick,
          row.nombre_bebida,
          row.acompanamiento_nombre,
          row.acompanamiento
        ].some(value =>
          String(value ?? '')
            .toLocaleLowerCase('es')
            .includes(term)
        )
    );
  }, [records, searchTerm]);

  /** Descarga en Excel el detalle visible del turno: una fila por colación. */
  const exportarDetalle = async () => {
    if (exportando || visibleRecords.length === 0) return;
    setExportando(true);
    try {
      await exportarColacionesExcel(visibleRecords);
      toast.success('Detalle de colaciones descargado');
    } catch (error) {
      logger.captureException(error, { context: 'ColacionesTab:exportarDetalle' });
      toast.error('No se pudo descargar el detalle de colaciones');
    } finally {
      setExportando(false);
    }
  };

  const selectedWorker = workers.find(worker => worker.id === workerId);
  const reglaRol = reglaColacionPorRol(selectedWorker?.role);
  const esAnfitriona = reglaRol?.catalogo === 'productos';
  const esRolBar = reglaRol?.catalogo === 'analcoholicas';
  const disponibles = esAnfitriona ? productosColacion : esRolBar ? analcoholicas : [];
  const selectedDrink = disponibles.find(drink => drink.presentacion_id === presentacionId);
  // El error del catálogo que corresponde al rol seleccionado: si la carga
  // falló, se dice eso y no "no hay productos con stock".
  const errorCatalogo = esAnfitriona ? errorProductos : esRolBar ? errorAnalcoholicas : null;
  const etiquetaProductos = esAnfitriona
    ? 'Productos habilitados para colación'
    : 'Bebidas analcohólicas';
  // La bebida puede incluir Acompañamiento (unidades y ml configurados en la
  // transferencia); para esos tragos se deja elegir la bebida concreta.
  const configBotella = selectedDrink ? opcionBotella(selectedDrink) : undefined;
  const acompanamientoColacion = acompanamientoDeColacion(configBotella);
  const unidadesAcompanamiento = acompanamientoColacion.unidades;
  const mlAcompanamientoColacion = acompanamientoColacion.ml;
  // El Acompañamiento se ofrece a cualquier rol cuya bebida lo tenga
  // configurado: el servidor lo valida y lo cobra para todos ellos, así que
  // ocultarlo en la UI dejaba unidades configuradas sin entregar.
  const requiereAcompanamiento = unidadesAcompanamiento > 0;
  const selectedAcompanamiento = acompanamientos.find(bebida => bebida.id === acompanamientoId);
  // Lo que se va a descontar del bar al registrar: el servidor hace el mismo
  // cálculo, así el texto anticipa lo que quedará en las botellas abiertas.
  const mlAcompanamientoAEntregar =
    mlAcompanamientoColacion !== null ? mlAcompanamientoColacion * unidadesAcompanamiento : null;

  useEffect(() => {
    if (!requiereAcompanamiento) {
      setAcompanamientos([]);
      setLoadingAcompanamientos(false);
      return;
    }
    const controller = new AbortController();
    setLoadingAcompanamientos(true);
    fetch('/api/bar?acompanamientos=1', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data))
          throw new Error(result.message || 'No se pudieron cargar los acompañamientos');
        if (controller.signal.aborted) return;
        setAcompanamientos(
          result.data.map((bebida: any) => ({
            id: String(bebida.id),
            producto_nombre: String(bebida.producto_nombre),
            nombre: String(bebida.nombre),
            stock_bar: Number(bebida.stock_bar),
            ml_abierta: Number(bebida.ml_abierta ?? 0),
            ml_botella:
              bebida.ml_botella === null || bebida.ml_botella === undefined
                ? null
                : Number(bebida.ml_botella)
          }))
        );
      })
      .catch(error => {
        if (!controller.signal.aborted)
          toast.error(
            error instanceof Error ? error.message : 'No se pudieron cargar los acompañamientos'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAcompanamientos(false);
      });
    return () => controller.abort();
  }, [requiereAcompanamiento]);

  const handleWorkerChange = (id: string) => {
    setWorkerId(id);
    setPresentacionId('');
    setAcompanamientoId('');
  };

  const handleDrinkChange = (id: string) => {
    setPresentacionId(id);
    setAcompanamientoId('');
  };

  const register = async (event: FormEvent) => {
    event.preventDefault();
    if (!workerId) return toast.error('Selecciona un trabajador');
    if (!reglaRol) return toast.error('Este rol no recibe colación');
    if (!selectedDrink)
      return toast.error(
        esAnfitriona
          ? 'Selecciona un producto habilitado para colación'
          : 'Selecciona una bebida analcohólica habilitada para colación'
      );
    // Ml configurados en la transferencia; si no existen, la capacidad de la botella.
    // El servidor valida 0..10000.
    const ml = mlColacion(selectedDrink);
    setSaving(true);
    try {
      const response = await fetch('/api/colaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: workerId,
          presentacion_id: selectedDrink.presentacion_id,
          ml_bebida: ml,
          nombre_bebida:
            `${selectedDrink.producto_nombre} ${selectedDrink.presentacion_nombre}`.trim(),
          acompanamiento: null,
          acompanamiento_presentacion_id: acompanamientoId || null
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo registrar la colación');
      toast.success('Colación registrada');
      setWorkerId('');
      setPresentacionId('');
      setAcompanamientoId('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la colación');
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-5'>
      <section className='rounded-2xl border bg-card p-4 shadow-xs sm:p-5'>
        <div className='mb-4 flex items-start gap-3'>
          <div className='rounded-xl border bg-background p-2.5 text-primary'>
            <GlassWater className='size-5' aria-hidden='true' />
          </div>
          <div>
            <h2 className='font-semibold'>Registrar colación</h2>
            <p className='text-sm text-muted-foreground'>
              Un corto por trabajador durante el turno de caja.
            </p>
          </div>
        </div>

        {canCreate ? (
          <form onSubmit={register} className='space-y-5'>
            <div className={cn('grid gap-4', esRolBar && 'sm:grid-cols-2')}>
              <div className='max-w-md space-y-2'>
                <Label htmlFor='bar-colacion-trabajador'>Trabajador</Label>
                <SearchableSelect
                  id='bar-colacion-trabajador'
                  value={workerId}
                  onChange={handleWorkerChange}
                  placeholder='Seleccionar trabajador'
                  searchPlaceholder='Buscar trabajador…'
                  options={workers
                    .filter(worker => !attended.has(worker.id))
                    .map(worker => ({
                      value: worker.id,
                      label: `${worker.name} ${worker.lastName}${worker.nick ? ` · ${worker.nick}` : ''}`,
                      keywords: [worker.nick ?? '']
                    }))}
                />
              </div>
              {errorUsuarios ? <p className='text-sm text-destructive'>{errorUsuarios}</p> : null}
              {esRolBar && (
                <div
                  role='group'
                  aria-label='Ml del producto seleccionado'
                  className='rounded-2xl border bg-muted/20 p-3'
                >
                  <p className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                    Ml del producto seleccionado
                  </p>
                  {selectedDrink ? (
                    <dl className='mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
                      <dt className='text-muted-foreground'>Producto</dt>
                      <dd className='text-right font-medium tabular-nums'>
                        {Number(selectedDrink.ml_botella ?? 0) > 0
                          ? `${Number(selectedDrink.ml_botella)} ml`
                          : 'Sin ml'}
                      </dd>
                      <dt className='text-muted-foreground'>Colación</dt>
                      <dd className='text-right font-medium tabular-nums'>
                        {mlColacionConfigurada(selectedDrink) !== null
                          ? `${mlColacion(selectedDrink)} ml`
                          : 'Sin configurar'}
                      </dd>
                    </dl>
                  ) : (
                    <p className='mt-2 text-xs text-muted-foreground'>Selecciona una bebida.</p>
                  )}
                </div>
              )}
            </div>

            {reglaRol ? (
              <div className='space-y-3'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <Label>{etiquetaProductos}</Label>
                  <span className='flex items-center gap-2'>
                    <span className='text-xs text-muted-foreground'>
                      {disponibles.length} {disponibles.length === 1 ? 'opción' : 'opciones'}
                    </span>
                    {antiguedadCatalogo?.desactualizada ? (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={recargando}
                        onClick={() => void recargarManual()}
                        aria-label='Actualizar ml abierto'
                        title={`Catálogo sin actualizar ${antiguedadCatalogo.texto}; refresca el ml abierto.`}
                        className='h-7 gap-1 rounded-full border-amber-300/60 px-2.5 text-xs text-amber-600 dark:border-amber-500/40 dark:text-amber-400'
                      >
                        <RefreshCw
                          className={cn('size-3.5', recargando && 'animate-spin')}
                          aria-hidden='true'
                        />
                        {antiguedadCatalogo.texto}
                      </Button>
                    ) : null}
                  </span>
                </div>
                {loading ? (
                  <div className='flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
                    <LoaderCircle className='size-4 animate-spin' /> Cargando opciones…
                  </div>
                ) : errorCatalogo ? (
                  <p className='rounded-xl border border-dashed p-4 text-sm text-destructive'>
                    {errorCatalogo}
                  </p>
                ) : disponibles.length === 0 ? (
                  <p className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
                    {esAnfitriona
                      ? 'No hay productos habilitados para colación con stock en el bar.'
                      : 'No hay bebidas analcohólicas habilitadas para colación con stock en el bar.'}
                  </p>
                ) : (
                  <div
                    role='group'
                    aria-label={etiquetaProductos}
                    className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'
                  >
                    {disponibles.map(drink => (
                      <ColacionProductCard
                        key={drink.presentacion_id}
                        drink={drink}
                        selected={drink.presentacion_id === presentacionId}
                        actualizadoEn={actualizadoEn}
                        antiguedad={antiguedadCatalogo}
                        onSelect={handleDrinkChange}
                      />
                    ))}
                  </div>
                )}
                {selectedDrink && Number(selectedDrink.ml_abierta ?? 0) > 0 ? (
                  <p className='text-xs text-muted-foreground tabular-nums'>
                    Quedan {Number(selectedDrink.ml_abierta)} ml en la botella abierta.
                  </p>
                ) : null}
                <p className='text-xs text-muted-foreground'>
                  {esAnfitriona
                    ? 'La anfitriona recibe los productos habilitados para colación.'
                    : 'Este rol recibe bebidas analcohólicas habilitadas para colación.'}
                </p>
              </div>
            ) : workerId ? (
              <p className='text-sm text-muted-foreground'>Este rol no recibe colación.</p>
            ) : null}

            {requiereAcompanamiento && selectedDrink ? (
              <div className='max-w-md space-y-2'>
                <Label htmlFor='bar-colacion-acompanamiento'>Acompañamiento</Label>
                <SearchableSelect
                  id='bar-colacion-acompanamiento'
                  value={acompanamientoId}
                  onChange={setAcompanamientoId}
                  placeholder={
                    loadingAcompanamientos ? 'Cargando acompañamientos…' : 'Sin acompañamiento'
                  }
                  searchPlaceholder='Buscar bebida analcohólica…'
                  options={[
                    { value: '', label: 'Sin acompañamiento' },
                    ...acompanamientos
                      .filter(
                        bebida =>
                          bebida.id !== selectedDrink.presentacion_id &&
                          bebida.stock_bar >= unidadesAcompanamiento
                      )
                      .map(bebida => ({
                        value: bebida.id,
                        label: `${bebida.producto_nombre} · ${bebida.nombre} · ${bebida.stock_bar} en bar${
                          bebida.ml_abierta > 0 ? ` · ${bebida.ml_abierta} ml abiertos` : ''
                        }`,
                        keywords: [bebida.producto_nombre, bebida.nombre]
                      }))
                  ]}
                />
                <p className='text-xs text-muted-foreground'>
                  Incluye {unidadesAcompanamiento} bebida
                  {unidadesAcompanamiento === 1 ? '' : 's'}
                  {mlAcompanamientoColacion !== null
                    ? ` de ${mlAcompanamientoColacion} ml`
                    : ''}{' '}
                  por botella.
                </p>
                {selectedAcompanamiento ? (
                  <p className='text-xs text-muted-foreground tabular-nums'>
                    {mlAcompanamientoAEntregar !== null
                      ? `Se descontarán ${mlAcompanamientoAEntregar} ml`
                      : `Se descontarán ${unidadesAcompanamiento} unidad${
                          unidadesAcompanamiento === 1 ? '' : 'es'
                        }`}
                    {selectedAcompanamiento.ml_abierta > 0
                      ? ` · quedan ${selectedAcompanamiento.ml_abierta} ml en botellas abiertas`
                      : ''}
                    .
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className='flex justify-center sm:justify-start'>
              <Button
                type='submit'
                className='w-full rounded-full sm:w-auto'
                disabled={
                  saving || loading || !hasOpenCaja || !workerId || !reglaRol || !selectedDrink
                }
              >
                {saving ? (
                  <LoaderCircle className='mr-2 size-4 animate-spin' />
                ) : (
                  <ReceiptText className='mr-2 size-4' />
                )}
                Registrar corto
              </Button>
            </div>
          </form>
        ) : (
          <p className='text-sm text-muted-foreground'>
            No tienes permiso para registrar colaciones.
          </p>
        )}
        {!hasOpenCaja && (
          <p className='mt-3 text-sm text-amber-600'>
            Se requiere una caja abierta para registrar un corto.
          </p>
        )}
      </section>

      <section className='overflow-hidden rounded-2xl border bg-card shadow-xs'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b p-4'>
          <div>
            <h2 className='font-semibold'>Colaciones del turno</h2>
            <p className='text-sm text-muted-foreground'>
              Trabajadores que ya recibieron su corto.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium tabular-nums'>
              {visibleRecords.length} registrados
            </span>
            {canRead ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={exportando || visibleRecords.length === 0}
                onClick={() => void exportarDetalle()}
                aria-label='Descargar detalle de colaciones del turno'
                title='Descarga en Excel las colaciones del turno con su botella y ml'
                className='gap-1.5 rounded-full'
              >
                <FileSpreadsheet className='size-4 text-green-600' aria-hidden='true' />
                {exportando ? 'Exportando…' : 'Excel'}
              </Button>
            ) : null}
          </div>
        </div>
        {loading ? (
          <div className='flex items-center gap-2 p-6 text-sm text-muted-foreground'>
            <LoaderCircle className='size-4 animate-spin' /> Cargando colaciones…
          </div>
        ) : errorRegistros ? (
          <div className='p-6 text-sm text-destructive'>{errorRegistros}</div>
        ) : visibleRecords.length === 0 ? (
          <div className='p-8 text-center'>
            <GlassWater className='mx-auto mb-2 size-7 text-muted-foreground' />
            <p className='font-medium'>
              {searchTerm
                ? 'No hay colaciones que coincidan'
                : 'Aún no hay colaciones en este turno'}
            </p>
            <p className='mt-1 text-sm text-muted-foreground'>
              Los registros aparecerán aquí al entregar un corto.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table className='min-w-[640px]'>
              <TableHeader>
                <TableRow>
                  <TableHead>Trabajador</TableHead>
                  <TableHead>Bebida</TableHead>
                  <TableHead>Ml</TableHead>
                  <TableHead>Acompañamiento</TableHead>
                  <TableHead>Registró</TableHead>
                  <TableHead>Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecords.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>
                      {row.trabajador}
                      {row.nick ? (
                        <span className='ml-1 text-muted-foreground'>({row.nick})</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.nombre_bebida || 'Corto'}</TableCell>
                    <TableCell className='tabular-nums'>{row.ml_bebida} ml</TableCell>
                    <TableCell className={cn(!row.acompanamiento_nombre && 'capitalize')}>
                      {row.acompanamiento_nombre || row.acompanamiento || '—'}
                    </TableCell>
                    <TableCell>{row.registrado_por_nombre}</TableCell>
                    <TableCell>{horaDeNegocio(row.fecha_crea)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
