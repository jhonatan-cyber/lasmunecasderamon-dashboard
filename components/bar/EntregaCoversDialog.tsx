'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  cover_habilitado?: boolean;
  acompanamiento_cliente?: boolean;
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
  ml_botella: number;
  ml_shot: number;
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
    cover_habilitado:
      typeof opcion.cover_habilitado === 'boolean' ? opcion.cover_habilitado : undefined,
    acompanamiento_cliente:
      typeof opcion.acompanamiento_cliente === 'boolean'
        ? opcion.acompanamiento_cliente
        : undefined,
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
    ml_botella: numero(valor.ml_botella),
    ml_shot: numero(valor.ml_shot),
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

function formatosCover(bebida: Bebida, presupuesto: number): Formato[] {
  const formatos: Formato[] = [];
  if (bebida.opciones_venta.find(opcion => opcion.tipo === 'botella')?.cover_habilitado === false)
    return formatos;
  const corte = precioCorte(bebida);
  if (corte !== null && corte <= presupuesto) formatos.push('corte');
  if (bebida.precio_sin_anfitriona > 0 && bebida.precio_sin_anfitriona <= presupuesto)
    formatos.push('botella');
  return formatos;
}

function precioVisible(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? (precioCorte(bebida) ?? 0) : bebida.precio_sin_anfitriona;
}

function unidadesAcompanamientoFormato(bebida: Bebida, formato: Formato): number {
  return formato === 'corte'
    ? bebida.opciones_venta.find(opcion => opcion.tipo === 'shot')?.acompanamiento_cliente === false
      ? 0
      : 1
    : unidadesAcompanamiento(bebida);
}

/** Unidades que hay que repartir entre todas las entregas de la línea. */
function unidadesAcompanamientoLinea(bebida: Bebida, formato: Formato, cantidad: number): number {
  return unidadesAcompanamientoFormato(bebida, formato) * Math.max(1, cantidad);
}

function requiereAcompanamiento(bebida: Bebida, formato: Formato): boolean {
  return unidadesAcompanamientoFormato(bebida, formato) > 0;
}

function opcionesCoverPara(acompanamientos: Acompanamiento[], bebida: Bebida): Acompanamiento[] {
  return acompanamientos.filter(
    opcion => opcion.id !== bebida.presentacion_id && opcion.stock_bar >= 1
  );
}

const claveDe = (bebida: Bebida, formato: Formato) => `${bebida.presentacion_id}:${formato}`;

function consumoProducto(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' && bebida.ml_shot > 0 && bebida.ml_botella > 0
    ? bebida.ml_shot / bebida.ml_botella
    : 1;
}

const aporteSchema = z.object({ montoAdicional: z.string().regex(/^\d*$/) });

async function pedirCatalogo(url: string, signal: AbortSignal): Promise<unknown[]> {
  const respuesta = await fetch(url, { cache: 'no-store', signal });
  const json: unknown = await respuesta.json().catch(() => null);
  const lista = listaDe(json);
  if (!respuesta.ok || lista === null)
    throw new Error(mensajeDe(json, 'No se pudieron cargar las bebidas del bar'));
  return lista;
}

type UnidadEntrega = {
  presentacion_id: string;
  tipo_entrega: Formato;
  acompanamientos: { presentacion_id: string; unidades: number }[] | null;
};

type ResultadoGrupo = {
  entradas: number;
  productos: number;
  montoEntrada: number;
  montoCobrarBarra: number;
  presupuesto: number;
};

export function EntregaCoversDialog({ grupo, onClose, onEntregado }: Props) {
  const enviando = useRef(false);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Record<string, LineaSeleccion>>({});
  const { register, watch, reset, setValue, setError, clearErrors, formState } = useForm({
    resolver: zodResolver(aporteSchema),
    defaultValues: { montoAdicional: '' }
  });
  const montoAdicional = watch('montoAdicional');
  const abierto = grupo !== null;
  const catalogo = useQuery({
    queryKey: ['bar', 'covers', 'productos'],
    enabled: abierto,
    queryFn: ({ signal }) => pedirCatalogo(urlProductosParaVenta(), signal)
  });
  const catalogoCover = useQuery({
    queryKey: ['bar', 'covers', 'acompanamientos'],
    enabled: abierto,
    queryFn: ({ signal }) => pedirCatalogo(urlProductosParaVenta({ solo_cover: true }), signal)
  });
  const bebidas = useMemo(
    () => (catalogo.data ?? []).map(aBebida).filter((item): item is Bebida => item !== null),
    [catalogo.data]
  );
  const acompanamientos = useMemo(
    () =>
      (catalogoCover.data ?? [])
        .map(aAcompanamiento)
        .filter((item): item is Acompanamiento => item !== null),
    [catalogoCover.data]
  );
  const cargando = catalogo.isFetching || catalogoCover.isFetching;
  const errorBebidas = catalogo.error?.message;
  const errorCover = catalogoCover.error?.message;
  const mutacionGrupo = useMutation({
    mutationFn: async (payload: {
      entrada_ids: string[];
      monto_adicional: number;
      unidades: UnidadEntrega[];
    }) => {
      const respuesta = await fetch('/api/tickets/entregar-grupo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json: unknown = await respuesta.json().catch(() => null);
      if (!respuesta.ok || !esRegistro(json) || json.success !== true || !esRegistro(json.data))
        throw new Error(mensajeDe(json, 'No se pudo entregar el grupo'));
      const data = json.data;
      return {
        entradas: numero(data.entradas),
        productos: numero(data.productos),
        montoEntrada: numero(data.montoEntrada),
        montoCobrarBarra: numero(data.montoCobrarBarra),
        presupuesto: numero(data.presupuesto)
      } satisfies ResultadoGrupo;
    },
    retry: false
  });
  const entregando = mutacionGrupo.isPending;
  const filas = useMemo(() => grupo?.filas ?? [], [grupo]);
  const totalEntradas = useMemo(
    () => filas.reduce((suma, fila) => suma + (Number(fila.monto_entrada) || 0), 0),
    [filas]
  );
  const adicional = Math.max(0, Math.floor(Number(montoAdicional) || 0));
  const presupuesto = totalEntradas + adicional;

  useEffect(() => {
    if (!abierto) return;
    setSeleccion({});
    setBusqueda('');
    reset({ montoAdicional: '' });
  }, [abierto, grupo?.id, reset]);

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda);
    return bebidas
      .flatMap(bebida => {
        if (categoriaFueraDeCover(bebida.categoria_nombre)) return [];
        const formatos = formatosCover(bebida, presupuesto);
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
  }, [bebidas, busqueda, presupuesto, seleccion]);

  // El catálogo se agrupa por categoría para que la anfitriona encuentre el
  // producto por tipo; "Sin categoría" queda al final.
  const gruposVisibles = useMemo(() => {
    const grupos = new Map<string, { bebida: Bebida; formato: Formato }[]>();
    for (const item of visibles) {
      const categoria = item.bebida.categoria_nombre ?? 'Sin categoría';
      const lista = grupos.get(categoria);
      if (lista) lista.push(item);
      else grupos.set(categoria, [item]);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => {
        if (a === 'Sin categoría') return 1;
        if (b === 'Sin categoría') return -1;
        return a.localeCompare(b, 'es');
      })
      .map(([categoria, items]) => ({ categoria, items }));
  }, [visibles]);

  const totalSeleccionado = useMemo(
    () => Object.values(seleccion).reduce((suma, linea) => suma + linea.cantidad, 0),
    [seleccion]
  );

  /** Costo de una selección cualquiera; también se usa antes de agregar una unidad. */
  const costoDe = useCallback(
    (seleccionActual: Record<string, LineaSeleccion>) =>
      Object.entries(seleccionActual).reduce((suma, [clave, linea]) => {
        const [presentacionId, formato] = clave.split(':') as [string, Formato];
        const bebida = bebidas.find(item => item.presentacion_id === presentacionId);
        return bebida ? suma + precioVisible(bebida, formato) * linea.cantidad : suma;
      }, 0),
    [bebidas]
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

  const precioSeleccionado = costoDe(seleccion);
  const restante = Math.max(0, presupuesto - precioSeleccionado);
  const excedePresupuesto = precioSeleccionado > presupuesto;

  const consumoDe = useCallback(
    (actual: Record<string, LineaSeleccion>) => {
      const consumo = new Map<string, number>();
      for (const [clave, linea] of Object.entries(actual)) {
        const [presentacionId, formato] = clave.split(':') as [string, Formato];
        const bebida = bebidas.find(item => item.presentacion_id === presentacionId);
        const porUnidad = bebida ? consumoProducto(bebida, formato) : 1;
        consumo.set(
          presentacionId,
          (consumo.get(presentacionId) ?? 0) + linea.cantidad * porUnidad
        );
        for (const sabor of linea.reparto)
          consumo.set(
            sabor.presentacion_id,
            (consumo.get(sabor.presentacion_id) ?? 0) + sabor.unidades
          );
      }
      return consumo;
    },
    [bebidas]
  );
  const stockDe = useCallback(
    (id: string) =>
      bebidas.find(item => item.presentacion_id === id)?.stock_bar ??
      acompanamientos.find(item => item.id === id)?.stock_bar ??
      0,
    [bebidas, acompanamientos]
  );
  const stockValido = useCallback(
    (actual: Record<string, LineaSeleccion>) =>
      [...consumoDe(actual)].every(([id, unidades]) => unidades <= stockDe(id) + 1e-9),
    [consumoDe, stockDe]
  );
  const consumo = useMemo(() => consumoDe(seleccion), [consumoDe, seleccion]);
  const excedeStock = !stockValido(seleccion);

  const opcionesParaLinea = (clave: string, bebida: Bebida) => {
    const reparto = seleccion[clave]?.reparto ?? [];
    return opcionesCoverPara(acompanamientos, bebida)
      .map(opcion => ({
        ...opcion,
        stock_bar: Math.max(
          0,
          opcion.stock_bar -
            (consumo.get(opcion.id) ?? 0) +
            (reparto.find(sabor => sabor.presentacion_id === opcion.id)?.unidades ?? 0)
        )
      }))
      .filter(
        opcion =>
          opcion.stock_bar >= 1 || reparto.some(sabor => sabor.presentacion_id === opcion.id)
      );
  };
  const puedeAgregar = (bebida: Bebida, formato: Formato) =>
    !entregando &&
    precioSeleccionado + precioVisible(bebida, formato) <= presupuesto &&
    (consumo.get(bebida.presentacion_id) ?? 0) + consumoProducto(bebida, formato) <=
      bebida.stock_bar + 1e-9;

  const cambiarMontoAdicional = (valor: string) => {
    const limpio = valor.replace(/[^\d]/g, '');
    const nuevo = Number(limpio) || 0;
    if (!Number.isSafeInteger(nuevo) || totalEntradas + nuevo < precioSeleccionado) {
      setError('montoAdicional', {
        message: `Quita productos antes de reducir el adicional. La selección requiere al menos ${formatCurrencyCLP(Math.max(0, precioSeleccionado - totalEntradas))}.`
      });
      return;
    }
    clearErrors('montoAdicional');
    setValue('montoAdicional', limpio, { shouldValidate: true });
  };

  const agregar = useCallback(
    (bebida: Bebida, formato: Formato) => {
      if (entregando) return;
      const clave = claveDe(bebida, formato);
      setSeleccion(previo => {
        if (costoDe(previo) + precioVisible(bebida, formato) > presupuesto) return previo;
        const siguiente = {
          ...previo,
          [clave]: {
            cantidad: (previo[clave]?.cantidad ?? 0) + 1,
            reparto: previo[clave]?.reparto ?? []
          }
        };
        return stockValido(siguiente) ? siguiente : previo;
      });
    },
    [costoDe, entregando, presupuesto, stockValido]
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

  const cambiarReparto = useCallback(
    (clave: string, reparto: AcompanamientoBotellaItem[]) => {
      if (entregando) return;
      setSeleccion(previo => {
        if (!previo[clave]) return previo;
        const siguiente = { ...previo, [clave]: { ...previo[clave], reparto } };
        const liberaStock = reparto.every(
          sabor =>
            sabor.unidades <=
            (previo[clave].reparto.find(actual => actual.presentacion_id === sabor.presentacion_id)
              ?.unidades ?? 0)
        );
        return liberaStock || stockValido(siguiente) ? siguiente : previo;
      });
    },
    [entregando, stockValido]
  );

  const cerrar = useCallback(() => {
    if (entregando) return;
    onClose();
  }, [entregando, onClose]);

  const entregar = async () => {
    if (
      !grupo ||
      entregando ||
      enviando.current ||
      cargando ||
      errorBebidas ||
      errorCover ||
      filas.length === 0
    )
      return;
    if (lineas.length === 0) {
      toast.error('Selecciona al menos una bebida para entregar');
      return;
    }
    if (faltaAcompanamiento) {
      toast.error('Selecciona el acompañamiento de cada producto que lo incluye');
      return;
    }
    if (excedePresupuesto || excedeStock) {
      toast.error(
        excedeStock
          ? 'La selección supera el stock disponible'
          : 'Sube el monto adicional o quita productos para cubrir la selección'
      );
      return;
    }
    const unidades: UnidadEntrega[] = lineas.flatMap(linea => {
      const repartos = requiereAcompanamiento(linea.bebida, linea.formato)
        ? dividirRepartoPorEntrega(
            linea.reparto,
            unidadesAcompanamientoFormato(linea.bebida, linea.formato),
            linea.cantidad
          )
        : [];
      return Array.from({ length: linea.cantidad }, (_, indice) => ({
        presentacion_id: linea.bebida.presentacion_id,
        tipo_entrega: linea.formato,
        acompanamientos: repartos[indice]?.length
          ? repartos[indice].map(({ presentacion_id, unidades }) => ({ presentacion_id, unidades }))
          : null
      }));
    });
    enviando.current = true;
    try {
      const resultado = await mutacionGrupo.mutateAsync({
        entrada_ids: filas.map(fila => fila.id),
        monto_adicional: adicional,
        unidades
      });
      toast.success(`${resultado.productos} productos entregados`, {
        description: grupo.cliente || undefined
      });
    } catch (error) {
      toast.error('No se pudo entregar el grupo', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo.'
      });
      return;
    } finally {
      enviando.current = false;
    }
    onClose();
    try {
      await onEntregado();
    } catch {
      toast.error('El grupo se entregó. No se pudo actualizar el listado.');
    }
  };

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
            {...register('montoAdicional')}
            value={montoAdicional}
            disabled={entregando}
            onChange={evento => cambiarMontoAdicional(evento.target.value)}
            aria-invalid={Boolean(formState.errors.montoAdicional)}
            aria-describedby='error-monto-adicional-grupo'
            placeholder='0'
          />
        </div>

        {formState.errors.montoAdicional ? (
          <p id='error-monto-adicional-grupo' role='alert' className='text-xs text-destructive'>
            {formState.errors.montoAdicional.message}
          </p>
        ) : null}

        <p className='text-xs text-muted-foreground'>
          Entradas {formatCurrencyCLP(totalEntradas)}
          {adicional > 0 ? ` + adicional ${formatCurrencyCLP(adicional)}` : ''} = presupuesto{' '}
          {formatCurrencyCLP(presupuesto)}. Se listan cortes y botellas sin anfitriona hasta ese
          monto. El adicional se cobra completo en la barra con el método de pago del grupo.
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
          <div role='group' aria-label='Bebidas del bar' className='space-y-4'>
            {gruposVisibles.map(({ categoria, items }) => (
              <section key={categoria} aria-label={categoria} className='space-y-2'>
                <div className='flex items-baseline justify-between gap-2'>
                  <h3 className='text-sm font-semibold'>{categoria}</h3>
                  <span className='text-xs text-muted-foreground tabular-nums'>
                    {items.length} {items.length === 1 ? 'opción' : 'opciones'}
                  </span>
                </div>
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {items.map(({ bebida, formato }) => {
                    const clave = claveDe(bebida, formato);
                    const cantidad = seleccion[clave]?.cantidad ?? 0;
                    const sinStock =
                      (consumo.get(bebida.presentacion_id) ?? 0) +
                        consumoProducto(bebida, formato) >
                      bebida.stock_bar + 1e-9;
                    const precio = precioVisible(bebida, formato);
                    const excede = precioSeleccionado + precio > presupuesto;
                    const nombreBebida =
                      `${bebida.producto_nombre} ${bebida.presentacion_nombre}`.trim();
                    return (
                      <Button
                        key={clave}
                        type='button'
                        variant='unstyled'
                        disabled={!puedeAgregar(bebida, formato)}
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
                          {excede && !sinStock ? (
                            <span className='text-[11px] font-medium text-amber-600 dark:text-amber-400'>
                              No alcanza el presupuesto
                            </span>
                          ) : null}
                          <span className='mt-auto flex flex-wrap items-center gap-1.5 pt-1'>
                            <span className='text-[11px] text-muted-foreground'>
                              {sinStock ? 'Sin stock' : `${bebida.stock_bar} en bar`}
                            </span>
                            <Badge
                              variant='secondary'
                              className='rounded-full px-2 py-0 text-[11px]'
                            >
                              Cover
                            </Badge>
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {lineas.length > 0 ? (
          <div className='space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <h3 className='text-sm font-semibold'>Seleccionados</h3>
              <span className='text-xs text-muted-foreground tabular-nums'>
                {totalSeleccionado} productos
              </span>
            </div>
            {lineas.map(linea => {
              const opciones = opcionesParaLinea(linea.clave, linea.bebida);
              const opcionesCatalogo = opcionesCoverPara(acompanamientos, linea.bebida);
              const necesitaCover = requiereAcompanamiento(linea.bebida, linea.formato);
              const unidades = unidadesAcompanamientoLinea(
                linea.bebida,
                linea.formato,
                linea.cantidad
              );
              const asignado = linea.reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
              const falta = necesitaCover
                ? opcionesCatalogo.length === 0
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
                        disabled={entregando}
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
                        disabled={!puedeAgregar(linea.bebida, linea.formato)}
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
                        disabled={entregando}
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
                          {opcionesCatalogo.length > 0
                            ? 'El stock de acompañamientos está reservado en otros productos. Ajusta el reparto.'
                            : linea.formato === 'botella'
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
              {totalSeleccionado} productos para {filas.length}{' '}
              {filas.length === 1 ? 'entrada' : 'entradas'}. El grupo comparte todo el presupuesto.
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
                  {formatCurrencyCLP(adicional)}
                </span>
              </p>
              {excedePresupuesto ? null : (
                <p className='mt-1 text-muted-foreground'>
                  {restante > 0
                    ? `Quedan ${formatCurrencyCLP(restante)} de presupuesto.`
                    : 'Presupuesto completo.'}
                </p>
              )}
              {excedePresupuesto ? (
                <p className='mt-2 text-amber-600 dark:text-amber-400'>
                  Faltan {formatCurrencyCLP(precioSeleccionado - presupuesto)} de presupuesto para
                  esta selección.
                </p>
              ) : null}
              {excedeStock ? (
                <p className='mt-2 text-destructive'>
                  La selección supera el stock disponible. Ajusta los productos o acompañamientos.
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
              excedePresupuesto ||
              excedeStock ||
              Boolean(errorCover) ||
              filas.length === 0
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
