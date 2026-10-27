'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, RefreshCw, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { urlProductosParaVenta } from '@/lib/constants/api-endpoints';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { fechaDeNegocio } from '@/lib/business/timezoneService';
import { productImageUrl } from '@/lib/utils/productImage';
import { cn } from '@/lib/utils/utils';

type JsonRecord = Record<string, unknown>;

/** Fila de la cola del bar: una persona que todavía no recibió su bebida. */
type EntradaPendiente = {
  id: string;
  grupo_registro_id: string | null;
  cliente_nombre: string | null;
  monto_entrada: number;
  metodo_pago: string;
  fecha: string;
  hora: string;
  caja_id: string;
  registrado_por_nombre: string;
};

type OpcionVenta = { tipo: string; acompanamiento?: { unidades: number } };

type Bebida = {
  presentacion_id: string;
  producto_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  precio_venta: number;
  stock_bar: number;
  categoria_nombre: string | null;
  foto: string | null;
  opciones_venta: OpcionVenta[];
};

type Acompanamiento = {
  id: string;
  producto_nombre: string;
  nombre: string;
  stock_bar: number;
};

const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia'
};

const esRegistro = (valor: unknown): valor is JsonRecord =>
  typeof valor === 'object' && valor !== null;

const texto = (valor: unknown, respaldo = ''): string =>
  typeof valor === 'string' ? valor : typeof valor === 'number' ? String(valor) : respaldo;

const numero = (valor: unknown, respaldo = 0): number => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : respaldo;
};

/** `data` de la respuesta o null cuando la forma no es la esperada. */
function listaDe(json: unknown): unknown[] | null {
  if (!esRegistro(json) || !Array.isArray(json.data)) return null;
  return json.data;
}

function mensajeDe(json: unknown, respaldo: string): string {
  return esRegistro(json) && typeof json.message === 'string' && json.message.trim()
    ? json.message
    : respaldo;
}

function aEntrada(valor: unknown): EntradaPendiente | null {
  if (!esRegistro(valor)) return null;
  const id = texto(valor.id);
  if (!id) return null;
  return {
    id,
    grupo_registro_id: typeof valor.grupo_registro_id === 'string' ? valor.grupo_registro_id : null,
    cliente_nombre:
      typeof valor.cliente_nombre === 'string' && valor.cliente_nombre.trim()
        ? valor.cliente_nombre
        : null,
    monto_entrada: numero(valor.monto_entrada),
    metodo_pago: texto(valor.metodo_pago, 'efectivo'),
    fecha: texto(valor.fecha),
    hora: texto(valor.hora),
    caja_id: texto(valor.caja_id),
    registrado_por_nombre: texto(valor.registrado_por_nombre)
  };
}

function opcionesDeVenta(valor: unknown): OpcionVenta[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(esRegistro).map(opcion => ({
    tipo: texto(opcion.tipo),
    acompanamiento: esRegistro(opcion.acompanamiento)
      ? { unidades: numero(opcion.acompanamiento.unidades) }
      : undefined
  }));
}

function aBebida(valor: unknown): Bebida | null {
  if (!esRegistro(valor)) return null;
  const presentacionId = texto(valor.presentacion_id);
  if (!presentacionId) return null;
  return {
    presentacion_id: presentacionId,
    producto_id: texto(valor.producto_id),
    producto_nombre: texto(valor.producto_nombre),
    presentacion_nombre: texto(valor.presentacion_nombre),
    precio_venta: numero(valor.precio_venta),
    stock_bar: numero(valor.stock_bar),
    categoria_nombre:
      typeof valor.categoria_nombre === 'string' && valor.categoria_nombre.trim()
        ? valor.categoria_nombre
        : null,
    foto: typeof valor.foto === 'string' && valor.foto ? valor.foto : null,
    opciones_venta: opcionesDeVenta(valor.opciones_venta)
  };
}

function aAcompanamiento(valor: unknown): Acompanamiento | null {
  if (!esRegistro(valor)) return null;
  const id = texto(valor.id);
  if (!id) return null;
  return {
    id,
    producto_nombre: texto(valor.producto_nombre),
    nombre: texto(valor.nombre),
    stock_bar: numero(valor.stock_bar)
  };
}

/** Unidades de acompañamiento que exige la opción botella de la bebida. */
function unidadesAcompanamiento(bebida: Bebida | null | undefined): number {
  const botella = bebida?.opciones_venta.find(opcion => opcion.tipo === 'botella');
  const unidades = Number(botella?.acompanamiento?.unidades ?? 0);
  return Number.isFinite(unidades) && unidades > 0 ? Math.floor(unidades) : 0;
}

/**
 * Previsualización de la rama que va a tomar el servidor: la cortesía se decide
 * con `max(tope, monto_entrada)` y el adicional se cobra por la diferencia con
 * lo ya pagado en la puerta. El servidor vuelve a decidirlo al confirmar.
 */
function previsionDeCobro(
  precio: number,
  umbral: number,
  montoEntrada: number
): { etiqueta: string; esCortesia: boolean } {
  if (precio <= umbral) return { etiqueta: 'Cortesía', esCortesia: true };
  return {
    etiqueta: `Cobra ${formatCurrencyCLP(Math.max(0, precio - montoEntrada))}`,
    esCortesia: false
  };
}

export function CortesiasTab({ searchTerm = '' }: { searchTerm?: string }) {
  const [entradas, setEntradas] = useState<EntradaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCola, setErrorCola] = useState<string | null>(null);
  const [recargando, setRecargando] = useState(false);

  const [entradaSeleccionada, setEntradaSeleccionada] = useState<EntradaPendiente | null>(null);
  const [presentacionId, setPresentacionId] = useState('');
  const [acompanamientoId, setAcompanamientoId] = useState('');
  const [productos, setProductos] = useState<Bebida[]>([]);
  const [productosLoading, setProductosLoading] = useState(false);
  const [productosError, setProductosError] = useState<string | null>(null);
  const [acompanamientos, setAcompanamientos] = useState<Acompanamiento[]>([]);
  const [acompanamientosLoading, setAcompanamientosLoading] = useState(false);
  const [acompanamientosError, setAcompanamientosError] = useState<string | null>(null);
  const [entregando, setEntregando] = useState(false);

  const { hasPermission } = useUserPermissions();
  const puedeEntregar = hasPermission('entradas', 'deliver');
  const topeCortesia = Number(
    useConfigValue('comisiones', 'monto_base_trago_cortesia_cliente', 10000)
  );

  const cargarCola = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorCola(null);
    try {
      const respuesta = await fetch(
        `/api/tickets/pendientes?fecha=${encodeURIComponent(fechaDeNegocio())}`,
        { cache: 'no-store' }
      );
      const json: unknown = await respuesta.json().catch(() => null);
      const lista = listaDe(json);
      if (!respuesta.ok || lista === null)
        throw new Error(mensajeDe(json, 'No se pudo cargar la cola de cortesías'));
      setEntradas(lista.map(aEntrada).filter((fila): fila is EntradaPendiente => fila !== null));
    } catch (error) {
      setErrorCola(
        error instanceof Error ? error.message : 'No se pudo cargar la cola de cortesías'
      );
      setEntradas([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarCola();
  }, [cargarCola]);

  // El garzón sigue registrando entradas en la puerta: la cola se actualiza
  // sola sin reemplazar la tabla por el mensaje de carga.
  useRealtimeRefresh('tickets', () => cargarCola(true));

  /** Recarga manual de la cola: el garzón sigue registrando entradas en la puerta. */
  const recargar = useCallback(async () => {
    if (recargando) return;
    setRecargando(true);
    try {
      await cargarCola();
    } finally {
      setRecargando(false);
    }
  }, [recargando, cargarCola]);

  const dialogoAbierto = entradaSeleccionada !== null;

  // Catálogo de bebidas del bar: se pide al abrir el diálogo para traer stock fresco.
  useEffect(() => {
    if (!dialogoAbierto) return;
    const controller = new AbortController();
    setProductosLoading(true);
    setProductosError(null);
    fetch(urlProductosParaVenta(), { cache: 'no-store', signal: controller.signal })
      .then(async respuesta => {
        const json: unknown = await respuesta.json().catch(() => null);
        const lista = listaDe(json);
        if (!respuesta.ok || lista === null)
          throw new Error(mensajeDe(json, 'No se pudieron cargar las bebidas del bar'));
        if (controller.signal.aborted) return;
        setProductos(lista.map(aBebida).filter((bebida): bebida is Bebida => bebida !== null));
      })
      .catch(error => {
        if (!controller.signal.aborted)
          setProductosError(
            error instanceof Error ? error.message : 'No se pudieron cargar las bebidas del bar'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductosLoading(false);
      });
    return () => controller.abort();
  }, [dialogoAbierto]);

  const bebidaSeleccionada = productos.find(bebida => bebida.presentacion_id === presentacionId);
  const unidadesRequeridas = unidadesAcompanamiento(bebidaSeleccionada);
  const requiereAcompanamiento = unidadesRequeridas > 0;
  const umbral = Math.max(topeCortesia, entradaSeleccionada?.monto_entrada ?? 0);

  // Acompañamiento: solo se ofrece cuando la bebida lo exige, igual que en la puerta.
  useEffect(() => {
    if (!requiereAcompanamiento) {
      setAcompanamientos([]);
      setAcompanamientosError(null);
      setAcompanamientosLoading(false);
      return;
    }
    const controller = new AbortController();
    setAcompanamientosLoading(true);
    setAcompanamientosError(null);
    fetch('/api/bar?acompanamientos=1', { cache: 'no-store', signal: controller.signal })
      .then(async respuesta => {
        const json: unknown = await respuesta.json().catch(() => null);
        const lista = listaDe(json);
        if (!respuesta.ok || lista === null)
          throw new Error(mensajeDe(json, 'No se pudieron cargar los acompañamientos'));
        if (controller.signal.aborted) return;
        setAcompanamientos(
          lista.map(aAcompanamiento).filter((bebida): bebida is Acompanamiento => bebida !== null)
        );
      })
      .catch(error => {
        if (!controller.signal.aborted)
          setAcompanamientosError(
            error instanceof Error ? error.message : 'No se pudieron cargar los acompañamientos'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAcompanamientosLoading(false);
      });
    return () => controller.abort();
  }, [requiereAcompanamiento]);

  const visibles = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('es');
    return entradas.filter(
      fila =>
        !term ||
        [
          fila.cliente_nombre,
          fila.registrado_por_nombre,
          ETIQUETAS_METODO[fila.metodo_pago] ?? fila.metodo_pago,
          fila.hora
        ].some(value =>
          String(value ?? '')
            .toLocaleLowerCase('es')
            .includes(term)
        )
    );
  }, [entradas, searchTerm]);

  const abrirDialogo = (entrada: EntradaPendiente) => {
    setEntradaSeleccionada(entrada);
    setPresentacionId('');
    setAcompanamientoId('');
  };

  const cerrarDialogo = () => {
    if (entregando) return;
    setEntradaSeleccionada(null);
    setPresentacionId('');
    setAcompanamientoId('');
  };

  const seleccionarBebida = (id: string) => {
    setPresentacionId(id);
    setAcompanamientoId('');
  };

  const entregar = async () => {
    if (!entradaSeleccionada || !bebidaSeleccionada)
      return toast.error('Selecciona la bebida que se entrega');
    if (requiereAcompanamiento && !acompanamientoId)
      return toast.error('Selecciona el acompañamiento incluido en esta bebida');
    setEntregando(true);
    try {
      const respuesta = await fetch(
        `/api/tickets/${encodeURIComponent(entradaSeleccionada.id)}/entregar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            presentacion_id: bebidaSeleccionada.presentacion_id,
            acompanamiento_presentacion_id: requiereAcompanamiento ? acompanamientoId : null
          })
        }
      );
      const json: unknown = await respuesta.json().catch(() => null);
      if (!respuesta.ok || !esRegistro(json) || json.success !== true || !esRegistro(json.data))
        throw new Error(mensajeDe(json, 'No se pudo entregar la bebida'));
      const tipo = texto(json.data.tipo);
      const montoCobrarBarra = numero(json.data.montoCobrarBarra);
      toast.success(
        tipo === 'cortesia'
          ? 'Cortesía entregada'
          : `Adicional registrado: cobrar ${formatCurrencyCLP(montoCobrarBarra)}`
      );
      setEntradaSeleccionada(null);
      setPresentacionId('');
      setAcompanamientoId('');
      await cargarCola();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo entregar la bebida');
    } finally {
      setEntregando(false);
    }
  };

  return (
    <div className='space-y-5'>
      <section className='overflow-hidden rounded-2xl border bg-card shadow-xs'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b p-4'>
          <div className='flex items-start gap-3'>
            <div className='rounded-xl border bg-background p-2.5 text-primary'>
              <Ticket className='size-5' aria-hidden='true' />
            </div>
            <div>
              <h2 className='font-semibold'>Cortesías pendientes</h2>
              <p className='text-sm text-muted-foreground'>
                Entradas cobradas en la puerta que esperan su bebida en la barra.
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium tabular-nums'>
              {visibles.length} {visibles.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={loading || recargando}
              onClick={() => void recargar()}
              aria-label='Actualizar cortesías pendientes'
              className='gap-1.5 rounded-full'
            >
              <RefreshCw
                className={cn('size-4', (loading || recargando) && 'animate-spin')}
                aria-hidden='true'
              />
              Actualizar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className='flex items-center gap-2 p-6 text-sm text-muted-foreground'>
            <LoaderCircle className='size-4 animate-spin' /> Cargando cortesías…
          </div>
        ) : errorCola ? (
          <div className='p-6 text-sm text-destructive'>{errorCola}</div>
        ) : visibles.length === 0 ? (
          <div className='p-8 text-center'>
            <Ticket className='mx-auto mb-2 size-7 text-muted-foreground' aria-hidden='true' />
            <p className='font-medium'>
              {searchTerm ? 'No hay cortesías que coincidan' : 'No hay cortesías pendientes'}
            </p>
            <p className='mt-1 text-sm text-muted-foreground'>
              Las entradas registradas en la puerta aparecerán aquí hasta entregar la bebida.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table className='min-w-[760px]'>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto entrada</TableHead>
                  <TableHead>Método de pago</TableHead>
                  <TableHead>Registró</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className='text-right'>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map(fila => (
                  <TableRow key={fila.id}>
                    <TableCell className='tabular-nums'>{fila.hora || '—'}</TableCell>
                    <TableCell className='font-medium'>
                      {fila.cliente_nombre || 'Sin nombre'}
                    </TableCell>
                    <TableCell className='tabular-nums'>
                      {formatCurrencyCLP(fila.monto_entrada)}
                    </TableCell>
                    <TableCell>{ETIQUETAS_METODO[fila.metodo_pago] ?? fila.metodo_pago}</TableCell>
                    <TableCell>{fila.registrado_por_nombre || '—'}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>Pendiente</Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      {puedeEntregar ? (
                        <Button
                          type='button'
                          size='sm'
                          className='rounded-full'
                          onClick={() => abrirDialogo(fila)}
                          aria-label={`Entregar la cortesía de ${
                            fila.cliente_nombre || 'cliente sin nombre'
                          }`}
                        >
                          Entregar
                        </Button>
                      ) : (
                        <span className='text-xs text-muted-foreground'>Sin permiso</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!puedeEntregar ? (
          <p className='border-t p-4 text-sm text-muted-foreground'>
            No tienes permiso para entregar cortesías.
          </p>
        ) : null}
      </section>

      <Dialog
        open={dialogoAbierto}
        onOpenChange={open => {
          if (!open) cerrarDialogo();
        }}
      >
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Entregar cortesía</DialogTitle>
            <DialogDescription>
              {entradaSeleccionada
                ? `${entradaSeleccionada.cliente_nombre || 'Sin nombre'} · entrada de ${formatCurrencyCLP(
                    entradaSeleccionada.monto_entrada
                  )} · ${entradaSeleccionada.hora}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {productosLoading ? (
            <div className='flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
              <LoaderCircle className='size-4 animate-spin' /> Cargando bebidas…
            </div>
          ) : productosError ? (
            <p className='rounded-xl border border-dashed p-4 text-sm text-destructive'>
              {productosError}
            </p>
          ) : productos.length === 0 ? (
            <p className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
              No hay bebidas con stock en el bar.
            </p>
          ) : (
            <div
              role='group'
              aria-label='Bebidas del bar'
              className='grid grid-cols-2 gap-3 sm:grid-cols-3'
            >
              {productos.map(bebida => {
                const seleccionada = bebida.presentacion_id === presentacionId;
                const sinStock = bebida.stock_bar <= 0;
                const prevision = previsionDeCobro(
                  bebida.precio_venta,
                  umbral,
                  entradaSeleccionada?.monto_entrada ?? 0
                );
                const nombreBebida =
                  `${bebida.producto_nombre} ${bebida.presentacion_nombre}`.trim();
                return (
                  <Button
                    key={bebida.presentacion_id}
                    type='button'
                    variant='unstyled'
                    disabled={sinStock}
                    aria-pressed={seleccionada}
                    onClick={() => seleccionarBebida(bebida.presentacion_id)}
                    className={cn(
                      'flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-background text-left font-normal whitespace-normal transition disabled:cursor-not-allowed disabled:opacity-40',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      seleccionada
                        ? 'border-primary ring-2 ring-primary/25'
                        : 'hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    <span className='relative block h-20 w-full bg-muted/40'>
                      <ProductPhoto
                        src={productImageUrl(bebida.foto)}
                        alt={nombreBebida}
                        fill
                        className='object-contain p-2'
                      />
                      <span
                        className={cn(
                          'absolute right-2 top-2 flex size-5 items-center justify-center rounded-full',
                          seleccionada
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background/80 text-transparent'
                        )}
                        aria-hidden='true'
                      >
                        <Check className='size-3.5' />
                      </span>
                    </span>
                    <span className='flex flex-1 flex-col gap-1 border-t p-3'>
                      <span className='line-clamp-2 text-sm font-semibold leading-snug'>
                        {bebida.producto_nombre}
                      </span>
                      <span className='line-clamp-1 text-xs text-muted-foreground'>
                        {bebida.presentacion_nombre}
                      </span>
                      <span className='text-sm font-medium tabular-nums text-primary'>
                        {formatCurrencyCLP(bebida.precio_venta)}
                      </span>
                      <span className='mt-auto flex flex-wrap items-center gap-1.5 pt-1'>
                        <span className='text-[11px] text-muted-foreground'>
                          {sinStock ? 'Sin stock' : `${bebida.stock_bar} en bar`}
                        </span>
                        <Badge
                          variant={prevision.esCortesia ? 'secondary' : 'outline'}
                          className={cn(
                            'rounded-full px-2 py-0 text-[11px]',
                            !prevision.esCortesia && 'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {prevision.etiqueta}
                        </Badge>
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          )}

          <p className='text-xs text-muted-foreground'>
            La previsualización es referencial: al confirmar, el servidor decide si la bebida es
            cortesía o si se cobra la diferencia en la barra.
          </p>

          {requiereAcompanamiento && bebidaSeleccionada ? (
            <div className='space-y-2'>
              <Label htmlFor='cortesia-acompanamiento'>Acompañamiento</Label>
              <SearchableSelect
                id='cortesia-acompanamiento'
                value={acompanamientoId}
                onChange={setAcompanamientoId}
                placeholder={
                  acompanamientosLoading
                    ? 'Cargando acompañamientos…'
                    : 'Seleccionar acompañamiento'
                }
                searchPlaceholder='Buscar bebida…'
                options={[
                  { value: '', label: 'Seleccionar acompañamiento' },
                  ...acompanamientos
                    .filter(
                      bebida =>
                        bebida.id !== bebidaSeleccionada.presentacion_id &&
                        bebida.stock_bar >= unidadesRequeridas
                    )
                    .map(bebida => ({
                      value: bebida.id,
                      label: `${bebida.producto_nombre} · ${bebida.nombre} · ${bebida.stock_bar} en bar`,
                      keywords: [bebida.producto_nombre, bebida.nombre]
                    }))
                ]}
              />
              <p className='text-xs text-muted-foreground'>
                Incluye {unidadesRequeridas} bebida{unidadesRequeridas === 1 ? '' : 's'} por
                botella.
              </p>
              {acompanamientosError ? (
                <p className='text-xs text-destructive' role='alert'>
                  {acompanamientosError}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              disabled={entregando}
              onClick={cerrarDialogo}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              className='rounded-full'
              disabled={
                entregando ||
                productosLoading ||
                !bebidaSeleccionada ||
                (requiereAcompanamiento && !acompanamientoId)
              }
              onClick={() => void entregar()}
            >
              {entregando ? <LoaderCircle className='mr-2 size-4 animate-spin' /> : null}
              Confirmar entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
