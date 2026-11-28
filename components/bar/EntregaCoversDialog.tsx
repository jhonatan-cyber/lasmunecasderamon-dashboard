'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, Info, LoaderCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CategoryCardList from '@/components/shared/CategoryCardList';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { AcompanamientoDistribuidor } from '@/components/shared/AcompanamientoDistribuidor';
import { IndividualHostessSelect, RoomSelect } from '@/components/shared/selects';
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
import {
  precioUnitarioAcompanamiento,
  recargoAcompanamientoPorUnidad
} from '@/lib/sales/recargoAcompanamiento';
import { formatCurrencyCLP, formatNumberInputOrEmpty } from '@/lib/utils/formatters';
import { productImageUrl } from '@/lib/utils/productImage';
import { cn } from '@/lib/utils/utils';

type JsonRecord = Record<string, unknown>;

type OpcionVenta = {
  tipo: string;
  precio?: number;
  precio_sin_anfitriona?: number;
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
  precio: number;
  stock_bar: number;
  foto: string | null;
};

type AnfitrionaOpcion = {
  id_usuario: number;
  nombre: string;
  apellido?: string;
  nick?: string;
};

type HabitacionOpcion = {
  id_habitacion: string;
  nombre: string;
  numero?: string;
  estado: number;
  display_order?: number | null;
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

type LineaBebida = LineaSeleccion & {
  clave: string;
  bebida: Bebida;
  formato: Formato;
};

type BorradorIndividual = {
  seleccion: Record<string, LineaSeleccion>;
  montoAdicional: string;
  anfitrionaId: string;
  habitacionId: string;
};

type UnidadEntrega = {
  presentacion_id: string;
  tipo_entrega: Formato;
  acompanamientos: { presentacion_id: string; unidades: number }[] | null;
};

type EntregaIndividualPayload = {
  entregas: {
    entrada_id: string;
    monto_adicional: number;
    unidades: UnidadEntrega[];
    anfitriona_id: string | null;
    habitacion_id: string | null;
  }[];
};

type EntregaGrupalPayload = {
  entrada_ids: string[];
  monto_adicional: number;
  unidades: UnidadEntrega[];
};

const BORRADOR_VACIO: BorradorIndividual = {
  seleccion: {},
  montoAdicional: '',
  anfitrionaId: '',
  habitacionId: ''
};

type Props = {
  grupo: GrupoCover | null;
  tope: number;
  onClose: () => void;
  onEntregado: () => void | Promise<void>;
  /** El barman no entrega: pide autorización y la entrega la ejecuta el cajero. */
  modo?: 'entrega' | 'solicitud';
};

const esRegistro = (valor: unknown): valor is JsonRecord =>
  typeof valor === 'object' && valor !== null;

const texto = (valor: unknown, respaldo = ''): string =>
  typeof valor === 'string' ? valor : typeof valor === 'number' ? String(valor) : respaldo;

const numero = (valor: unknown, respaldo = 0): number => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : respaldo;
};

function aAnfitriona(valor: unknown): AnfitrionaOpcion | null {
  if (!esRegistro(valor)) return null;
  const id = Number(valor.id_usuario ?? valor.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return {
    id_usuario: id,
    nombre: texto(valor.nombre),
    apellido: texto(valor.apellido) || undefined,
    nick: texto(valor.nick) || undefined
  };
}

function aHabitacion(valor: unknown): HabitacionOpcion | null {
  if (!esRegistro(valor)) return null;
  const id = texto(valor.id_habitacion ?? valor.id);
  if (!id) return null;
  return {
    id_habitacion: id,
    nombre: texto(valor.nombre ?? valor.name),
    numero: texto(valor.numero) || undefined,
    estado: numero(valor.estado ?? valor.status),
    display_order: numero(valor.display_order, 0)
  };
}

function combinarSelecciones(
  selecciones: Record<string, LineaSeleccion>[]
): Record<string, LineaSeleccion> {
  const resultado: Record<string, LineaSeleccion> = {};
  for (const seleccion of selecciones) {
    for (const [clave, linea] of Object.entries(seleccion)) {
      const actual = resultado[clave];
      const repartos = new Map<string, number>();
      for (const sabor of [...(actual?.reparto ?? []), ...linea.reparto])
        repartos.set(
          sabor.presentacion_id,
          (repartos.get(sabor.presentacion_id) ?? 0) + sabor.unidades
        );
      resultado[clave] = {
        cantidad: (actual?.cantidad ?? 0) + linea.cantidad,
        reparto: [...repartos].map(([presentacion_id, unidades]) => ({
          presentacion_id,
          unidades
        }))
      };
    }
  }
  return resultado;
}

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
    precio: precioUnitarioAcompanamiento(valor),
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

function formatosCover(bebida: Bebida, precioMaximo: number): Formato[] {
  const formatos: Formato[] = [];
  const corte = precioCorte(bebida);
  if (corte !== null && corte <= precioMaximo) formatos.push('corte');
  if (bebida.precio_sin_anfitriona > 0 && bebida.precio_sin_anfitriona <= precioMaximo)
    formatos.push('botella');
  return formatos;
}

function precioVisible(bebida: Bebida, formato: Formato): number {
  if (formato === 'corte') {
    const corte = precioCorte(bebida);
    return corte ?? 0;
  }
  return bebida.precio_sin_anfitriona;
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

function unidadesDeLineas(lineas: LineaBebida[]): UnidadEntrega[] {
  return lineas.flatMap(linea => {
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

async function pedirCatalogo(
  url: string,
  signal: AbortSignal,
  errorFallback = 'No se pudieron cargar las bebidas del bar'
): Promise<unknown[]> {
  const respuesta = await fetch(url, { cache: 'no-store', signal });
  const json: unknown = await respuesta.json().catch(() => null);
  const lista = listaDe(json);
  if (!respuesta.ok || lista === null) throw new Error(mensajeDe(json, errorFallback));
  return lista;
}

export function EntregaCoversDialog({
  grupo,
  tope,
  onClose,
  onEntregado,
  modo = 'entrega'
}: Props) {
  const enviando = useRef(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [seleccionGrupal, setSeleccionGrupal] = useState<Record<string, LineaSeleccion>>({});
  const [borradoresIndividuales, setBorradoresIndividuales] = useState<
    Record<string, BorradorIndividual>
  >({});
  const [tipoEntrega, setTipoEntrega] = useState<'grupal' | 'individual'>('grupal');
  const [entradaIndividualId, setEntradaIndividualId] = useState(grupo?.filas[0]?.id ?? '');
  const { control, register, reset, setValue, setError, clearErrors, formState } = useForm({
    resolver: zodResolver(aporteSchema),
    defaultValues: { montoAdicional: '' }
  });
  const montoAdicionalFormulario = useWatch({ control, name: 'montoAdicional' });
  const abierto = grupo !== null;
  const filasGrupo = useMemo(() => grupo?.filas ?? [], [grupo?.filas]);
  const entregaIndividual = modo === 'entrega' && tipoEntrega === 'individual';
  const borradorActual = borradoresIndividuales[entradaIndividualId] ?? BORRADOR_VACIO;
  const seleccion = entregaIndividual ? borradorActual.seleccion : seleccionGrupal;
  const montoAdicional = entregaIndividual
    ? borradorActual.montoAdicional
    : montoAdicionalFormulario;
  const filas = useMemo(() => {
    if (tipoEntrega !== 'individual' || filasGrupo.length <= 1) return filasGrupo;
    const fila = filasGrupo.find(item => item.id === entradaIndividualId) ?? filasGrupo[0];
    return fila ? [fila] : [];
  }, [entradaIndividualId, filasGrupo, tipoEntrega]);
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
  const anfitrionasQuery = useQuery({
    queryKey: ['bar', 'covers', 'anfitrionas'],
    enabled: abierto && entregaIndividual,
    queryFn: ({ signal }) =>
      pedirCatalogo('/api/hostesses/available', signal, 'No se pudieron cargar las anfitrionas')
  });
  const habitacionesQuery = useQuery({
    queryKey: ['bar', 'covers', 'habitaciones'],
    enabled: abierto && entregaIndividual,
    queryFn: ({ signal }) =>
      pedirCatalogo('/api/rooms?status=1', signal, 'No se pudieron cargar las habitaciones')
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
  const anfitrionas = useMemo(
    () =>
      (anfitrionasQuery.data ?? [])
        .map(aAnfitriona)
        .filter((item): item is AnfitrionaOpcion => item !== null),
    [anfitrionasQuery.data]
  );
  const habitaciones = useMemo(
    () =>
      (habitacionesQuery.data ?? [])
        .map(aHabitacion)
        .filter((item): item is HabitacionOpcion => item !== null),
    [habitacionesQuery.data]
  );
  const cargando = catalogo.isFetching || catalogoCover.isFetching;
  const cargandoRelaciones = anfitrionasQuery.isLoading || habitacionesQuery.isLoading;
  const errorRelaciones = anfitrionasQuery.error?.message ?? habitacionesQuery.error?.message;
  const errorBebidas = catalogo.error?.message;
  const errorCover = catalogoCover.error?.message;
  const mutacionGrupo = useMutation({
    mutationFn: async (payload: EntregaGrupalPayload | EntregaIndividualPayload) => {
      const solicitud = modo === 'solicitud';
      const esIndividual = 'entregas' in payload;
      const respuesta = await fetch(
        solicitud ? '/api/tickets/cover-solicitudes' : '/api/tickets/entregar-grupo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            solicitud
              ? {
                  grupo_registro_id: grupo?.id ?? null,
                  cliente_nombre: grupo?.cliente ?? null,
                  ...payload
                }
              : payload
          )
        }
      );
      const json: unknown = await respuesta.json().catch(() => null);
      if (!respuesta.ok || !esRegistro(json) || json.success !== true || !esRegistro(json.data))
        throw new Error(
          mensajeDe(
            json,
            solicitud
              ? 'No se pudo enviar la solicitud'
              : esIndividual
                ? 'No se pudieron entregar las entradas'
                : payload.entrada_ids.length === 1
                  ? 'No se pudo entregar la entrada'
                  : 'No se pudo entregar el grupo'
          )
        );
      if (solicitud)
        return {
          productos: esIndividual
            ? payload.entregas.reduce((total, entrega) => total + entrega.unidades.length, 0)
            : payload.unidades.length
        };
      return { productos: numero((json.data as JsonRecord).productos) };
    },
    retry: false
  });
  const entregando = mutacionGrupo.isPending;
  const totalEntradas = useMemo(
    () => filas.reduce((suma, fila) => suma + (Number(fila.monto_entrada) || 0), 0),
    [filas]
  );
  const adicionalManual = Math.max(0, Math.floor(Number(montoAdicional) || 0));
  const topeCover = Number.isFinite(tope) ? Math.max(0, tope) : 0;
  const presupuestoProductos = totalEntradas + adicionalManual;
  const precioMaximo = Math.min(
    presupuestoProductos,
    filas.length === 1 ? topeCover + adicionalManual : presupuestoProductos
  );

  const setSeleccion = useCallback(
    (
      actualizacion:
        | Record<string, LineaSeleccion>
        | ((actual: Record<string, LineaSeleccion>) => Record<string, LineaSeleccion>)
    ) => {
      if (!entregaIndividual) {
        setSeleccionGrupal(actualizacion);
        return;
      }
      setBorradoresIndividuales(previo => {
        const actual = previo[entradaIndividualId] ?? BORRADOR_VACIO;
        const siguiente =
          typeof actualizacion === 'function' ? actualizacion(actual.seleccion) : actualizacion;
        return {
          ...previo,
          [entradaIndividualId]: { ...actual, seleccion: siguiente }
        };
      });
    },
    [entradaIndividualId, entregaIndividual]
  );

  const actualizarBorrador = useCallback(
    (actualizacion: Partial<BorradorIndividual>) => {
      setBorradoresIndividuales(previo => ({
        ...previo,
        [entradaIndividualId]: {
          ...(previo[entradaIndividualId] ?? BORRADOR_VACIO),
          ...actualizacion
        }
      }));
    },
    [entradaIndividualId]
  );

  const limpiarSeleccionDeEntrega = () => {
    setSeleccionGrupal({});
    setBorradoresIndividuales({});
    reset({ montoAdicional: '' });
    clearErrors('montoAdicional');
  };

  const cambiarTipoEntrega = (valor: string) => {
    if ((valor !== 'grupal' && valor !== 'individual') || valor === tipoEntrega || entregando)
      return;
    setTipoEntrega(valor);
    if (valor === 'individual') setEntradaIndividualId(filasGrupo[0]?.id ?? '');
    limpiarSeleccionDeEntrega();
  };

  const seleccionarEntradaIndividual = (id: string) => {
    if (entregando || id === entradaIndividualId || !filasGrupo.some(fila => fila.id === id))
      return;
    setEntradaIndividualId(id);
    if (modo === 'solicitud') setSeleccionGrupal({});
    reset({ montoAdicional: borradoresIndividuales[id]?.montoAdicional ?? '' });
    clearErrors('montoAdicional');
  };

  useEffect(() => {
    if (!abierto) return;
    setTipoEntrega('grupal');
    setEntradaIndividualId(grupo?.filas[0]?.id ?? '');
    setSeleccionGrupal({});
    setBorradoresIndividuales({});
    setBusqueda('');
    setCategoriaSeleccionada(null);
    reset({ montoAdicional: '' });
  }, [abierto, grupo?.filas, grupo?.id, reset]);

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda);
    return bebidas
      .flatMap(bebida => {
        if (bebida.stock_bar <= 0 || categoriaFueraDeCover(bebida.categoria_nombre)) return [];
        const formatos = formatosCover(bebida, precioMaximo);
        // Lo ya elegido se mantiene visible aunque el presupuesto baje.
        for (const formato of ['corte', 'botella'] as Formato[]) {
          const clave = claveDe(bebida, formato);
          if (
            seleccion[clave] &&
            precioVisible(bebida, formato) <= topeCover &&
            !formatos.includes(formato)
          )
            formatos.push(formato);
        }
        return formatos.map(formato => ({ bebida, formato }));
      })
      .filter(
        ({ bebida, formato }) =>
          !termino ||
          Boolean(seleccion[claveDe(bebida, formato)]) ||
          normalizar(`${bebida.producto_nombre} ${bebida.presentacion_nombre}`).includes(termino)
      );
  }, [bebidas, busqueda, precioMaximo, seleccion, topeCover]);

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
  const categoriasVisibles = useMemo(() => {
    const grupos = new Map<string, Set<string>>();
    for (const bebida of bebidas) {
      if (
        bebida.stock_bar <= 0 ||
        categoriaFueraDeCover(bebida.categoria_nombre) ||
        formatosCover(bebida, precioMaximo).length === 0
      )
        continue;
      const categoria = bebida.categoria_nombre ?? 'Sin categoría';
      const presentaciones = grupos.get(categoria) ?? new Set<string>();
      presentaciones.add(bebida.presentacion_id);
      grupos.set(categoria, presentaciones);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => {
        if (a === 'Sin categoría') return 1;
        if (b === 'Sin categoría') return -1;
        return a.localeCompare(b, 'es');
      })
      .map(([name, presentaciones]) => ({
        id: name,
        name,
        total_products: presentaciones.size
      }));
  }, [bebidas, precioMaximo]);
  const itemsCategoriaSeleccionada = useMemo(
    () => gruposVisibles.find(grupo => grupo.categoria === categoriaSeleccionada)?.items ?? [],
    [categoriaSeleccionada, gruposVisibles]
  );

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

  const lineasDeSeleccion = useCallback(
    (seleccionActual: Record<string, LineaSeleccion>): LineaBebida[] =>
      Object.entries(seleccionActual).flatMap(([clave, linea]) => {
        const [presentacionId, formato] = clave.split(':') as [string, Formato];
        const bebida = bebidas.find(item => item.presentacion_id === presentacionId);
        if (!bebida) return [];
        return [{ clave, bebida, formato, ...linea }];
      }),
    [bebidas]
  );
  const lineas = useMemo(() => lineasDeSeleccion(seleccion), [lineasDeSeleccion, seleccion]);

  const recargoAcompanamientos = useMemo(
    () =>
      lineas.reduce(
        (suma, linea) =>
          suma +
          recargoAcompanamientoPorUnidad({
            tope: topeCover,
            tipoVenta: 'botella',
            acompanamiento_botella: linea.reparto
          }),
        0
      ),
    [lineas, topeCover]
  );
  const adicional = adicionalManual + recargoAcompanamientos;
  const presupuesto = totalEntradas + adicional;

  const faltaAcompanamientoDe = useCallback(
    (lineasActuales: LineaBebida[]) =>
      lineasActuales.some(linea => {
        if (!requiereAcompanamiento(linea.bebida, linea.formato)) return false;
        const opciones = opcionesCoverPara(acompanamientos, linea.bebida);
        if (opciones.length === 0) return linea.formato === 'botella';
        const requeridas = unidadesAcompanamientoLinea(linea.bebida, linea.formato, linea.cantidad);
        const asignado = linea.reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
        return asignado !== requeridas;
      }),
    [acompanamientos]
  );
  const faltaAcompanamiento = faltaAcompanamientoDe(lineas);

  const excedeTopeIndividual =
    filas.length === 1 &&
    lineas.some(linea => precioVisible(linea.bebida, linea.formato) > topeCover + adicionalManual);
  const precioSeleccionado = costoDe(seleccion);
  const restante = Math.max(0, presupuestoProductos - precioSeleccionado);
  const excedePresupuesto = precioSeleccionado > presupuestoProductos;
  const resumenIndividual = useMemo(
    () =>
      entregaIndividual
        ? filasGrupo.map(fila => {
            const borrador = borradoresIndividuales[fila.id] ?? BORRADOR_VACIO;
            const lineasEntrada = lineasDeSeleccion(borrador.seleccion);
            const adicionalEntrada = Math.max(0, Math.floor(Number(borrador.montoAdicional) || 0));
            const montoEntrada = Number(fila.monto_entrada) || 0;
            const precioEntrada = costoDe(borrador.seleccion);
            const recargoEntrada = lineasEntrada.reduce(
              (suma, linea) =>
                suma +
                recargoAcompanamientoPorUnidad({
                  tope: topeCover,
                  tipoVenta: 'botella',
                  acompanamiento_botella: linea.reparto
                }),
              0
            );
            return {
              fila,
              borrador,
              lineas: lineasEntrada,
              montoEntrada,
              adicionalManual: adicionalEntrada,
              adicional: adicionalEntrada + recargoEntrada,
              precio: precioEntrada,
              unidades: unidadesDeLineas(lineasEntrada),
              faltaAcompanamiento: faltaAcompanamientoDe(lineasEntrada),
              excedePresupuesto: precioEntrada > montoEntrada + adicionalEntrada,
              excedeTope: lineasEntrada.some(
                linea => precioVisible(linea.bebida, linea.formato) > topeCover + adicionalEntrada
              )
            };
          })
        : [],
    [
      borradoresIndividuales,
      costoDe,
      entregaIndividual,
      faltaAcompanamientoDe,
      filasGrupo,
      lineasDeSeleccion,
      topeCover
    ]
  );
  const productosIndividuales = resumenIndividual.reduce(
    (total, resumen) => total + resumen.unidades.length,
    0
  );
  const adicionalIndividual = resumenIndividual.reduce(
    (total, resumen) => total + resumen.adicional,
    0
  );
  const individualCompleto =
    resumenIndividual.length === filasGrupo.length &&
    resumenIndividual.length > 0 &&
    resumenIndividual.every(
      resumen =>
        resumen.lineas.length > 0 &&
        !resumen.faltaAcompanamiento &&
        !resumen.excedePresupuesto &&
        !resumen.excedeTope
    );
  const cantidadDeBorrador = (entradaId: string) =>
    Object.values(borradoresIndividuales[entradaId]?.seleccion ?? {}).reduce(
      (total, linea) => total + linea.cantidad,
      0
    );

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
  const seleccionDeOtrasEntradas = useMemo(() => {
    if (!entregaIndividual) return {};
    return combinarSelecciones(
      filasGrupo
        .filter(fila => fila.id !== entradaIndividualId)
        .map(fila => borradoresIndividuales[fila.id]?.seleccion ?? {})
    );
  }, [borradoresIndividuales, entradaIndividualId, entregaIndividual, filasGrupo]);
  const stockValidoConActual = useCallback(
    (actual: Record<string, LineaSeleccion>) =>
      stockValido(
        entregaIndividual ? combinarSelecciones([seleccionDeOtrasEntradas, actual]) : actual
      ),
    [entregaIndividual, seleccionDeOtrasEntradas, stockValido]
  );
  const seleccionParaStock = useMemo(
    () =>
      entregaIndividual ? combinarSelecciones([seleccionDeOtrasEntradas, seleccion]) : seleccion,
    [entregaIndividual, seleccionDeOtrasEntradas, seleccion]
  );
  const consumo = useMemo(() => consumoDe(seleccionParaStock), [consumoDe, seleccionParaStock]);
  const excedeStock = !stockValido(seleccionParaStock);

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
    (filas.length > 1 || precioVisible(bebida, formato) <= topeCover + adicionalManual) &&
    precioSeleccionado + precioVisible(bebida, formato) <= presupuestoProductos &&
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
    if (
      filas.length === 1 &&
      lineas.some(linea => precioVisible(linea.bebida, linea.formato) > topeCover + nuevo)
    ) {
      setError('montoAdicional', {
        message: 'El adicional no alcanza para ampliar el tope de la bebida seleccionada.'
      });
      return;
    }
    clearErrors('montoAdicional');
    setValue('montoAdicional', limpio, { shouldValidate: true });
    if (entregaIndividual) actualizarBorrador({ montoAdicional: limpio });
  };

  const agregar = useCallback(
    (bebida: Bebida, formato: Formato) => {
      if (entregando) return;
      const clave = claveDe(bebida, formato);
      setSeleccion(previo => {
        if (filas.length === 1 && precioVisible(bebida, formato) > topeCover + adicionalManual)
          return previo;
        if (costoDe(previo) + precioVisible(bebida, formato) > presupuestoProductos) return previo;
        const siguiente = {
          ...previo,
          [clave]: {
            cantidad: (previo[clave]?.cantidad ?? 0) + 1,
            reparto: previo[clave]?.reparto ?? []
          }
        };
        return stockValidoConActual(siguiente) ? siguiente : previo;
      });
    },
    [
      adicionalManual,
      costoDe,
      entregando,
      filas.length,
      presupuestoProductos,
      setSeleccion,
      stockValidoConActual,
      topeCover
    ]
  );

  const quitar = useCallback(
    (clave: string, unidadesPorEntrega: number) => {
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
    },
    [setSeleccion]
  );

  const quitarTodas = useCallback(
    (clave: string) => {
      setSeleccion(previo => {
        if (!previo[clave]) return previo;
        const resto = { ...previo };
        delete resto[clave];
        return resto;
      });
    },
    [setSeleccion]
  );

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
        return liberaStock || stockValidoConActual(siguiente) ? siguiente : previo;
      });
    },
    [entregando, setSeleccion, stockValidoConActual]
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
      (entregaIndividual && (anfitrionasQuery.isLoading || habitacionesQuery.isLoading)) ||
      errorBebidas ||
      errorCover ||
      filas.length === 0
    )
      return;
    if (entregaIndividual && errorRelaciones) {
      toast.error('No se pudieron cargar anfitrionas o habitaciones', {
        description: errorRelaciones
      });
      return;
    }
    if (
      entregaIndividual
        ? resumenIndividual.length !== filasGrupo.length ||
          resumenIndividual.some(resumen => resumen.lineas.length === 0)
        : lineas.length === 0
    ) {
      toast.error(
        entregaIndividual
          ? 'Selecciona al menos un cover para cada entrada'
          : 'Selecciona al menos una bebida para entregar'
      );
      return;
    }
    if (
      entregaIndividual
        ? resumenIndividual.some(resumen => resumen.faltaAcompanamiento)
        : faltaAcompanamiento
    ) {
      toast.error('Selecciona el acompañamiento de cada producto que lo incluye');
      return;
    }
    if (
      (entregaIndividual
        ? resumenIndividual.some(resumen => resumen.excedePresupuesto || resumen.excedeTope)
        : excedePresupuesto || excedeTopeIndividual) ||
      excedeStock
    ) {
      toast.error(
        excedeStock
          ? 'La selección supera el stock disponible'
          : 'Sube el monto adicional o quita productos para cubrir cada entrada'
      );
      return;
    }
    const unidades = unidadesDeLineas(lineas);
    const payload: EntregaGrupalPayload | EntregaIndividualPayload = entregaIndividual
      ? {
          entregas: resumenIndividual.map(resumen => ({
            entrada_id: resumen.fila.id,
            monto_adicional: resumen.adicional,
            unidades: resumen.unidades,
            anfitriona_id: resumen.borrador.anfitrionaId || null,
            habitacion_id: resumen.borrador.habitacionId || null
          }))
        }
      : {
          entrada_ids: filas.map(fila => fila.id),
          monto_adicional: adicional,
          unidades
        };
    enviando.current = true;
    try {
      const resultado = await mutacionGrupo.mutateAsync(payload);
      if (modo === 'solicitud') {
        toast.success('Solicitud enviada al cajero', {
          description: 'La entrega quedará pendiente de autorización.'
        });
      } else {
        toast.success(`${resultado.productos} productos entregados`, {
          description: grupo.cliente || undefined
        });
      }
    } catch (error) {
      toast.error(
        modo === 'solicitud'
          ? 'No se pudo enviar la solicitud'
          : filas.length === 1
            ? 'No se pudo entregar la entrada'
            : 'No se pudo entregar el grupo',
        {
          description: error instanceof Error ? error.message : 'Intenta de nuevo.'
        }
      );
      return;
    } finally {
      enviando.current = false;
    }
    onClose();
    try {
      await onEntregado();
    } catch {
      toast.error(
        modo === 'solicitud'
          ? 'La solicitud se envió. No se pudo actualizar el listado.'
          : filas.length === 1
            ? 'La entrada se entregó. No se pudo actualizar el listado.'
            : 'El grupo se entregó. No se pudo actualizar el listado.'
      );
    }
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={open => {
        if (!open) cerrar();
      }}
    >
      <DialogContent className='flex max-h-[88dvh] flex-col overflow-hidden sm:max-w-3xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>
            {modo === 'solicitud' ? 'Solicitar entrega de covers' : 'Entregar covers'}
          </DialogTitle>
          <DialogDescription>
            {grupo
              ? `${grupo.cliente || 'Sin nombre'} · ${filas.length} ${
                  filas.length === 1 ? 'entrada' : 'entradas'
                } · ${formatCurrencyCLP(totalEntradas)} · ${grupo.hora}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div
          role='region'
          aria-label='Contenido de entrega de covers'
          tabIndex={0}
          className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
        >
          {modo === 'entrega' && filasGrupo.length > 1 ? (
            <div className='flex flex-col gap-2'>
              <p id='modalidad-entrega-label' className='text-sm font-medium'>
                Modalidad de entrega
              </p>
              <ToggleGroup
                type='single'
                value={tipoEntrega}
                onValueChange={cambiarTipoEntrega}
                variant='outline'
                size='sm'
                disabled={entregando}
                aria-labelledby='modalidad-entrega-label'
                className='w-full justify-start'
              >
                <ToggleGroupItem value='grupal' className='min-h-11 flex-1 rounded-full'>
                  Entrega grupal
                </ToggleGroupItem>
                <ToggleGroupItem value='individual' className='min-h-11 flex-1 rounded-full'>
                  Entrega individual
                </ToggleGroupItem>
              </ToggleGroup>
              {tipoEntrega === 'individual' ? (
                <div className='flex flex-col gap-2'>
                  <p id='entrada-individual-label' className='text-sm text-muted-foreground'>
                    Configura cada entrada por separado; después confirmarás todas juntas.
                  </p>
                  <div
                    role='group'
                    aria-labelledby='entrada-individual-label'
                    className='grid gap-2 sm:grid-cols-2'
                  >
                    {filasGrupo.map((fila, indice) => (
                      <Button
                        key={fila.id}
                        type='button'
                        variant={fila.id === entradaIndividualId ? 'secondary' : 'outline'}
                        aria-pressed={fila.id === entradaIndividualId}
                        aria-label={`Entrada ${indice + 1}, ${formatCurrencyCLP(fila.monto_entrada)}, ${fila.hora}`}
                        disabled={entregando}
                        onClick={() => seleccionarEntradaIndividual(fila.id)}
                        className='h-auto min-h-11 justify-between gap-3 rounded-full py-2 text-left'
                      >
                        <span className='flex min-w-0 flex-col items-start gap-1'>
                          <span>Entrada {indice + 1}</span>
                          <span className='shrink-0 tabular-nums text-xs text-muted-foreground'>
                            {formatCurrencyCLP(fila.monto_entrada)}
                          </span>
                        </span>
                        <Badge
                          variant={cantidadDeBorrador(fila.id) > 0 ? 'secondary' : 'outline'}
                          className='shrink-0 rounded-full'
                        >
                          {cantidadDeBorrador(fila.id) > 0
                            ? `${cantidadDeBorrador(fila.id)} covers`
                            : 'Pendiente'}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {entregaIndividual ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='flex flex-col gap-1.5'>
                <Label className='text-xs'>Anfitriona (opcional)</Label>
                <IndividualHostessSelect
                  anfitrionas={anfitrionas}
                  value={borradorActual.anfitrionaId}
                  onChange={anfitrionaId => actualizarBorrador({ anfitrionaId })}
                  placeholder={
                    anfitrionasQuery.isLoading ? 'Cargando anfitrionas…' : 'Sin anfitriona'
                  }
                  disabled={entregando || anfitrionasQuery.isLoading}
                  ariaLabel='Anfitriona opcional para esta entrada'
                />
                {borradorActual.anfitrionaId ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='self-start'
                    disabled={entregando}
                    onClick={() => actualizarBorrador({ anfitrionaId: '' })}
                  >
                    Quitar anfitriona
                  </Button>
                ) : null}
              </div>
              <RoomSelect
                habitaciones={habitaciones}
                value={borradorActual.habitacionId}
                onChange={habitacionId => actualizarBorrador({ habitacionId })}
                label='Habitación (opcional)'
                placeholder={
                  habitacionesQuery.isLoading ? 'Cargando habitaciones…' : 'Sin habitación'
                }
                filterByStatus={1}
                disabled={entregando || habitacionesQuery.isLoading}
              />
            </div>
          ) : null}

          {entregaIndividual && (anfitrionasQuery.error || habitacionesQuery.error) ? (
            <Alert role='alert'>
              <AlertDescription className='text-xs text-destructive'>
                {anfitrionasQuery.error?.message ?? habitacionesQuery.error?.message}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className='flex flex-col gap-1'>
            <Label htmlFor='monto-adicional-grupo' className='text-xs'>
              {entregaIndividual
                ? 'Monto adicional de esta entrada'
                : filas.length === 1
                  ? 'Monto adicional individual'
                  : 'Monto adicional del grupo'}
            </Label>
            <Input
              id='monto-adicional-grupo'
              inputMode='numeric'
              {...register('montoAdicional')}
              value={formatNumberInputOrEmpty(montoAdicional)}
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

          <Alert role='note' className='py-3'>
            <Info className='size-4' aria-hidden='true' />
            <AlertDescription className='text-xs text-muted-foreground'>
              {entregaIndividual ? (
                <>
                  Entrada actual {formatCurrencyCLP(totalEntradas)}
                  {adicional > 0 ? ` + adicional ${formatCurrencyCLP(adicional)}` : ''} =
                  presupuesto {formatCurrencyCLP(presupuesto)}. El adicional total configurado es{' '}
                  {formatCurrencyCLP(adicionalIndividual)}.
                </>
              ) : (
                <>
                  Entradas {formatCurrencyCLP(totalEntradas)}
                  {adicional > 0 ? ` + adicional ${formatCurrencyCLP(adicional)}` : ''} =
                  presupuesto {formatCurrencyCLP(presupuesto)}.{' '}
                </>
              )}{' '}
              {entregaIndividual || filas.length === 1
                ? `La entrada cubre bebidas hasta ${formatCurrencyCLP(topeCover)}; el adicional amplía ese tope.`
                : 'El grupo comparte el presupuesto de sus entradas para elegir las bebidas.'}{' '}
              El adicional se cobra completo en la barra con el método de pago de la entrada.
            </AlertDescription>
          </Alert>

          {entregaIndividual ? (
            <div className='flex flex-col gap-1 rounded-xl border border-dashed p-3 text-xs'>
              {resumenIndividual.map((resumen, indice) => (
                <p key={resumen.fila.id} className='flex flex-wrap justify-between gap-2'>
                  <span>
                    Entrada {indice + 1}:{' '}
                    {resumen.lineas.length > 0
                      ? resumen.lineas
                          .map(linea => `${linea.bebida.producto_nombre} × ${linea.cantidad}`)
                          .join(', ')
                      : 'Sin productos'}
                    {resumen.borrador.anfitrionaId ? ' · anfitriona asignada' : ''}
                    {resumen.borrador.habitacionId ? ' · habitación asignada' : ''}
                  </span>
                  <span className='font-medium tabular-nums'>
                    Adicional {formatCurrencyCLP(resumen.adicional)}
                  </span>
                </p>
              ))}
            </div>
          ) : null}

          {cargando ? (
            <div className='flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
              <LoaderCircle className='size-4 animate-spin' /> Cargando bebidas…
            </div>
          ) : errorBebidas ? (
            <p className='rounded-xl border border-dashed p-4 text-sm text-destructive'>
              {errorBebidas}
            </p>
          ) : categoriaSeleccionada === null ? (
            categoriasVisibles.length === 0 ? (
              <p className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
                No hay bebidas disponibles en el bar.
              </p>
            ) : (
              <CategoryCardList
                categorias={categoriasVisibles}
                countLabel={categoria =>
                  categoria.total_products === 1 ? 'presentación' : 'presentaciones'
                }
                paginate={false}
                onSelect={categoria => setCategoriaSeleccionada(categoria.name ?? '')}
              />
            )
          ) : (
            <section role='region' aria-label={categoriaSeleccionada} className='space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setCategoriaSeleccionada(null)}
                  className='rounded-full'
                >
                  <ChevronLeft data-icon='inline-start' />
                  Categorías
                </Button>
                <div className='min-w-0 text-right'>
                  <h3 className='truncate text-sm font-semibold'>{categoriaSeleccionada}</h3>
                  <span className='text-xs text-muted-foreground tabular-nums'>
                    {itemsCategoriaSeleccionada.length}{' '}
                    {itemsCategoriaSeleccionada.length === 1 ? 'opción' : 'opciones'}
                  </span>
                </div>
              </div>
              <Input
                value={busqueda}
                onChange={evento => setBusqueda(evento.target.value)}
                placeholder='Buscar producto…'
                aria-label='Buscar producto'
              />
              {itemsCategoriaSeleccionada.length === 0 ? (
                <p className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
                  {busqueda.trim()
                    ? 'No hay bebidas de esta categoría que coincidan con la búsqueda.'
                    : `Sin productos hasta ${formatCurrencyCLP(precioMaximo)} en esta categoría.`}
                </p>
              ) : (
                <div
                  role='group'
                  aria-label='Bebidas del bar'
                  className='grid grid-cols-2 gap-3 sm:grid-cols-3'
                >
                  {itemsCategoriaSeleccionada.map(({ bebida, formato }) => {
                    const clave = claveDe(bebida, formato);
                    const cantidad = seleccion[clave]?.cantidad ?? 0;
                    const sinStock =
                      (consumo.get(bebida.presentacion_id) ?? 0) +
                        consumoProducto(bebida, formato) >
                      bebida.stock_bar + 1e-9;
                    const precio = precioVisible(bebida, formato);
                    const excede = precioSeleccionado + precio > presupuestoProductos;
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
              )}
            </section>
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
                {entregaIndividual
                  ? `${totalSeleccionado} productos para esta entrada. El stock se valida en todo el grupo.`
                  : `${totalSeleccionado} productos para ${filas.length} ${filas.length === 1 ? 'entrada' : 'entradas'}. El grupo comparte todo el presupuesto.`}
              </p>
              <div className='rounded-xl border border-dashed p-3 text-xs'>
                <p className='flex flex-wrap justify-between gap-2 text-muted-foreground'>
                  <span>Productos</span>
                  <span className='font-medium text-foreground tabular-nums'>
                    {formatCurrencyCLP(precioSeleccionado)} de{' '}
                    {formatCurrencyCLP(presupuestoProductos)}
                  </span>
                </p>
                {recargoAcompanamientos > 0 ? (
                  <p className='mt-1 flex flex-wrap justify-between gap-2 text-muted-foreground'>
                    <span>Acompañamientos sobre el tope</span>
                    <span className='font-medium text-foreground tabular-nums'>
                      {formatCurrencyCLP(recargoAcompanamientos)}
                    </span>
                  </p>
                ) : null}
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
                    Faltan {formatCurrencyCLP(precioSeleccionado - presupuestoProductos)} de
                    presupuesto para esta selección.
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
        </div>

        <DialogFooter className='shrink-0 gap-2'>
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
              (entregaIndividual
                ? cargandoRelaciones || Boolean(errorRelaciones) || !individualCompleto
                : lineas.length === 0 ||
                  faltaAcompanamiento ||
                  excedePresupuesto ||
                  excedeTopeIndividual) ||
              excedeStock ||
              Boolean(errorCover) ||
              filas.length === 0
            }
            onClick={() => void entregar()}
          >
            {entregando ? <LoaderCircle className='mr-2 size-4 animate-spin' /> : null}
            {modo === 'solicitud'
              ? totalSeleccionado > 0
                ? `Solicitar ${totalSeleccionado} covers`
                : 'Solicitar covers'
              : entregaIndividual
                ? `Entregar ${productosIndividuales} covers (${resumenIndividual.length} entradas)`
                : totalSeleccionado > 0
                  ? `Entregar ${totalSeleccionado} en la barra`
                  : 'Entregar en la barra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
