'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { useState, useEffect, useMemo, useRef } from 'react';
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
const toNumber = (v: string) => Number(String(v).replace(/\./g, '')) || 0;

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
  // Lo que el usuario editó; null = sin editar, se muestra el valor vigente.
  const [maximoEdit, setMaximoEdit] = useState<string | null>(null);
  const [precioEdit, setPrecioEdit] = useState<string | null>(null);
  const [comisionEdit, setComisionEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saleOptionsRef = useRef<SettingsSaleOptionsHandle>(null);
  const tiersRef = useRef<SettingsTiersHandle>(null);
  // Presentaciones del bar, incluidas las que solo se venden por corto.
  const [presentaciones, setPresentaciones] = useState<PresentacionComisiones[] | null>(null);
  const [barError, setBarError] = useState(false);
  const [barNonce, setBarNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBarError(false);
    fetch('/api/bar', { cache: 'no-store' })
      .then(async res => {
        const result = await res.json();
        if (!res.ok || !result.success || !Array.isArray(result.data))
          throw new Error('Error al cargar las presentaciones');
        return result;
      })
      .then(result => {
        if (cancelled) return;
        const rows = result.success && Array.isArray(result.data) ? result.data : [];
        const disponibles: PresentacionComisiones[] = [];
        for (const row of rows) {
          const pid = String(row?.producto_id ?? '');
          if (!pid) continue;
          let opciones: any[] = [];
          if (Array.isArray(row?.opciones_venta)) opciones = row.opciones_venta;
          else if (typeof row?.opciones_venta === 'string') {
            try {
              const parsed = JSON.parse(row.opciones_venta);
              if (Array.isArray(parsed)) opciones = parsed;
            } catch {
              opciones = [];
            }
          }
          // Incluye también las presentaciones que solo ofrecen cortos.
          {
            disponibles.push({
              id: String(row.id),
              producto_id: pid,
              nombre: String(row.nombre ?? ''),
              codigo_barras: row.codigo_barras ? String(row.codigo_barras) : null,
              foto: row.foto ? String(row.foto) : null,
              precio_venta: Number(row.precio_venta ?? 0),
              comision: Number(row.comision ?? 0),
              ml_shot: row.ml_shot,
              ml_shot_anfitriona: row.ml_shot_anfitriona,
              opciones_venta: opciones
            });
          }
        }
        setPresentaciones(disponibles);
      })
      .catch(() => {
        if (!cancelled) setBarError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [barNonce]);

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

  useEffect(() => {
    // Selección válida: se conserva (no pisa lo que el usuario escribe).
    // Vacía o fuera de la lista (ej. filtro del bar que llegó después):
    // se elige el primero.
    if (productos.length === 0) {
      if (selectedId !== '') {
        setSelectedId('');
        setMaximoEdit(null);
        setPrecioEdit(null);
        setComisionEdit(null);
      }
      return;
    }
    if (!productos.some(p => String(p.id) === selectedId)) {
      setSelectedId(String(productos[0].id));
      setMaximoEdit(null);
      setPrecioEdit(null);
      setComisionEdit(null);
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
  const maximo =
    maximoEdit ?? (vigente !== null && Number.isFinite(vigente) ? String(vigente) : '');
  const precioVigente = seleccionado ? Math.max(0, Math.floor(Number(seleccionado.price ?? 0))) : 0;
  const comisionVigente = seleccionado
    ? Math.max(0, Math.floor(Number(seleccionado.commission ?? 0)))
    : 0;
  const precio = precioEdit ?? formatMiles(precioVigente);
  const comision = comisionEdit ?? formatMiles(comisionVigente);

  const handleSelectChange = (id: string) => {
    setSelectedId(id);
    setMaximoEdit(null);
    setPrecioEdit(null);
    setComisionEdit(null);
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
    try {
      setSaving(true);
      const res = await fetch(`/api/products/${seleccionado.producto_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_anfitrionas: valor })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) throw new Error(result.message || 'Error al guardar');
      invalidateSettingsProducts();
      await refresh();
      setMaximoEdit(null);
      toast.success('Producto vuelve a la regla por defecto');
    } catch (error) {
      logger.captureException(error, { context: 'SettingsBottleHostessCard:save' });
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!seleccionado) return;
    const textoMax = maximo.trim();
    const maximoValor = textoMax === '' ? null : Number(textoMax);
    if (
      maximoValor !== null &&
      (!Number.isInteger(maximoValor) ||
        maximoValor < MIN_ANFITRIONAS ||
        maximoValor > MAX_ANFITRIONAS)
    ) {
      toast.error(
        `El máximo debe ser un número entero entre ${MIN_ANFITRIONAS} y ${MAX_ANFITRIONAS}`
      );
      return;
    }
    const precioValor = toNumber(precio);
    const comisionValor = toNumber(comision);
    if (precioValor < 0 || precioValor > 2147483647) {
      toast.error('Precio inválido');
      return;
    }
    if (comisionValor < 0 || comisionValor > 2147483647) {
      toast.error('Comisión inválida');
      return;
    }
    try {
      const config = saleOptionsRef.current?.getConfig();
      if (!config) throw new Error('Espera a que se cargue la configuración');
      setSaving(true);
      const tiers =
        maximoValor !== null && maximoValor >= 2 ? tiersRef.current?.getTiers() : undefined;
      if (maximoValor !== null && maximoValor >= 2 && !tiers)
        throw new Error('Esperá a que se cargue la tabla de precios');
      const res = await fetch('/api/products/presentations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId,
          precio_venta: precioValor,
          comision: config.opciones_venta.find(o => o.tipo === 'botella')?.comision ?? 0,
          opciones_venta: config.opciones_venta
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) throw new Error(result.message || 'Error al guardar');
      if (tiers) {
        const tiersRes = await fetch(`/api/products/${seleccionado.producto_id}/tiers`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tiers })
        });
        const tiersResult = await tiersRes.json();
        if (!tiersRes.ok || !tiersResult.success)
          throw new Error(
            'Precio y comisión guardados; no se pudo guardar la tabla por anfitrionas'
          );
      }
      if (
        maximoValor !== vigente ||
        (config.ml_shot !== undefined &&
          (config.ml_shot !== (seleccionado.ml_shot ?? null) ||
            config.ml_shot_anfitriona !== (seleccionado.ml_shot_anfitriona ?? null)))
      ) {
        const maxRes = await fetch(`/api/products/${seleccionado.producto_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            max_anfitrionas: maximoValor,
            ml_shot: config.ml_shot,
            ml_shot_anfitriona: config.ml_shot_anfitriona
          })
        });
        const maxResult = await maxRes.json();
        if (!maxRes.ok || !maxResult.success) {
          setBarNonce(n => n + 1);
          throw new Error(
            'Precio y comisión guardados; no se pudo guardar el máximo de anfitrionas'
          );
        }
      }
      invalidateSettingsProducts();
      await refresh();
      setBarNonce(n => n + 1);
      setMaximoEdit(null);
      setPrecioEdit(null);
      setComisionEdit(null);
      toast.success('Presentación actualizada');
    } catch (error) {
      logger.captureException(error, { context: 'SettingsBottleHostessCard:save' });
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

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
      {loading || (presentaciones === null && !barError) ? (
        <div className='text-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-500 mx-auto' />
          <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-2'>
            Cargando productos...
          </p>
        </div>
      ) : barError ? (
        <div className='text-center py-8 space-y-3'>
          <p className='text-sm text-neutral-500 dark:text-neutral-400'>
            No se pudo cargar el bar. Revisá la conexión e intentá de nuevo.
          </p>
          <Button
            variant='unstyled'
            type='button'
            onClick={() => setBarNonce(n => n + 1)}
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
                    <CommandGroup>
                      {productos.map(p => (
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
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {seleccionado && (
            <SettingsSaleOptionsEditor
              key={`${selectedId}:${barNonce}`}
              ref={saleOptionsRef}
              options={seleccionado.opciones_venta}
              categoria={seleccionado.categoria}
              precio={precio}
              comision={comision}
              mlCliente={seleccionado.ml_shot}
              mlAnfitriona={seleccionado.ml_shot_anfitriona}
              onPrecio={setPrecioEdit}
              onComision={setComisionEdit}
              saving={saving}
              maxAnfitrionas={maximo}
              onMaxAnfitrionasChange={value => setMaximoEdit(value.replace(/\D/g, '').slice(0, 2))}
            />
          )}

          {seleccionado &&
            !esVentaSimple &&
            Number(maximo) >= 2 &&
            Number(maximo) <= MAX_ANFITRIONAS && (
              <SettingsChampagneTiers
                key={selectedId}
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
              disabled={saving}
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
