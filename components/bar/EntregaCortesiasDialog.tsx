'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { urlProductosParaVenta } from '@/lib/constants/api-endpoints';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { productImageUrl } from '@/lib/utils/productImage';
import { cn } from '@/lib/utils/utils';

type JsonRecord = Record<string, unknown>;

type OpcionVenta = {
  tipo: string;
  precio?: number;
  precio_sin_anfitriona?: number;
  acompanamiento?: { unidades: number };
};

type Formato = 'corte' | 'botella';

type Bebida = {
  presentacion_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  precio_venta: number;
  precio_sin_anfitriona: number;
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

/** Entrada que todavía espera su bebida; solo se necesitan estos datos para entregarla. */
export type CortesiaPendiente = {
  id: string;
  monto_entrada: number;
  hora: string;
};

/** Compra con una o más cortesías pendientes. */
export type GrupoCortesia = {
  id: string;
  cliente: string | null;
  filas: CortesiaPendiente[];
  cantidad: number;
  total: number;
  montoUnitario: number;
  metodo: string;
  hora: string;
  registradoPor: string;
};

type LineaSeleccion = {
  cantidad: number;
  acompanamientoId: string;
};

type Props = {
  grupo: GrupoCortesia | null;
  /** Tope de la cortesía (`monto_base_trago_cortesia_cliente`). */
  tope: number;
  onClose: () => void;
  onEntregado: () => void | Promise<void>;
};

const esRegistro = (valor: unknown): valor is JsonRecord =>
  typeof valor === 'object' && valor !== null;

const texto = (valor: unknown, respaldo = ''): string =>
  typeof valor === 'string' ? valor : typeof valor === 'number' ? String(valor) : respaldo;

const numero = (valor: unknown, respaldo = 0): number => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : respaldo;
};

function listaDe(json: unknown): unknown[] | null {
  if (!esRegistro(json) || !Array.isArray(json.data)) return null;
  return json.data;
}

function mensajeDe(json: unknown, respaldo: string): string {
  return esRegistro(json) && typeof json.message === 'string' && json.message.trim()
    ? json.message
    : respaldo;
}

const normalizar = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Analcohólicas y cigarrillos no son cover de una entrada. */
function categoriaFueraDeCortesia(categoria: string | null | undefined): boolean {
  const normalizada = normalizar(categoria || '');
  return normalizada.includes('analcohol') || normalizada.includes('cigarr');
}

function opcionesDeVenta(valor: unknown): OpcionVenta[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(esRegistro).map(opcion => ({
    tipo: texto(opcion.tipo),
    precio: numero(opcion.precio),
    precio_sin_anfitriona: numero(opcion.precio_sin_anfitriona),
    acompanamiento: esRegistro(opcion.acompanamiento)
      ? { unidades: numero(opcion.acompanamiento.unidades) }
      : undefined
  }));
}

function aBebida(valor: unknown): Bebida | null {
  if (!esRegistro(valor)) return null;
  const presentacionId = texto(valor.presentacion_id);
  if (!presentacionId) return null;
  const opciones = opcionesDeVenta(valor.opciones_venta);
  const botella = opciones.find(opcion => opcion.tipo === 'botella');
  const precioSinAnfitriona = numero(botella?.precio_sin_anfitriona);
  return {
    presentacion_id: presentacionId,
    producto_nombre: texto(valor.producto_nombre),
    presentacion_nombre: texto(valor.presentacion_nombre),
    precio_venta: numero(valor.precio_venta),
    precio_sin_anfitriona:
      precioSinAnfitriona > 0 ? precioSinAnfitriona : numero(valor.precio_venta),
    stock_bar: numero(valor.stock_bar),
    categoria_nombre:
      typeof valor.categoria_nombre === 'string' && valor.categoria_nombre.trim()
        ? valor.categoria_nombre
        : null,
    foto: typeof valor.foto === 'string' && valor.foto ? valor.foto : null,
    opciones_venta: opciones
  };
}

function aAcompanamiento(valor: unknown): Acompanamiento | null {
  if (!esRegistro(valor)) return null;
  const id = texto(valor.presentacion_id) || texto(valor.id);
  if (!id) return null;
  return {
    id,
    producto_nombre: texto(valor.producto_nombre),
    nombre: texto(valor.presentacion_nombre) || texto(valor.nombre),
    stock_bar: numero(valor.stock_bar)
  };
}

function unidadesAcompanamiento(bebida: Bebida): number {
  const botella = bebida.opciones_venta.find(opcion => opcion.tipo === 'botella');
  const unidades = Number(botella?.acompanamiento?.unidades ?? 0);
  return Number.isFinite(unidades) && unidades > 0 ? Math.floor(unidades) : 0;
}

/** Precio del corte (shot) para cliente; `null` si no se vende por corte. */
function precioCorte(bebida: Bebida): number | null {
  const shot = bebida.opciones_venta.find(opcion => opcion.tipo === 'shot');
  const precio = numero(shot?.precio);
  return precio > 0 ? precio : null;
}

/**
 * Formato con el que la entrada se puede servir dentro del tope. Se prefiere el
 * corte; la botella queda para lo que no se vende por corte.
 */
function formatoCortesia(bebida: Bebida, umbral: number): Formato | null {
  const corte = precioCorte(bebida);
  if (corte !== null && corte <= umbral) return 'corte';
  if (bebida.precio_sin_anfitriona <= umbral && bebida.precio_venta <= umbral) return 'botella';
  return null;
}

function precioVisible(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? (precioCorte(bebida) ?? 0) : bebida.precio_sin_anfitriona;
}

function unidadesAcompanamientoFormato(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? 1 : unidadesAcompanamiento(bebida);
}

/** Un corte cliente siempre lleva una unidad; la botella, si está configurada. */
function requiereAcompanamiento(bebida: Bebida, formato: Formato): boolean {
  return formato === 'corte' || unidadesAcompanamiento(bebida) > 0;
}

function opcionesCoverPara(
  acompanamientos: Acompanamiento[],
  bebida: Bebida,
  formato: Formato,
  cantidad: number
): Acompanamiento[] {
  const necesarias = unidadesAcompanamientoFormato(bebida, formato) * cantidad;
  return acompanamientos.filter(
    opcion => opcion.id !== bebida.presentacion_id && opcion.stock_bar >= necesarias
  );
}

const claveDe = (bebida: Bebida, formato: Formato) => `${bebida.presentacion_id}:${formato}`;

export function EntregaCortesiasDialog({ grupo, tope, onClose, onEntregado }: Props) {
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [acompanamientos, setAcompanamientos] = useState<Acompanamiento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorBebidas, setErrorBebidas] = useState<string | null>(null);
  const [errorCover, setErrorCover] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Record<string, LineaSeleccion>>({});
  const [entregando, setEntregando] = useState(false);

  const filas = useMemo(() => grupo?.filas ?? [], [grupo]);
  const umbral = Math.max(tope, filas[0]?.monto_entrada ?? 0);
  const abierto = grupo !== null;

  useEffect(() => {
    if (!abierto) return;
    setSeleccion({});
    setBusqueda('');
    const controller = new AbortController();
    setCargando(true);
    setErrorBebidas(null);
    setErrorCover(null);

    const pedir = (url: string) =>
      fetch(url, { cache: 'no-store', signal: controller.signal }).then(async respuesta => {
        const json: unknown = await respuesta.json().catch(() => null);
        const lista = listaDe(json);
        if (!respuesta.ok || lista === null)
          throw new Error(mensajeDe(json, 'No se pudieron cargar las bebidas del bar'));
        return lista;
      });

    Promise.all([
      pedir(urlProductosParaVenta()),
      pedir(urlProductosParaVenta({ solo_cover: true })).catch(error => {
        if (!controller.signal.aborted)
          setErrorCover(
            error instanceof Error ? error.message : 'No se pudieron cargar las bebidas cover'
          );
        return [];
      })
    ])
      .then(([listaBebidas, listaCover]) => {
        if (controller.signal.aborted) return;
        setBebidas(listaBebidas.map(aBebida).filter((bebida): bebida is Bebida => bebida !== null));
        setAcompanamientos(
          listaCover
            .map(aAcompanamiento)
            .filter((bebida): bebida is Acompanamiento => bebida !== null)
        );
      })
      .catch(error => {
        if (!controller.signal.aborted)
          setErrorBebidas(
            error instanceof Error ? error.message : 'No se pudieron cargar las bebidas del bar'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [abierto, grupo?.id]);

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda);
    return bebidas
      .map(bebida => ({ bebida, formato: formatoCortesia(bebida, umbral) }))
      .filter(
        (fila): fila is { bebida: Bebida; formato: Formato } =>
          fila.formato !== null && !categoriaFueraDeCortesia(fila.bebida.categoria_nombre)
      )
      .filter(
        ({ bebida, formato }) =>
          !termino ||
          Boolean(seleccion[claveDe(bebida, formato)]) ||
          normalizar(`${bebida.producto_nombre} ${bebida.presentacion_nombre}`).includes(termino)
      );
  }, [bebidas, busqueda, seleccion, umbral]);

  const totalSeleccionado = useMemo(
    () => Object.values(seleccion).reduce((suma, linea) => suma + linea.cantidad, 0),
    [seleccion]
  );

  const lineas = useMemo(
    () =>
      Object.entries(seleccion).flatMap(([clave, linea]) => {
        const [presentacionId, formato] = clave.split(':') as [string, Formato];
        const bebida = bebidas.find(item => item.presentacion_id === presentacionId);
        if (!bebida) return [];
        return [{ clave, bebida, formato, ...linea }];
      }),
    [bebidas, seleccion]
  );

  const faltaAcompanamiento = useMemo(
    () =>
      lineas.some(linea => {
        if (!requiereAcompanamiento(linea.bebida, linea.formato)) return false;
        const opciones = opcionesCoverPara(
          acompanamientos,
          linea.bebida,
          linea.formato,
          linea.cantidad
        );
        // El corte puede salir sin cover si el bar no tiene; la botella con
        // acompañamiento configurado no: el servidor la exige.
        if (opciones.length === 0) return linea.formato === 'botella';
        return !opciones.some(opcion => opcion.id === linea.acompanamientoId);
      }),
    [acompanamientos, lineas]
  );

  const agregar = useCallback(
    (bebida: Bebida, formato: Formato) => {
      const clave = claveDe(bebida, formato);
      setSeleccion(previo => {
        const total = Object.values(previo).reduce((suma, linea) => suma + linea.cantidad, 0);
        if (total >= filas.length) return previo;
        return {
          ...previo,
          [clave]: {
            cantidad: (previo[clave]?.cantidad ?? 0) + 1,
            acompanamientoId: previo[clave]?.acompanamientoId ?? ''
          }
        };
      });
    },
    [filas.length]
  );

  const quitar = useCallback((clave: string) => {
    setSeleccion(previo => {
      const actual = previo[clave];
      if (!actual) return previo;
      if (actual.cantidad <= 1) {
        const resto = { ...previo };
        delete resto[clave];
        return resto;
      }
      return { ...previo, [clave]: { ...actual, cantidad: actual.cantidad - 1 } };
    });
  }, []);

  const quitarTodas = useCallback((clave: string) => {
    setSeleccion(previo => {
      if (!previo[clave]) return previo;
      const resto = { ...previo };
      delete resto[clave];
      return resto;
    });
  }, []);

  const cambiarAcompanamiento = useCallback((clave: string, acompanamientoId: string) => {
    setSeleccion(previo =>
      previo[clave] ? { ...previo, [clave]: { ...previo[clave], acompanamientoId } } : previo
    );
  }, []);

  const cerrar = useCallback(() => {
    if (entregando) return;
    onClose();
  }, [entregando, onClose]);

  const entregar = useCallback(async () => {
    if (!grupo || entregando) return;
    if (lineas.length === 0) {
      toast.error('Selecciona al menos una bebida para entregar');
      return;
    }
    if (totalSeleccionado > grupo.filas.length) {
      toast.error(`Solo quedan ${grupo.filas.length} entradas pendientes en esta compra`);
      return;
    }
    if (faltaAcompanamiento) {
      toast.error('Selecciona el acompañamiento de cada producto que lo incluye');
      return;
    }

    setEntregando(true);
    let entregadas = 0;
    try {
      for (const linea of lineas) {
        for (let indice = 0; indice < linea.cantidad; indice += 1) {
          const fila = grupo.filas[entregadas];
          if (!fila) throw new Error('La compra ya no tiene entradas pendientes');
          const respuesta = await fetch(`/api/tickets/${encodeURIComponent(fila.id)}/entregar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              presentacion_id: linea.bebida.presentacion_id,
              tipo_entrega: linea.formato,
              acompanamiento_presentacion_id: linea.acompanamientoId || null
            })
          });
          const json: unknown = await respuesta.json().catch(() => null);
          if (!respuesta.ok || !esRegistro(json) || json.success !== true)
            throw new Error(mensajeDe(json, 'No se pudo entregar la bebida'));
          entregadas += 1;
        }
      }
      toast.success(
        entregadas === 1 ? 'Cortesía entregada' : `${entregadas} cortesías entregadas`,
        { description: grupo.cliente || undefined }
      );
      await onEntregado();
      onClose();
    } catch (error) {
      toast.error(
        entregadas > 0
          ? `Se entregaron ${entregadas} de ${totalSeleccionado}`
          : 'No se pudo entregar',
        { description: error instanceof Error ? error.message : 'Intenta de nuevo.' }
      );
      if (entregadas > 0) {
        await onEntregado();
        onClose();
      }
    } finally {
      setEntregando(false);
    }
  }, [entregando, faltaAcompanamiento, grupo, lineas, onClose, onEntregado, totalSeleccionado]);

  return (
    <Dialog
      open={abierto}
      onOpenChange={open => {
        if (!open) cerrar();
      }}
    >
      <DialogContent className='max-h-[88vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Entregar cortesías</DialogTitle>
          <DialogDescription>
            {grupo
              ? `${grupo.cliente || 'Sin nombre'} · ${grupo.cantidad} ${
                  grupo.cantidad === 1 ? 'entrada' : 'entradas'
                } · ${formatCurrencyCLP(grupo.total)} · ${grupo.hora}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <Input
          value={busqueda}
          onChange={evento => setBusqueda(evento.target.value)}
          placeholder='Buscar producto…'
          aria-label='Buscar producto'
        />

        <p className='text-xs text-muted-foreground'>
          Solo cortes y botellas sin anfitriona hasta {formatCurrencyCLP(umbral)} con stock en el
          bar. Puedes combinar varios productos y repetir el mismo.
        </p>

        {cargando ? (
          <div className='flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
            <LoaderCircle className='size-4 animate-spin' /> Cargando bebidas…
          </div>
        ) : errorBebidas ? (
          <p className='rounded-xl border border-dashed p-4 text-sm text-destructive'>
            {errorBebidas}
          </p>
        ) : visibles.length === 0 ? (
          <p className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
            {busqueda.trim()
              ? 'No hay bebidas que coincidan con la búsqueda.'
              : `Sin cortes hasta ${formatCurrencyCLP(umbral)} con stock en el bar.`}
          </p>
        ) : (
          <div
            role='group'
            aria-label='Bebidas del bar'
            className='grid grid-cols-2 gap-3 sm:grid-cols-3'
          >
            {visibles.map(({ bebida, formato }) => {
              const clave = claveDe(bebida, formato);
              const cantidad = seleccion[clave]?.cantidad ?? 0;
              const sinStock = bebida.stock_bar <= 0;
              const limite = totalSeleccionado >= filas.length;
              const precio = precioVisible(bebida, formato);
              const nombreBebida = `${bebida.producto_nombre} ${bebida.presentacion_nombre}`.trim();
              return (
                <Button
                  key={clave}
                  type='button'
                  variant='unstyled'
                  disabled={sinStock || limite}
                  aria-pressed={cantidad > 0}
                  onClick={() => agregar(bebida, formato)}
                  className={cn(
                    'flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-background text-left font-normal whitespace-normal transition disabled:cursor-not-allowed disabled:opacity-40',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    cantidad > 0
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
                        'absolute right-2 top-2 flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold',
                        cantidad > 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background/80 text-muted-foreground'
                      )}
                      aria-hidden='true'
                    >
                      {cantidad > 0 ? cantidad : <Plus className='size-3' />}
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
                      {formatCurrencyCLP(precio)}
                    </span>
                    <span className='text-[11px] text-muted-foreground'>
                      {formato === 'corte' ? 'Corte' : 'Botella sin anfitriona'}
                    </span>
                    <span className='mt-auto flex flex-wrap items-center gap-1.5 pt-1'>
                      <span className='text-[11px] text-muted-foreground'>
                        {sinStock ? 'Sin stock' : `${bebida.stock_bar} en bar`}
                      </span>
                      <Badge variant='secondary' className='rounded-full px-2 py-0 text-[11px]'>
                        Cortesía
                      </Badge>
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        )}

        {lineas.length > 0 ? (
          <div className='space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <h3 className='text-sm font-semibold'>Seleccionados</h3>
              <span className='text-xs text-muted-foreground tabular-nums'>
                {totalSeleccionado} de {filas.length}
              </span>
            </div>
            {lineas.map(linea => {
              const opciones = opcionesCoverPara(
                acompanamientos,
                linea.bebida,
                linea.formato,
                linea.cantidad
              );
              const necesitaCover = requiereAcompanamiento(linea.bebida, linea.formato);
              const unidades = unidadesAcompanamientoFormato(linea.bebida, linea.formato);
              const necesarias = unidades * linea.cantidad;
              const falta = necesitaCover
                ? opciones.length === 0
                  ? linea.formato === 'botella'
                  : !opciones.some(opcion => opcion.id === linea.acompanamientoId)
                : false;
              return (
                <div key={linea.clave} className='rounded-xl border p-3'>
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold'>
                        {linea.bebida.producto_nombre} · {linea.bebida.presentacion_nombre}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {linea.formato === 'corte' ? 'Corte' : 'Botella sin anfitriona'} ·{' '}
                        {formatCurrencyCLP(precioVisible(linea.bebida, linea.formato))} c/u
                      </p>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button
                        type='button'
                        size='icon'
                        variant='outline'
                        className='size-8 rounded-full'
                        onClick={() => quitar(linea.clave)}
                        aria-label='Quitar una unidad'
                      >
                        <Minus className='size-3.5' />
                      </Button>
                      <span className='w-6 text-center text-sm font-semibold tabular-nums'>
                        {linea.cantidad}
                      </span>
                      <Button
                        type='button'
                        size='icon'
                        variant='outline'
                        className='size-8 rounded-full'
                        disabled={totalSeleccionado >= filas.length}
                        onClick={() => agregar(linea.bebida, linea.formato)}
                        aria-label='Agregar una unidad'
                      >
                        <Plus className='size-3.5' />
                      </Button>
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='size-8 rounded-full text-destructive'
                        onClick={() => quitarTodas(linea.clave)}
                        aria-label='Quitar producto'
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    </div>
                  </div>

                  {necesitaCover ? (
                    <div className='mt-3 space-y-2'>
                      <Label htmlFor={`cover-${linea.clave}`} className='text-xs'>
                        {linea.formato === 'corte'
                          ? 'Acompañamiento del corte'
                          : 'Acompañamiento incluido'}
                      </Label>
                      {opciones.length === 0 ? (
                        <p
                          className={cn(
                            'rounded-lg border border-dashed p-2 text-xs',
                            linea.formato === 'botella'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          )}
                        >
                          {linea.formato === 'botella'
                            ? 'No hay bebidas cover con stock para esta botella.'
                            : 'Sin bebidas cover con stock; el corte se puede entregar sin acompañamiento.'}
                        </p>
                      ) : (
                        <SearchableSelect
                          id={`cover-${linea.clave}`}
                          value={linea.acompanamientoId}
                          onChange={id => cambiarAcompanamiento(linea.clave, id)}
                          placeholder='Seleccionar acompañamiento'
                          searchPlaceholder='Buscar bebida…'
                          options={[
                            { value: '', label: 'Seleccionar acompañamiento' },
                            ...opciones.map(opcion => ({
                              value: opcion.id,
                              label: `${opcion.producto_nombre} · ${opcion.nombre} · ${opcion.stock_bar} en bar`,
                              keywords: [opcion.producto_nombre, opcion.nombre]
                            }))
                          ]}
                        />
                      )}
                      <p className='text-[11px] text-muted-foreground'>
                        {linea.formato === 'corte'
                          ? `Una unidad de cover por corte${
                              linea.cantidad > 1 ? ` (${linea.cantidad} en total)` : ''
                            }.`
                          : `Incluye ${necesarias} unidad${necesarias === 1 ? '' : 'es'} para ${
                              linea.cantidad
                            } botella${linea.cantidad === 1 ? '' : 's'}.`}
                      </p>
                      {falta && opciones.length > 0 ? (
                        <p className='text-xs text-amber-600 dark:text-amber-400'>
                          Elige la bebida del cover para continuar.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <p className='text-xs text-muted-foreground'>
              {totalSeleccionado} de {filas.length} {filas.length === 1 ? 'entrada' : 'entradas'}{' '}
              por entregar. Un producto por persona.
            </p>
          </div>
        ) : null}

        {errorCover ? (
          <p className='text-xs text-destructive' role='alert'>
            {errorCover}
          </p>
        ) : null}

        <DialogFooter className='gap-2'>
          <Button
            type='button'
            variant='outline'
            className='rounded-full'
            disabled={entregando}
            onClick={cerrar}
          >
            Cancelar
          </Button>
          <Button
            type='button'
            className='rounded-full'
            disabled={
              entregando ||
              cargando ||
              Boolean(errorBebidas) ||
              lineas.length === 0 ||
              faltaAcompanamiento ||
              totalSeleccionado > filas.length
            }
            onClick={() => void entregar()}
          >
            {entregando ? <LoaderCircle className='mr-2 size-4 animate-spin' /> : null}
            {totalSeleccionado > 0
              ? `Entregar ${totalSeleccionado} en la barra`
              : 'Entregar en la barra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
