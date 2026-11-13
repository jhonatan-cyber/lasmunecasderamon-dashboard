'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SaleOptionsSchema } from '@/lib/business/schemas/sale-options';
import { Save, Users, RotateCcw, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from '@/components/ui/command';
import { cn } from '@/lib/utils/utils';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { esBebidaAnalcoholica, esCigarrillos } from '@/components/bar/transfer/transferOptions';
import {
  useSettingsProducts,
  invalidateSettingsProducts
} from '@/hooks/settings/useSettingsProducts';
import { SettingsChampagneTiers, type SettingsTiersHandle } from './SettingsChampagneTiers';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import {
  SettingsSaleOptionsEditor,
  type SettingsSaleOptionsHandle
} from './SettingsSaleOptionsEditor';
import type { SaleOption } from '@/types/sale-options';
import { Label } from '@/components/ui/label';

type PresentacionComisiones = {
  codigo_barras?: string | null;
  id: string;
  producto_id: string;
  nombre: string;
  foto: string | null;
  precio_venta: number;
  comision: number;
  opciones_venta: SaleOption[];
  ml_shot?: number | null;
  ml_shot_anfitriona?: number | null;
};

const MIN_ANFITRIONAS = 1;
// Mismo tope que la transferencia y que la API de tramos (1..20).
const MAX_ANFITRIONAS = 20;

const formatMiles = (v: string | number) =>
  String(v ?? '')
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const bottleFieldsSchema = z.object({
  maximo: z.string().refine(value => {
    if (value.trim() === '') return true;
    const n = Number(value);
    return Number.isInteger(n) && n >= MIN_ANFITRIONAS && n <= MAX_ANFITRIONAS;
  }, `El máximo debe ser un número entero entre ${MIN_ANFITRIONAS} y ${MAX_ANFITRIONAS}`),
  precio: z.string(),
  comision: z.string()
});

const presentacionSchema = z.object({
  id: z.string(),
  producto_id: z.string(),
  nombre: z.string().default(''),
  codigo_barras: z.string().nullish(),
  foto: z.string().nullable().default(null),
  precio_venta: z.coerce.number().default(0),
  comision: z.coerce.number().default(0),
  ml_shot: z.coerce.number().nullish(),
  ml_shot_anfitriona: z.coerce.number().nullish(),
  opciones_venta: z.preprocess(
    value => {
      if (typeof value !== 'string') return value ?? [];
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return value;
      }
    },
    SaleOptionsSchema.or(z.tuple([]))
  )
});

async function cargarPresentaciones(signal: AbortSignal): Promise<PresentacionComisiones[]> {
  const res = await fetch('/api/bar', { cache: 'no-store', signal });
  const parsed = z
    .object({ success: z.literal(true), data: z.array(presentacionSchema) })
    .safeParse(await res.json());
  if (!res.ok || !parsed.success) throw new Error('Error al cargar las presentaciones');
  return parsed.data.data;
}

async function guardarConfiguracion(url: string, method: 'PUT' | 'PATCH', body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const parsed = z
    .object({ success: z.boolean(), message: z.string().optional() })
    .safeParse(await res.json().catch(() => null));
  if (!res.ok || !parsed.success || !parsed.data.success)
    throw new Error(
      parsed.success ? parsed.data.message || 'Error al guardar' : 'Respuesta inválida al guardar'
    );
}

type SaveConfiguration = {
  presentacionId: string;
  productoId: string;
  maximo: number | null;
  guardarProducto: boolean;
  config: ReturnType<SettingsSaleOptionsHandle['getConfig']>;
  tiers?: ReturnType<SettingsTiersHandle['getTiers']>;
};

function ProductSelectorPhoto({ foto }: { foto?: string | null }) {
  const src =
    !foto || foto === 'default.png'
      ? '/api/images/products/default.png'
      : /^(https?:\/\/|\/)/.test(foto)
        ? foto
        : `/api/images/products/${foto}`;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <ProductPhoto
      key={src}
      src={failed ? '/api/images/products/default.png' : src}
      alt=''
      width={36}
      height={36}
      className='h-9 w-9 shrink-0 rounded-md object-contain'
      onError={() => setFailed(true)}
    />
  );
}

export function SettingsBottleHostessCard() {
  const { productos: allProductos, loading, error: productsError, refresh } = useSettingsProducts();
  const [selectedId, setSelectedId] = useState<string>('');
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const saleOptionsRef = useRef<SettingsSaleOptionsHandle>(null);
  const tiersRef = useRef<SettingsTiersHandle>(null);
  const barQuery = useQuery({
    queryKey: ['settings', 'bar', 'presentations'],
    queryFn: ({ signal }) => cargarPresentaciones(signal),
    retry: false,
    refetchOnWindowFocus: false
  });
  const presentaciones = barQuery.data ?? null;
  const barError = barQuery.isError;

  const refrescarPersistidos = async () => {
    invalidateSettingsProducts();
    const [bar] = await Promise.all([barQuery.refetch(), refresh()]);
    return !bar.isError;
  };
  const saveMutation = useMutation({
    mutationFn: async ({
      presentacionId,
      productoId,
      maximo,
      guardarProducto,
      config,
      tiers
    }: SaveConfiguration) => {
      let etapa = 'No se pudo guardar la presentación';
      try {
        const principal =
          config.opciones_venta.find(o => o.tipo === 'botella') ?? config.opciones_venta[0];
        await guardarConfiguracion('/api/products/presentations', 'PATCH', {
          id: presentacionId,
          precio_venta: principal?.precio ?? 0,
          comision: principal?.comision ?? 0,
          opciones_venta: config.opciones_venta
        });
        etapa = 'Presentación guardada; no se pudo guardar la tabla por anfitrionas';
        if (tiers)
          await guardarConfiguracion(`/api/products/${productoId}/tiers`, 'PUT', { tiers });
        etapa = `${tiers ? 'Presentación y tabla guardadas' : 'Presentación guardada'}; no se pudo guardar el máximo de anfitrionas y los ml por corto`;
        if (guardarProducto) {
          await guardarConfiguracion(`/api/products/${productoId}`, 'PUT', {
            max_anfitrionas: maximo,
            ml_shot: config.ml_shot,
            ml_shot_anfitriona: config.ml_shot_anfitriona
          });
        }
      } catch (error) {
        throw new Error(
          `${etapa}: ${error instanceof Error ? error.message : 'Error al guardar'}`,
          { cause: error }
        );
      }
    },
    onSuccess: async () => {
      const actualizado = await refrescarPersistidos();
      if (actualizado) toast.success('Presentación actualizada');
      else
        toast.error(
          'Presentación guardada; no se pudieron recargar los datos. Reintenta la carga.'
        );
    },
    onError: async error => {
      logger.captureException(error, { context: 'SettingsBottleHostessCard:save' });
      const actualizado = await refrescarPersistidos();
      toast.error(
        `${error.message}${actualizado ? '' : '. No se pudieron recargar los datos; se conserva la última configuración cargada.'}`
      );
    }
  });
  const defaultMutation = useMutation({
    mutationFn: ({ productoId, valor }: { productoId: string; valor: number | null }) =>
      guardarConfiguracion(`/api/products/${productoId}`, 'PUT', { max_anfitrionas: valor }),
    onSuccess: async () => {
      await refrescarPersistidos();
      toast.success('Producto vuelve a la regla por defecto');
    },
    onError: async error => {
      logger.captureException(error, { context: 'SettingsBottleHostessCard:save' });
      await refrescarPersistidos();
      toast.error(error.message);
    }
  });
  const saving = saveMutation.isPending || defaultMutation.isPending;

  const productos = useMemo(
    () =>
      (presentaciones ?? [])
        .flatMap(presentacion => {
          const producto = allProductos.find(p => String(p.id) === presentacion.producto_id);
          if (!producto) return [];
          const botella = presentacion.opciones_venta.find(o => o.tipo === 'botella');
          return [
            {
              ...producto,
              id: presentacion.id,
              producto_id: presentacion.producto_id,
              presentacion: presentacion.nombre,
              codigo_barras: presentacion.codigo_barras,
              foto: presentacion.foto || producto.foto,
              opciones_venta: presentacion.opciones_venta,
              ml_shot: presentacion.ml_shot,
              ml_shot_anfitriona: presentacion.ml_shot_anfitriona,
              price: botella?.precio ?? presentacion.precio_venta,
              commission: botella?.comision ?? presentacion.comision
            }
          ];
        })
        .sort((a, b) =>
          `${a.categoria} ${a.name} ${a.presentacion}`.localeCompare(
            `${b.categoria} ${b.name} ${b.presentacion}`,
            'es'
          )
        ),
    [allProductos, presentaciones]
  );

  const SIN_CATEGORIA = 'Sin categoría';
  const productosAgrupados = useMemo(() => {
    const map = new Map<string, typeof productos>();
    for (const p of productos) {
      const key = p.categoria?.trim() || SIN_CATEGORIA;
      const list = map.get(key);
      if (list) list.push(p);
      else map.set(key, [p]);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === SIN_CATEGORIA) return 1;
      if (b[0] === SIN_CATEGORIA) return -1;
      return a[0].localeCompare(b[0], 'es');
    });
  }, [productos]);

  useEffect(() => {
    // Selección válida: se conserva (no pisa lo que el usuario escribe).
    // Vacía o fuera de la lista (ej. filtro del bar que llegó después):
    // se elige el primero.
    if (productos.length === 0) {
      if (selectedId !== '') {
        setSelectedId('');
      }
      return;
    }
    if (!productos.some(p => String(p.id) === selectedId)) {
      setSelectedId(String(productos[0].id));
    }
  }, [productos, selectedId]);

  const seleccionado = productos.find(p => String(p.id) === selectedId);
  const etiquetaProducto = (p: (typeof productos)[number]) =>
    [p.categoria, p.name, p.presentacion, formatCurrencyCLP(Number(p.price ?? 0))]
      .filter(Boolean)
      .join(' ');
  // Analcohólicas y cigarrillos: sin anfitrionas ni cortos en settings.
  const esVentaSimple =
    esCigarrillos(seleccionado?.categoria) || esBebidaAnalcoholica(seleccionado?.categoria);
  const vigente =
    seleccionado?.max_anfitrionas !== null &&
    seleccionado?.max_anfitrionas !== undefined &&
    Number(seleccionado.max_anfitrionas) > 0
      ? Number(seleccionado.max_anfitrionas)
      : null;
  const formValues = useMemo(
    () => ({
      maximo: vigente !== null && Number.isFinite(vigente) ? String(vigente) : '',
      precio: formatMiles(seleccionado?.price ?? 0),
      comision: formatMiles(seleccionado?.commission ?? 0)
    }),
    [vigente, seleccionado?.price, seleccionado?.commission]
  );
  const { watch, setValue, reset, handleSubmit } = useForm<z.infer<typeof bottleFieldsSchema>>({
    resolver: zodResolver(bottleFieldsSchema),
    values: formValues
  });
  const { maximo, precio, comision } = watch();

  const handleSelectChange = (id: string) => {
    setSelectedId(id);
    const producto = productos.find(p => String(p.id) === id);
    reset({
      maximo: Number(producto?.max_anfitrionas) > 0 ? String(producto?.max_anfitrionas) : '',
      precio: formatMiles(producto?.price ?? 0),
      comision: formatMiles(producto?.commission ?? 0)
    });
  };

  const guardarMaximo = async (valor: number | null) => {
    if (!seleccionado) return;
    if (
      valor !== null &&
      (!Number.isInteger(valor) || valor < MIN_ANFITRIONAS || valor > MAX_ANFITRIONAS)
    ) {
      toast.error(`Debe ser un número entero entre ${MIN_ANFITRIONAS} y ${MAX_ANFITRIONAS}`);
      return;
    }
    if (saving) return;
    defaultMutation.mutate({ productoId: seleccionado.producto_id, valor });
  };

  const handleSave = handleSubmit(
    ({ maximo }) => {
      if (!seleccionado || saving || barQuery.isFetching || barError) return;
      const maximoValor = maximo.trim() === '' ? null : Number(maximo);
      try {
        const config = saleOptionsRef.current?.getConfig();
        if (!config) throw new Error('Espera a que se cargue la configuración');
        const tiers =
          !esVentaSimple && maximoValor !== null && maximoValor >= 2
            ? tiersRef.current?.getTiers()
            : undefined;
        if (!esVentaSimple && maximoValor !== null && maximoValor >= 2 && !tiers)
          throw new Error('Esperá a que se cargue la tabla de precios');
        saveMutation.mutate({
          presentacionId: selectedId,
          productoId: seleccionado.producto_id,
          maximo: maximoValor,
          config,
          tiers,
          guardarProducto:
            maximoValor !== vigente ||
            (config.ml_shot !== undefined &&
              (config.ml_shot !== (seleccionado.ml_shot ?? null) ||
                config.ml_shot_anfitriona !== (seleccionado.ml_shot_anfitriona ?? null)))
        });
      } catch (error) {
        logger.captureException(error, { context: 'SettingsBottleHostessCard:save' });
        toast.error(error instanceof Error ? error.message : 'Error al guardar');
      }
    },
    errors => toast.error(errors.maximo?.message || 'Configuración inválida')
  );

  return (
    <CollapsibleCard
      defaultOpen
      aria-label='Precios y comisiones por producto'
      className='rounded-2xl border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
      title={
        <div className='flex items-center gap-3'>
          <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 dark:from-indigo-950 dark:to-sky-950 dark:text-sky-300'>
            <Users className='h-5 w-5' aria-hidden='true' />
          </span>
          <span className='min-w-0'>
            <span className='block text-base font-semibold leading-tight text-neutral-900 dark:text-neutral-100'>
              Precios y comisiones por producto
            </span>
            <span className='mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400'>
              Configura precios y usos para cada presentación del bar.
            </span>
          </span>
        </div>
      }
      headerClassName='gap-3 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/70 p-4 sm:px-5 sm:py-4 dark:border-neutral-800 dark:from-indigo-950/30 dark:via-neutral-900 dark:to-sky-950/20'
      contentClassName='space-y-5 px-4 pb-4 sm:px-5 sm:pb-5'
    >
      {productsError && (
        <ErrorState className='mb-4' message={productsError} onRetry={() => void refresh()} />
      )}
      {barError && presentaciones !== null && (
        <ErrorState
          message='No se pudo actualizar el bar. Se conserva la última configuración cargada.'
          onRetry={() => void barQuery.refetch()}
        />
      )}
      {(loading && allProductos.length === 0) || (presentaciones === null && !barError) ? (
        <div className='text-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-500 mx-auto' />
          <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-2'>
            Cargando productos...
          </p>
        </div>
      ) : barError && presentaciones === null ? (
        <div className='text-center py-8 space-y-3'>
          <p className='text-sm text-neutral-500 dark:text-neutral-400'>
            No se pudo cargar el bar. Revisá la conexión e intentá de nuevo.
          </p>
          <Button
            variant='unstyled'
            type='button'
            onClick={() => void barQuery.refetch()}
            disabled={barQuery.isFetching}
            className='px-6 py-2 rounded-full font-bold border-2 border-neutral-300 dark:border-neutral-700 hover:scale-105 active:scale-95 transition-all text-sm'
          >
            Reintentar
          </Button>
        </div>
      ) : productos.length === 0 ? (
        <p className='text-center py-8 text-neutral-400 text-sm'>
          No hay presentaciones del bar para configurar.
        </p>
      ) : (
        <div className='space-y-5'>
          <div className='space-y-2 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-950/40'>
            <Label
              htmlFor='botella-producto'
              className='block text-xs font-semibold text-neutral-600 dark:text-neutral-400'
            >
              Elige un producto y presentación
            </Label>
            <Popover open={productSelectorOpen} onOpenChange={setProductSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  id='botella-producto'
                  type='button'
                  variant='outline'
                  role='combobox'
                  aria-expanded={productSelectorOpen}
                  aria-controls='botella-productos-lista'
                  disabled={saving}
                  className='h-auto min-h-12 w-full justify-between rounded-xl bg-white text-left shadow-sm dark:bg-neutral-900'
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    {seleccionado && <ProductSelectorPhoto foto={seleccionado.foto} />}
                    <span className='truncate'>
                      {seleccionado ? etiquetaProducto(seleccionado) : 'Seleccionar producto'}
                    </span>
                  </span>
                  <ChevronsUpDown className='opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent align='start' className='w-[var(--radix-popover-trigger-width)] p-0'>
                <Command>
                  <CommandInput
                    id='botella-producto-busqueda'
                    placeholder='Buscar producto, categoría o presentación...'
                    aria-label='Buscar producto, categoría o presentación'
                    className='border-0 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                  />
                  <CommandList id='botella-productos-lista'>
                    <CommandEmpty>No se encontraron productos.</CommandEmpty>
                    {productosAgrupados.map(([categoria, items]) => (
                      <CommandGroup key={categoria} heading={categoria}>
                        {items.map(p => (
                          <CommandItem
                            key={p.id}
                            value={String(p.id)}
                            keywords={[String(p.name), String(p.categoria ?? ''), p.presentacion]}
                            onSelect={() => {
                              if (String(p.id) !== selectedId) handleSelectChange(String(p.id));
                              setProductSelectorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                selectedId === String(p.id) ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <ProductSelectorPhoto foto={p.foto} />
                            <span className='min-w-0 break-words'>{etiquetaProducto(p)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {seleccionado && (
            <SettingsSaleOptionsEditor
              key={selectedId}
              ref={saleOptionsRef}
              options={seleccionado.opciones_venta}
              categoria={seleccionado.categoria}
              precio={precio}
              comision={comision}
              mlCliente={seleccionado.ml_shot}
              mlAnfitriona={seleccionado.ml_shot_anfitriona}
              onPrecio={value => setValue('precio', value, { shouldDirty: true })}
              onComision={value => setValue('comision', value, { shouldDirty: true })}
              saving={saving}
              maxAnfitrionas={maximo}
              onMaxAnfitrionasChange={value =>
                setValue('maximo', value.replace(/\D/g, '').slice(0, 2), { shouldDirty: true })
              }
            />
          )}

          {seleccionado &&
            !esVentaSimple &&
            Number(maximo) >= 2 &&
            Number(maximo) <= MAX_ANFITRIONAS && (
              <SettingsChampagneTiers
                key={`${selectedId}:${barQuery.dataUpdatedAt}`}
                ref={tiersRef}
                disabled={saving}
                productId={seleccionado.producto_id}
                maxAnfitrionas={Number(maximo)}
                precioBase={Number(precio.replace(/\./g, '')) || 0}
                comisionBase={Number(comision.replace(/\./g, '')) || 0}
              />
            )}

          <div className='flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end dark:border-neutral-800'>
            {vigente !== null && !esVentaSimple && (
              <Button
                variant='unstyled'
                type='button'
                onClick={() => guardarMaximo(null)}
                disabled={saving}
                className='inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
              >
                <RotateCcw className='h-4 w-4' />
                Volver al default
              </Button>
            )}
            <Button
              variant='unstyled'
              type='button'
              onClick={handleSave}
              disabled={saving || loading || barQuery.isFetching || barError}
              className='inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-400 dark:text-neutral-950 dark:hover:bg-indigo-300'
            >
              <Save className='h-4 w-4' />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}
