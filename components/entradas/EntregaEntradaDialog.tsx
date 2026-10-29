'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
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
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { productImageUrl } from '@/lib/utils/productImage';
import { cn } from '@/lib/utils/utils';

type JsonRecord = Record<string, unknown>;

type OpcionVenta = { tipo: string; acompanamiento?: { unidades: number } };

type Bebida = {
  presentacion_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  precio_venta: number;
  stock_bar: number;
  foto: string | null;
  opciones_venta: OpcionVenta[];
};

type Acompanamiento = {
  id: string;
  producto_nombre: string;
  nombre: string;
  stock_bar: number;
};

export type EntradaEntregable = {
  id: string;
  cliente_nombre: string | null;
  monto_entrada: number;
  hora: string;
};

type Props = {
  entrada: EntradaEntregable | null;
  onClose: () => void;
  onEntregada?: () => void | Promise<void>;
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
    producto_nombre: texto(valor.producto_nombre),
    presentacion_nombre: texto(valor.presentacion_nombre),
    precio_venta: numero(valor.precio_venta),
    stock_bar: numero(valor.stock_bar),
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

function unidadesAcompanamiento(bebida: Bebida | null | undefined): number {
  const botella = bebida?.opciones_venta.find(opcion => opcion.tipo === 'botella');
  const unidades = Number(botella?.acompanamiento?.unidades ?? 0);
  return Number.isFinite(unidades) && unidades > 0 ? Math.floor(unidades) : 0;
}

function previsionDeCobro(
  precio: number,
  umbral: number,
  montoEntrada: number
): { etiqueta: string; esCortesia: boolean; montoAdicional: number } {
  if (precio <= umbral) return { etiqueta: 'Cortesía', esCortesia: true, montoAdicional: 0 };
  const montoAdicional = Math.max(0, precio - montoEntrada);
  return {
    etiqueta: `Cobra ${formatCurrencyCLP(montoAdicional)}`,
    esCortesia: false,
    montoAdicional
  };
}

export function EntregaEntradaDialog({ entrada, onClose, onEntregada }: Props) {
  const [presentacionId, setPresentacionId] = useState('');
  const [acompanamientoId, setAcompanamientoId] = useState('');
  const [productos, setProductos] = useState<Bebida[]>([]);
  const [productosLoading, setProductosLoading] = useState(false);
  const [productosError, setProductosError] = useState<string | null>(null);
  const [acompanamientos, setAcompanamientos] = useState<Acompanamiento[]>([]);
  const [acompanamientosLoading, setAcompanamientosLoading] = useState(false);
  const [acompanamientosError, setAcompanamientosError] = useState<string | null>(null);
  const [entregando, setEntregando] = useState(false);
  const [montoAdicional, setMontoAdicional] = useState('');

  const topeCortesia = Number(
    useConfigValue('comisiones', 'monto_base_trago_cortesia_cliente', 10000)
  );

  const dialogoAbierto = entrada !== null;

  useEffect(() => {
    if (!dialogoAbierto) return;
    setPresentacionId('');
    setAcompanamientoId('');
  }, [dialogoAbierto, entrada?.id]);

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

  const bebidaSeleccionada = useMemo(
    () => productos.find(bebida => bebida.presentacion_id === presentacionId),
    [productos, presentacionId]
  );
  const unidadesRequeridas = unidadesAcompanamiento(bebidaSeleccionada);
  const requiereAcompanamiento = unidadesRequeridas > 0;
  const umbral = Math.max(topeCortesia, entrada?.monto_entrada ?? 0);

  const previsionSeleccion = useMemo(
    () =>
      previsionDeCobro(bebidaSeleccionada?.precio_venta ?? 0, umbral, entrada?.monto_entrada ?? 0),
    [bebidaSeleccionada, umbral, entrada?.monto_entrada]
  );
  const montoAdicionalNumero = useMemo(() => {
    const limpio = montoAdicional.replace(/[^\d]/g, '');
    if (!limpio) return previsionSeleccion.montoAdicional;
    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : previsionSeleccion.montoAdicional;
  }, [montoAdicional, previsionSeleccion.montoAdicional]);

  useEffect(() => {
    setMontoAdicional(bebidaSeleccionada ? String(previsionSeleccion.montoAdicional) : '');
  }, [bebidaSeleccionada, previsionSeleccion.montoAdicional]);

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
          lista.map(aAcompanamiento).filter((fila): fila is Acompanamiento => fila !== null)
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

  const cerrar = useCallback(() => {
    if (entregando) return;
    onClose();
  }, [entregando, onClose]);

  const entregar = useCallback(async () => {
    if (!entrada) return;
    if (!bebidaSeleccionada) return toast.error('Selecciona la bebida que se entrega');
    if (requiereAcompanamiento && !acompanamientoId)
      return toast.error('Selecciona el acompañamiento incluido en esta bebida');
    setEntregando(true);
    try {
      const respuesta = await fetch(`/api/tickets/${encodeURIComponent(entrada.id)}/entregar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentacion_id: bebidaSeleccionada.presentacion_id,
          acompanamiento_presentacion_id: requiereAcompanamiento ? acompanamientoId : null,
          monto_adicional: montoAdicionalNumero
        })
      });
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
      await onEntregada?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo entregar la bebida');
    } finally {
      setEntregando(false);
    }
  }, [
    acompanamientoId,
    bebidaSeleccionada,
    entrada,
    montoAdicionalNumero,
    onClose,
    onEntregada,
    requiereAcompanamiento
  ]);

  return (
    <Dialog
      open={dialogoAbierto}
      onOpenChange={open => {
        if (!open) cerrar();
      }}
    >
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Entregar bebida de la entrada</DialogTitle>
          <DialogDescription>
            {entrada
              ? `${entrada.cliente_nombre || 'Sin nombre'} · entrada de ${formatCurrencyCLP(
                  entrada.monto_entrada
                )} · ${entrada.hora}`
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
                entrada?.monto_entrada ?? 0
              );
              const nombreBebida = `${bebida.producto_nombre} ${bebida.presentacion_nombre}`.trim();
              return (
                <Button
                  key={bebida.presentacion_id}
                  type='button'
                  variant='unstyled'
                  disabled={sinStock}
                  aria-pressed={seleccionada}
                  onClick={() => {
                    setPresentacionId(bebida.presentacion_id);
                    setAcompanamientoId('');
                  }}
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
          El precio ya está configurado en el catálogo. Al confirmar, el servidor registra la bebida
          como cortesía o cobra el adicional en la barra.
        </p>

        {requiereAcompanamiento && bebidaSeleccionada ? (
          <div className='space-y-2'>
            <Label htmlFor='entrega-entrada-acompanamiento'>Acompañamiento</Label>
            <SearchableSelect
              id='entrega-entrada-acompanamiento'
              value={acompanamientoId}
              onChange={setAcompanamientoId}
              placeholder={
                acompanamientosLoading ? 'Cargando acompañamientos…' : 'Seleccionar acompañamiento'
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
              Incluye {unidadesRequeridas} bebida{unidadesRequeridas === 1 ? '' : 's'} por botella.
            </p>
            {acompanamientosError ? (
              <p className='text-xs text-destructive' role='alert'>
                {acompanamientosError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className='space-y-2'>
          <Label htmlFor='entrega-entrada-adicional'>Adicional a cobrar en barra</Label>
          <Input
            id='entrega-entrada-adicional'
            inputMode='numeric'
            autoComplete='off'
            value={montoAdicional}
            disabled={!bebidaSeleccionada || entregando}
            onChange={evento => setMontoAdicional(evento.target.value.replace(/[^\d]/g, ''))}
            placeholder={bebidaSeleccionada ? '0' : 'Elige una bebida'}
          />
          <p className='text-xs text-muted-foreground'>
            {bebidaSeleccionada
              ? `Sugerido ${formatCurrencyCLP(
                  previsionSeleccion.montoAdicional
                )} (precio ${formatCurrencyCLP(
                  bebidaSeleccionada.precio_venta
                )} − entrada ${formatCurrencyCLP(
                  entrada?.monto_entrada ?? 0
                )}). Súbelo si el cliente agrega plata para otra bebida.`
              : 'Elige una bebida para calcular el monto sugerido.'}
          </p>
          {bebidaSeleccionada ? (
            <p className='text-sm font-medium'>
              Se cobrará en barra: {formatCurrencyCLP(montoAdicionalNumero)}
            </p>
          ) : null}
        </div>

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
  );
}
