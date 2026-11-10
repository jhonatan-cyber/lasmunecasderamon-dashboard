'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { AcompanamientoDistribuidor } from '@/components/shared/AcompanamientoDistribuidor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { urlProductosParaVenta } from '@/lib/constants/api-endpoints';
import type { AcompanamientoBotellaItem } from '@/lib/sales/acompanamientoBotella';
import { dividirRepartoPorEntrega, recortarReparto } from '@/lib/sales/repartoAcompanamiento';
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
  foto: string | null;
};

export type CoverPendiente = {
  id: string;
  monto_entrada: number;
  hora: string;
};

export type GrupoCover = {
  id: string;
  cliente: string | null;
  filas: CoverPendiente[];
  cantidad: number;
  total: number;
  montoUnitario: number;
  metodo: string;
  hora: string;
  registradoPor: string;
};

type LineaSeleccion = {
  cantidad: number;
  reparto: AcompanamientoBotellaItem[];
};

type Props = {
  grupo: GrupoCover | null;
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

function categoriaFueraDeCover(categoria: string | null | undefined): boolean {
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
    stock_bar: numero(valor.stock_bar),
    foto: typeof valor.foto === 'string' && valor.foto ? valor.foto : null
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

function formatosCover(bebida: Bebida, presupuesto: number, umbral: number): Formato[] {
  const formatos: Formato[] = [];
  const corte = precioCorte(bebida);
  if (corte !== null && corte <= presupuesto) formatos.push('corte');
  // La botella entra por su precio sin anfitriona; si queda sobre el umbral se
  // cobra la diferencia, y como cover el servidor exige que el precio de venta
  // tampoco lo supere.
  if (
    bebida.precio_sin_anfitriona <= presupuesto &&
    (bebida.precio_sin_anfitriona > umbral || bebida.precio_venta <= umbral)
  )
    formatos.push('botella');
  return formatos;
}

function precioVisible(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? (precioCorte(bebida) ?? 0) : bebida.precio_sin_anfitriona;
}

/** Diferencia que se cobra en la barra, con la regla del servidor. */
function montoCobroBarra(precio: number, montoEntrada: number, tope: number): number {
  const umbral = Math.max(tope, montoEntrada);
  return precio > umbral ? Math.max(0, precio - montoEntrada) : 0;
}

function unidadesAcompanamientoFormato(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? 1 : unidadesAcompanamiento(bebida);
}

/** Unidades que hay que repartir entre todas las entregas de la línea. */
function unidadesAcompanamientoLinea(bebida: Bebida, formato: Formato, cantidad: number): number {
  return unidadesAcompanamientoFormato(bebida, formato) * Math.max(1, cantidad);
}

function requiereAcompanamiento(bebida: Bebida, formato: Formato): boolean {
  return formato === 'corte' || unidadesAcompanamiento(bebida) > 0;
}

function opcionesCoverPara(acompanamientos: Acompanamiento[], bebida: Bebida): Acompanamiento[] {
  return acompanamientos.filter(
    opcion => opcion.id !== bebida.presentacion_id && opcion.stock_bar >= 1
  );
}

const claveDe = (bebida: Bebida, formato: Formato) => `${bebida.presentacion_id}:${formato}`;

export function EntregaCoversDialog({ grupo, tope, onClose, onEntregado }: Props) {
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [acompanamientos, setAcompanamientos] = useState<Acompanamiento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorBebidas, setErrorBebidas] = useState<string | null>(null);
  const [errorCover, setErrorCover] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [montoAdicional, setMontoAdicional] = useState('');
  const [seleccion, setSeleccion] = useState<Record<string, LineaSeleccion>>({});
  const [entregando, setEntregando] = useState(false);

  const filas = useMemo(() => grupo?.filas ?? [], [grupo]);
  const topeCover = Number(tope) || 0;
  const umbral = Math.max(topeCover, Number(filas[0]?.monto_entrada) || 0);
  const totalEntradas = useMemo(
    () => filas.reduce((suma, fila) => suma + (Number(fila.monto_entrada) || 0), 0),
    [filas]
  );
  const adicional = Math.max(0, Math.floor(Number(montoAdicional) || 0));
  const presupuesto = totalEntradas + adicional;
  const abierto = grupo !== null;

  useEffect(() => {
    if (!abierto) return;
    setSeleccion({});
    setBusqueda('');
    setMontoAdicional('');
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
      .flatMap(bebida => {
        if (categoriaFueraDeCover(bebida.categoria_nombre)) return [];
        const formatos = formatosCover(bebida, presupuesto, umbral);
        // Lo ya elegido se mantiene visible aunque el presupuesto baje.
        for (const formato of ['corte', 'botella'] as Formato[]) {
          const clave = claveDe(bebida, formato);
          if (seleccion[clave] && !formatos.includes(formato)) formatos.push(formato);
        }
        return formatos.map(formato => ({ bebida, formato }));
      })
      .filter(
        ({ bebida, formato }) =>
          !termino ||
          Boolean(seleccion[claveDe(bebida, formato)]) ||
          normalizar(`${bebida.producto_nombre} ${bebida.presentacion_nombre}`).includes(termino)
      );
  }, [bebidas, busqueda, presupuesto, seleccion, umbral]);

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
        const opciones = opcionesCoverPara(acompanamientos, linea.bebida);
        if (opciones.length === 0) return linea.formato === 'botella';
        const requeridas = unidadesAcompanamientoLinea(linea.bebida, linea.formato, linea.cantidad);
        const asignado = linea.reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
        return asignado !== requeridas;
      }),
    [acompanamientos, lineas]
  );

  /** Precio de cada entrega en el orden en que se consumen las entradas. */
  const unidadesEntrega = useMemo(
    () =>
      lineas.flatMap(linea =>
        Array.from({ length: linea.cantidad }, () => ({
          precio: precioVisible(linea.bebida, linea.formato)
        }))
      ),
    [lineas]
  );

  const precioSeleccionado = useMemo(
    () => unidadesEntrega.reduce((suma, unidad) => suma + unidad.precio, 0),
    [unidadesEntrega]
  );

  // Lo que el cliente paga en la barra: la diferencia de cada unidad sobre el
  // umbral de su entrada.
  const cobroBarra = useMemo(
    () =>
      unidadesEntrega.reduce((suma, unidad, indice) => {
        const fila = filas[indice];
        if (!fila) return suma;
        return suma + montoCobroBarra(unidad.precio, Number(fila.monto_entrada) || 0, topeCover);
      }, 0),
    [filas, topeCover, unidadesEntrega]
  );

  const excedePresupuesto = precioSeleccionado > presupuesto;
  const excedeAdicional = cobroBarra > adicional;
  const presupuestoInsuficiente = excedePresupuesto || excedeAdicional;

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
            reparto: previo[clave]?.reparto ?? []
          }
        };
      });
    },
    [filas.length]
  );

  const quitar = useCallback((clave: string, unidadesPorEntrega: number) => {
    setSeleccion(previo => {
      const actual = previo[clave];
      if (!actual) return previo;
      if (actual.cantidad <= 1) {
        const resto = { ...previo };
        delete resto[clave];
        return resto;
      }
      const cantidad = actual.cantidad - 1;
      return {
        ...previo,
        [clave]: {
          cantidad,
          reparto: recortarReparto(actual.reparto, unidadesPorEntrega * cantidad)
        }
      };
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

  const cambiarReparto = useCallback((clave: string, reparto: AcompanamientoBotellaItem[]) => {
    setSeleccion(previo =>
      previo[clave] ? { ...previo, [clave]: { ...previo[clave], reparto } } : previo
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
    if (presupuestoInsuficiente) {
      toast.error('Sube el monto adicional o quita productos para cubrir la selección');
      return;
    }

    setEntregando(true);
    let entregadas = 0;
    try {
      for (const linea of lineas) {
        // El reparto de la línea cubre todas sus entregas: cada ticket recibe
        // su propia mezcla de sabores (un corte, una sola bebida).
        const repartos = requiereAcompanamiento(linea.bebida, linea.formato)
          ? dividirRepartoPorEntrega(
              linea.reparto,
              unidadesAcompanamientoFormato(linea.bebida, linea.formato),
              linea.cantidad
            )
          : [];
        for (let indice = 0; indice < linea.cantidad; indice += 1) {
          const fila = grupo.filas[entregadas];
          if (!fila) throw new Error('La compra ya no tiene entradas pendientes');
          const reparto = repartos[indice] ?? [];
          const respuesta = await fetch(`/api/tickets/${encodeURIComponent(fila.id)}/entregar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              presentacion_id: linea.bebida.presentacion_id,
              tipo_entrega: linea.formato,
              acompanamientos: reparto.length
                ? reparto.map(sabor => ({
                    presentacion_id: sabor.presentacion_id,
                    unidades: sabor.unidades
                  }))
                : null,
              monto_adicional: montoCobroBarra(
                precioVisible(linea.bebida, linea.formato),
                Number(fila.monto_entrada) || 0,
                topeCover
              )
            })
          });
          const json: unknown = await respuesta.json().catch(() => null);
          if (!respuesta.ok || !esRegistro(json) || json.success !== true)
            throw new Error(mensajeDe(json, 'No se pudo entregar la bebida'));
          entregadas += 1;
        }
      }
      toast.success(entregadas === 1 ? 'Cover entregado' : `${entregadas} covers entregados`, {
        description: grupo.cliente || undefined
      });
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
  }, [
    entregando,
    faltaAcompanamiento,
    grupo,
    lineas,
    onClose,
    onEntregado,
    presupuestoInsuficiente,
    topeCover,
    totalSeleccionado
  ]);

  return (
    <Dialog
      open={abierto}
      onOpenChange={open => {
        if (!open) cerrar();
      }}
    >
      <DialogContent className='max-h-[88vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Entregar covers</DialogTitle>
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

        <div className='space-y-1'>
          <Label htmlFor='monto-adicional-grupo' className='text-xs'>
            Monto adicional del grupo
          </Label>
          <Input
            id='monto-adicional-grupo'
            inputMode='numeric'
            value={montoAdicional}
            onChange={evento => setMontoAdicional(evento.target.value.replace(/[^\d]/g, ''))}
            placeholder='0'
          />
        </div>

        <p className='text-xs text-muted-foreground'>
          Entradas {formatCurrencyCLP(totalEntradas)}
          {adicional > 0 ? ` + adicional ${formatCurrencyCLP(adicional)}` : ''} = presupuesto{' '}
          {formatCurrencyCLP(presupuesto)}. Se listan cortes y botellas sin anfitriona hasta ese
          monto y la diferencia se cobra en la barra.
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
              : `Sin productos hasta ${formatCurrencyCLP(presupuesto)} con stock en el bar.`}
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
                        Cover
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
              const opciones = opcionesCoverPara(acompanamientos, linea.bebida);
              const necesitaCover = requiereAcompanamiento(linea.bebida, linea.formato);
              const unidades = unidadesAcompanamientoLinea(
                linea.bebida,
                linea.formato,
                linea.cantidad
              );
              const asignado = linea.reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
              const falta = necesitaCover
                ? opciones.length === 0
                  ? linea.formato === 'botella'
                  : asignado !== unidades
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
                        onClick={() =>
                          quitar(
                            linea.clave,
                            unidadesAcompanamientoFormato(linea.bebida, linea.formato)
                          )
                        }
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
                          ? linea.cantidad > 1
                            ? 'Acompañamiento de los cortes'
                            : 'Acompañamiento del corte'
                          : linea.cantidad > 1
                            ? 'Acompañamiento incluido en las botellas'
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
                        <AcompanamientoDistribuidor
                          id={`cover-${linea.clave}`}
                          opciones={opciones}
                          requeridas={unidades}
                          valor={linea.reparto}
                          onChange={reparto => cambiarReparto(linea.clave, reparto)}
                          repartoTotal
                          disabled={entregando}
                        />
                      )}
                      {falta && opciones.length > 0 ? (
                        <p className='text-xs text-amber-600 dark:text-amber-400'>
                          Reparte el cover para continuar.
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
            <div className='rounded-xl border border-dashed p-3 text-xs'>
              <p className='flex flex-wrap justify-between gap-2 text-muted-foreground'>
                <span>Productos</span>
                <span className='font-medium text-foreground tabular-nums'>
                  {formatCurrencyCLP(precioSeleccionado)} de {formatCurrencyCLP(presupuesto)}
                </span>
              </p>
              <p className='mt-1 flex flex-wrap justify-between gap-2 text-muted-foreground'>
                <span>Cobro en barra</span>
                <span className='font-medium text-foreground tabular-nums'>
                  {formatCurrencyCLP(cobroBarra)} de {formatCurrencyCLP(adicional)}
                </span>
              </p>
              {excedePresupuesto ? (
                <p className='mt-2 text-amber-600 dark:text-amber-400'>
                  Faltan {formatCurrencyCLP(precioSeleccionado - presupuesto)} de presupuesto para
                  esta selección.
                </p>
              ) : null}
              {excedeAdicional ? (
                <p className='mt-2 text-amber-600 dark:text-amber-400'>
                  El cobro en barra supera el monto adicional en{' '}
                  {formatCurrencyCLP(cobroBarra - adicional)}.
                </p>
              ) : null}
            </div>
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
              presupuestoInsuficiente ||
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
