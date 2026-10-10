'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Users, RotateCcw, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import {
  useSettingsProducts,
  invalidateSettingsProducts
} from '@/hooks/settings/useSettingsProducts';
import { isChampagneProduct } from '@/components/orders/productModalRules';
import { SettingsChampagneTiers, type SettingsTiersHandle } from './SettingsChampagneTiers';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import type { SaleOption } from '@/types/sale-options';

type PresentacionComisiones = {
  id: string;
  producto_id: string;
  nombre: string;
  precio_venta: number;
  comision: number;
  opciones_venta: SaleOption[];
};

const MIN_ANFITRIONAS = 1;
const MAX_ANFITRIONAS = 10;

const formatMiles = (v: string | number) =>
  String(v ?? '')
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const toNumber = (v: string) => Number(String(v).replace(/\./g, '')) || 0;

export function SettingsBottleHostessCard() {
  const { productos: allProductos, loading, error: productsError, refresh } = useSettingsProducts();
  const [selectedId, setSelectedId] = useState<string>('');
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  // Lo que el usuario editó; null = sin editar, se muestra el valor vigente.
  const [maximoEdit, setMaximoEdit] = useState<string | null>(null);
  const [precioEdit, setPrecioEdit] = useState<string | null>(null);
  const [comisionEdit, setComisionEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const tiersRef = useRef<SettingsTiersHandle>(null);
  // Productos del bar que se venden por botella (no importa si también tienen
  // shot): son los únicos donde aplica el máximo por botella.
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
          // Sin opciones configuradas la botella es la venta por defecto.
          if (opciones.length === 0 || opciones.some(o => o?.tipo === 'botella')) {
            disponibles.push({
              id: String(row.id),
              producto_id: pid,
              nombre: String(row.nombre ?? ''),
              precio_venta: Number(row.precio_venta ?? 0),
              comision: Number(row.comision ?? 0),
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
              opciones_venta: presentacion.opciones_venta,
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
  const esChampagne = isChampagneProduct({
    categoria: seleccionado?.categoria,
    category_name: seleccionado?.categoria
  });
  const vigente =
    seleccionado?.max_anfitrionas !== null && seleccionado?.max_anfitrionas !== undefined
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
          comision: comisionValor,
          opciones_venta: seleccionado.opciones_venta.length
            ? seleccionado.opciones_venta.map(o =>
                o.tipo === 'botella' ? { ...o, precio: precioValor, comision: comisionValor } : o
              )
            : [{ tipo: 'botella', precio: precioValor, comision: comisionValor }]
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
      if (maximoValor !== vigente) {
        const maxRes = await fetch(`/api/products/${seleccionado.producto_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ max_anfitrionas: maximoValor })
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
    <Card className='border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold dark:text-white'>
          <Users className='h-5 w-5 text-neutral-500' />
          Precios y comisiones por producto
        </CardTitle>
        <CardDescription className='text-neutral-500 dark:text-neutral-400'>
          Elegí una presentación para editar su precio y comisión por botella. El máximo de
          anfitrionas y la tabla de champagne se comparten entre las presentaciones del producto.
          Máximo vacío = regla por defecto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {productsError && (
          <div role='alert' className='mb-4 text-sm text-red-600'>
            {productsError}{' '}
            <button type='button' onClick={() => void refresh()} className='underline'>
              Reintentar
            </button>
          </div>
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
            <button
              type='button'
              onClick={() => setBarNonce(n => n + 1)}
              className='px-6 py-2 rounded-full font-bold border-2 border-neutral-300 dark:border-neutral-700 hover:scale-105 active:scale-95 transition-all text-sm'
            >
              Reintentar
            </button>
          </div>
        ) : productos.length === 0 ? (
          <p className='text-center py-8 text-neutral-400 text-sm'>
            No hay productos del bar que se vendan por botella.
          </p>
        ) : (
          <div className='space-y-6'>
            <div className='space-y-1'>
              <label
                htmlFor='botella-producto'
                className='block text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1'
              >
                Producto y presentación
              </label>
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
                    className='w-full justify-between rounded-full font-normal'
                  >
                    <span className='truncate'>
                      {seleccionado ? etiquetaProducto(seleccionado) : 'Seleccionar producto'}
                    </span>
                    <ChevronsUpDown className='opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align='start'
                  className='w-[var(--radix-popover-trigger-width)] p-0'
                >
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
                            <span>{etiquetaProducto(p)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='space-y-1'>
                <label
                  htmlFor='botella-precio'
                  className='block text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1'
                >
                  Precio venta
                </label>
                <input
                  id='botella-precio'
                  inputMode='numeric'
                  value={precio}
                  onChange={e => setPrecioEdit(formatMiles(e.target.value))}
                  placeholder='0'
                  className='w-full px-4 py-2.5 text-right bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                />
              </div>
              <div className='space-y-1'>
                <label
                  htmlFor='botella-comision'
                  className='block text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1'
                >
                  Comisión
                </label>
                <input
                  id='botella-comision'
                  inputMode='numeric'
                  value={comision}
                  onChange={e => setComisionEdit(formatMiles(e.target.value))}
                  placeholder='0'
                  className='w-full px-4 py-2.5 text-right bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                />
              </div>
              <div className='space-y-1'>
                <label
                  htmlFor='botella-max'
                  className='block text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1'
                >
                  Máx. anfitrionas
                </label>
                <input
                  id='botella-max'
                  type='number'
                  min={MIN_ANFITRIONAS}
                  max={MAX_ANFITRIONAS}
                  value={maximo}
                  onChange={e => setMaximoEdit(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder='Default'
                  className='w-full px-4 py-2.5 text-center bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                />
              </div>
            </div>

            <p className='text-sm text-neutral-500 dark:text-neutral-400 ml-1'>
              Vigente:{' '}
              <span className='font-bold text-neutral-800 dark:text-neutral-100'>
                {vigente !== null ? `Máx. ${vigente} anf. por botella` : 'regla por defecto'}
              </span>
            </p>

            {Number(maximo) >= 2 && Number(maximo) <= MAX_ANFITRIONAS && seleccionado && (
              <SettingsChampagneTiers
                key={selectedId}
                ref={tiersRef}
                disabled={saving}
                productId={seleccionado.producto_id}
                maxAnfitrionas={Number(maximo)}
                champagne={esChampagne}
                precioBase={precioVigente}
                comisionBase={comisionVigente}
              />
            )}

            <div className='flex flex-wrap justify-end gap-2 pt-2'>
              {vigente !== null && (
                <button
                  type='button'
                  onClick={() => guardarMaximo(null)}
                  disabled={saving}
                  className='flex items-center gap-2 px-6 py-2.5 rounded-full font-bold border-2 border-neutral-300 dark:border-neutral-700 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 text-sm'
                >
                  <RotateCcw className='h-4 w-4' />
                  Volver al default
                </button>
              )}
              <button
                type='button'
                onClick={handleSave}
                disabled={saving}
                className='flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:scale-105 active:scale-95 transition-all duration-200 rounded-full font-bold disabled:opacity-50'
              >
                <Save className='h-4 w-4' />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
