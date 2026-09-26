'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { SaleOption, SaleType } from '@/types/sale-options';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { CHAMPAGNE_DEFAULT_TIERS, type ChampagneTier } from '@/lib/business/champagne';
import { resolveShotMl } from '@/lib/business/shotMl';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { isSimpleProduct } from '@/components/orders/productModalRules';
import { useConfigValue } from '@/hooks/shared/useConfigValue';

const esChampagne = (categoria?: string | null) =>
  /champan|champagne/.test(
    (categoria || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  );

const formatMiles = (v: string | number) =>
  String(v ?? '')
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function parseSavedOptions(raw: unknown): SaleOption[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return parseSavedOptions(parsed);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(raw)) {
    const options = (raw as any[])
      .filter(o => o && typeof o.tipo === 'string')
      .map(o => ({
        tipo: o.tipo as SaleType,
        precio: Number(o.precio ?? 0),
        comision: Number(o.comision ?? 0)
      }));
    return options.length > 0 ? (options as SaleOption[]) : undefined;
  }
  return undefined;
}

export interface BarStockItem {
  opciones_venta?: SaleOption[] | string;
  id: string;
  producto_id: string;
  producto_nombre: string;
  producto_codigo: string;
  producto_foto: string | null;
  categoria_nombre?: string | null;
  nombre: string;
  codigo_barras: string | null;
  precio_compra: number;
  precio_venta: number;
  comision: number;
  foto: string | null;
  stock: number;
  stock_bar?: number;
  /** Capacidad de la botella en ml (null = default de Configuraciones > Bar). */
  ml_botella?: number | null;
  /** Ml servidos por shot de ese producto (null = default de Configuraciones > Bar). */
  ml_shot?: number | null;
  /** ml que quedan en la botella abierta de esa presentación en el bar. */
  ml_abierta?: number;
  /** Acumulado de ml servidos por shots en las ventas de esa presentación. */
  ml_servidos?: number;
  /** De Configuraciones > Comisiones. Null = default. */
  max_anfitrionas?: number | null;
  /** Base del producto, fallback si la presentación no tiene precio/comisión. */
  producto_precio?: number | null;
  producto_comision?: number | null;
}

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BarStockItem | null;
  onDone: () => void;
  endpoint?: string;
}

const formatNumber = (value: string) =>
  value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function TransferModal({
  open,
  onOpenChange,
  item,
  onDone,
  endpoint = '/api/bar'
}: TransferModalProps) {
  const [cantidad, setCantidad] = useState('');
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const [precioVenta, setPrecioVenta] = useState('');
  const [comision, setComision] = useState('');
  const [tipos, setTipos] = useState<SaleType[]>(['botella']);
  const [precioShot, setPrecioShot] = useState('');
  const [comisionShot, setComisionShot] = useState('');
  // Ml por shot del producto: editable al traspasar (vacío = valor global).
  const [mlShotEdit, setMlShotEdit] = useState('');
  // Lo que se muestra en los labels: lo que se está editando o el valor vigente.
  const mlPorShot = mlShotEdit !== '' ? Number(mlShotEdit) : resolveShotMl(item?.ml_shot, shotMl);
  const [tiers, setTiers] = useState<{ anfitrionas: number; precio: string; comision: string }[]>(
    []
  );
  const [editarPrecios, setEditarPrecios] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const esChampagneItem = esChampagne(item?.categoria_nombre);
  const opcionesGuardadas: SaleOption[] = parseSavedOptions(item?.opciones_venta) ?? [
    { tipo: 'botella', precio: item?.precio_venta ?? 0, comision: item?.comision ?? 0 }
  ];
  // Si ya tiene precio/comisión configurados, se reutilizan sin pedirlos manualmente.
  const tieneConfig = opcionesGuardadas.some(option => Number(option.precio ?? 0) > 0);

  useEffect(() => {
    if (open && item) {
      setCantidad('');
      // Cadena: traspaso guardado → presentación → producto (un 0 intermedio se salta).
      const presPrecio =
        Number(item.precio_venta) > 0
          ? Number(item.precio_venta)
          : Number(item.producto_precio ?? 0);
      const presComision =
        Number(item.comision) > 0 ? Number(item.comision) : Number(item.producto_comision ?? 0);
      const options = parseSavedOptions(item.opciones_venta) ?? [
        { tipo: 'botella', precio: presPrecio, comision: presComision }
      ];
      const bottle = options.find(option => option.tipo === 'botella');
      const shot = options.find(option => option.tipo === 'shot');
      setTipos(options.map(option => option.tipo));
      const bottlePrecio = Number(bottle?.precio) > 0 ? Number(bottle?.precio) : presPrecio;
      const bottleComision = Number(bottle?.comision) > 0 ? Number(bottle?.comision) : presComision;
      setPrecioVenta(bottlePrecio > 0 ? formatNumber(String(bottlePrecio)) : '');
      setComision(bottleComision ? formatNumber(String(bottleComision)) : '');
      setPrecioShot(shot && Number(shot.precio) > 0 ? formatNumber(String(shot.precio)) : '');
      setComisionShot(shot?.comision ? formatNumber(String(shot.comision)) : '');
      setMlShotEdit(
        item.ml_shot !== null && item.ml_shot !== undefined && Number(item.ml_shot) > 0
          ? String(item.ml_shot)
          : ''
      );
      // Con configuración existente se usa directo; solo la primera vez se pide manual.
      setEditarPrecios(!options.some(option => Number(option.precio ?? 0) > 0));
      setTiers([]);
      if (esChampagne(item.categoria_nombre)) {
        fetch(`/api/products/${item.producto_id}/tiers`)
          .then(res => res.json().catch(() => ({})))
          .then(data => {
            const rows =
              data.success && Array.isArray(data.data) && data.data.length > 0
                ? data.data
                : CHAMPAGNE_DEFAULT_TIERS;
            setTiers(
              rows.map((t: ChampagneTier) => ({
                anfitrionas: t.anfitrionas,
                precio: formatMiles(t.precio),
                comision: formatMiles(t.comision)
              }))
            );
          })
          .catch(() => {
            setTiers(
              CHAMPAGNE_DEFAULT_TIERS.map(t => ({
                anfitrionas: t.anfitrionas,
                precio: formatMiles(t.precio),
                comision: formatMiles(t.comision)
              }))
            );
          });
      }
    }
  }, [open, item]);

  const reset = () => {
    setCantidad('');
    setPrecioVenta('');
    setComision('');
    setPrecioShot('');
    setComisionShot('');
    setMlShotEdit('');
    setTipos(['botella']);
    setTiers([]);
    setEditarPrecios(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (submitting.current) return;
    if (!v) reset();
    onOpenChange(v);
  };

  const disponible = item?.stock ?? 0;

  const usarConfigGuardada = tieneConfig && !editarPrecios;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || submitting.current) return;
    const cant = Number(cantidad.replace(/\./g, ''));
    if (!Number.isInteger(cant) || cant < 1 || cant > Math.min(disponible, 1000)) {
      toast.error(`Cantidad debe estar entre 1 y ${Math.min(disponible, 1000)}`);
      return;
    }
    // Con configuración existente se reutiliza precio, comisión y anfitrionas sin pedirlos.
    let options: { tipo: SaleType; precio: number; comision: number }[];
    if (usarConfigGuardada) {
      options = opcionesGuardadas.map(option => ({
        tipo: option.tipo,
        precio: Number(option.precio ?? 0),
        comision: Number(option.comision ?? 0)
      }));
    } else {
      const pv = Number(precioVenta.replace(/\./g, ''));
      const com = comision.trim() === '' ? 0 : Number(comision.replace(/\./g, ''));
      options = tipos.map(tipo => ({
        tipo,
        precio: tipo === 'botella' ? pv : Number(precioShot.replace(/\./g, '')),
        comision: tipo === 'botella' ? com : Number(comisionShot.replace(/\./g, ''))
      }));
      if (
        !options.length ||
        options.some(
          option =>
            !Number.isInteger(option.precio) ||
            option.precio < 0 ||
            option.precio > 2147483647 ||
            !Number.isInteger(option.comision) ||
            option.comision < 0 ||
            option.comision > 2147483647
        )
      ) {
        toast.error('Selecciona un tipo de venta e indica precios y comisiones válidos');
        return;
      }
    }
    // Venta simple (Ajustes → Comisiones): la botella no lleva comisión.
    options = options.map(option =>
      option.tipo === 'botella' && isSimpleProduct(option.precio)
        ? { ...option, comision: 0 }
        : option
    );
    submitting.current = true;
    setSaving(true);
    try {
      // Ml por shot: se guarda en el producto si cambió (vacío = volver al global).
      const mlNuevo = mlShotEdit.replace(/\D/g, '');
      if (mlNuevo !== '' && (Number(mlNuevo) < 1 || Number(mlNuevo) > 10000)) {
        toast.error('Los ml por shot deben estar entre 1 y 10000');
        return;
      }
      const mlActual =
        item.ml_shot !== null && item.ml_shot !== undefined && Number(item.ml_shot) > 0
          ? String(item.ml_shot)
          : '';
      if (mlNuevo !== mlActual) {
        const mlRes = await fetch(`/api/products/${item.producto_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ml_shot: mlNuevo === '' ? null : Number(mlNuevo) })
        });
        const mlData = await mlRes.json().catch(() => ({}));
        if (!mlRes.ok || !mlData.success) {
          toast.error(mlData.message || 'No se pudieron guardar los ml por shot');
          return;
        }
      }
      // Solo se reescribe la tabla de anfitrionas si el usuario editó precios manualmente.
      if (esChampagneItem && tiers.length > 0 && !usarConfigGuardada) {
        const tiersRes = await fetch(`/api/products/${item.producto_id}/tiers`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tiers: tiers.map(t => ({
              anfitrionas: t.anfitrionas,
              precio: Number(String(t.precio).replace(/\./g, '')) || 0,
              comision: Number(String(t.comision).replace(/\./g, '')) || 0
            }))
          })
        });
        const tiersData = await tiersRes.json().catch(() => ({}));
        if (!tiersRes.ok || !tiersData.success) {
          toast.error(tiersData.message || 'No se pudo guardar la tabla champagne');
          return;
        }
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: item.producto_id,
          presentacion_id: item.id,
          cantidad: cant,
          opciones_venta: options
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo traspasar');
        return;
      }
      toast.success(data.message || 'Traspaso realizado');
      reset();
      onOpenChange(false);
      onDone();
    } catch {
      toast.error('Error de red al traspasar');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto max-w-md rounded-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>Traspasar al bar</DialogTitle>
          <DialogDescription>
            Transfiere unidades de esta presentación desde almacén al bar.
          </DialogDescription>
        </DialogHeader>
        {!item ? null : (
          <form onSubmit={handleSubmit} className='space-y-4 py-2'>
            <div className='flex items-center gap-3'>
              {/* eslint-disable-next-line @next/next/no-img-element -- ruta interna controlada */}
              <img
                data-themed-photo
                src={
                  item.foto && item.foto !== 'default.png'
                    ? item.foto.startsWith('http')
                      ? item.foto
                      : `/api/images/products/${item.foto}`
                    : item.producto_foto && item.producto_foto !== 'default.png'
                      ? item.producto_foto.startsWith('http')
                        ? item.producto_foto
                        : `/api/images/products/${item.producto_foto}`
                      : '/api/images/products/default.png'
                }
                alt={`${item.producto_nombre} ${item.nombre}`}
                className='w-16 h-16 rounded-2xl object-cover border border-gray-200 dark:border-slate-700 shrink-0'
              />
              <p className='text-sm text-gray-600 dark:text-gray-400 min-w-0'>
                <span className='font-semibold text-gray-900 dark:text-neutral-100 block truncate'>
                  {item.producto_nombre} — {item.nombre}
                </span>
                Disponibles en almacén: <span className='font-bold'>{disponible}</span>
                {' · '}En bar: <span className='font-bold'>{item.stock_bar ?? 0}</span>
                {item.precio_compra > 0 && (
                  <>
                    <br />
                    Precio compra: {formatCurrencyCLP(item.precio_compra)}
                  </>
                )}
                <br />
                <span className='text-xs'>
                  Config. comisiones: máx.{' '}
                  {item.max_anfitrionas !== null && item.max_anfitrionas !== undefined
                    ? `${item.max_anfitrionas} anf.`
                    : 'default por precio'}
                  {' · '}
                  {item.categoria_nombre ?? 'sin categoría'}
                </span>
              </p>
            </div>

            <div className='space-y-2'>
              <label
                htmlFor='transfer-quantity'
                className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
              >
                Cantidad
              </label>
              <Input
                id='transfer-quantity'
                required
                value={cantidad}
                onChange={e => setCantidad(formatNumber(e.target.value))}
                placeholder={`1 - ${disponible}`}
                inputMode='numeric'
                disabled={saving}
                className='h-12'
              />
            </div>

            <div className='space-y-2'>
              <label
                htmlFor='transfer-ml-shot'
                className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
              >
                Ml por shot
              </label>
              <Input
                id='transfer-ml-shot'
                value={mlShotEdit}
                onChange={e => setMlShotEdit(e.target.value.replace(/\D/g, ''))}
                placeholder={`${shotMl} (global)`}
                inputMode='numeric'
                disabled={saving}
                className='h-12 w-32'
              />
              <p className='text-[11px] text-gray-400 dark:text-gray-500 ml-1'>
                Se guarda en el producto al traspasar. En vacío usa el valor global ({shotMl} ml).
              </p>
            </div>

            {usarConfigGuardada ? (
              <div className='space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20'>
                <p className='text-sm font-semibold'>Configuración guardada</p>
                <p className='text-xs text-muted-foreground'>
                  Se usará el precio, la comisión y las anfitrionas ya configurados. Solo indica la
                  cantidad.
                </p>
                <dl className='grid gap-2'>
                  {opcionesGuardadas.map(option => (
                    <div
                      key={option.tipo}
                      className='flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-black/20'
                    >
                      <dt className='font-medium capitalize'>
                        {option.tipo === 'botella' ? 'Botella' : `Shot · ${mlPorShot} ml`}
                      </dt>
                      <dd className='text-right tabular-nums'>
                        <span className='font-semibold'>{formatCurrencyCLP(option.precio)}</span>{' '}
                        <span className='text-xs text-muted-foreground'>
                          {Number(option.comision) > 0
                            ? `· Comisión ${formatCurrencyCLP(Number(option.comision))}`
                            : '· Sin comisión'}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
                {esChampagneItem && tiers.length > 0 && (
                  <div className='grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 pt-1 text-sm'>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                      N°
                    </span>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                      Precio
                    </span>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                      Comisión
                    </span>
                    {tiers.flatMap(t => [
                      <span
                        key={`n-${t.anfitrionas}`}
                        className='inline-flex h-9 items-center justify-center rounded-xl bg-purple-100 font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      >
                        {t.anfitrionas}
                      </span>,
                      <span key={`p-${t.anfitrionas}`} className='font-semibold tabular-nums'>
                        ${t.precio}
                      </span>,
                      <span
                        key={`c-${t.anfitrionas}`}
                        className='text-muted-foreground tabular-nums'
                      >
                        ${t.comision}
                      </span>
                    ])}
                  </div>
                )}
                <Button
                  type='button'
                  variant='outline'
                  disabled={saving}
                  onClick={() => setEditarPrecios(true)}
                  className='w-full rounded-full'
                >
                  Modificar precios
                </Button>
              </div>
            ) : (
              <>
                {tieneConfig && (
                  <Button
                    type='button'
                    variant='ghost'
                    disabled={saving}
                    onClick={() => setEditarPrecios(false)}
                    className='w-full rounded-full text-xs'
                  >
                    Usar configuración guardada
                  </Button>
                )}
                <fieldset className='flex flex-col gap-3'>
                  <legend className='mb-2 text-sm font-semibold'>Tipo de venta</legend>
                  <ToggleGroup
                    type='multiple'
                    variant='selection'
                    value={tipos}
                    onValueChange={value => setTipos(value as SaleType[])}
                    disabled={saving}
                    aria-label='Tipos de venta'
                    className='justify-start'
                  >
                    <ToggleGroupItem value='botella' className='flex-1 rounded-full'>
                      {tipos.includes('botella') && <Check aria-hidden='true' />}
                      Botella
                    </ToggleGroupItem>
                    <ToggleGroupItem value='shot' className='flex-1 rounded-full'>
                      {tipos.includes('shot') && <Check aria-hidden='true' />}
                      Shot · {mlPorShot} ml
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <p className='text-xs text-muted-foreground'>
                    Puedes seleccionar uno o ambos tipos. La cantidad transferida corresponde a
                    unidades completas de la presentación.
                  </p>
                  {tipos.map(tipo => (
                    <fieldset key={tipo} className='rounded-xl border p-3'>
                      <legend className='px-1 text-sm font-semibold'>
                        {tipo === 'botella' ? 'Botella' : `Shot · ${mlPorShot} ml`}
                      </legend>
                      <div className='grid grid-cols-2 gap-3'>
                        <div className='flex flex-col gap-2'>
                          <label htmlFor={'price-' + tipo} className='text-sm'>
                            Precio por {tipo}
                          </label>
                          <Input
                            id={'price-' + tipo}
                            required
                            inputMode='numeric'
                            placeholder='0'
                            disabled={saving}
                            value={tipo === 'botella' ? precioVenta : precioShot}
                            onChange={event =>
                              (tipo === 'botella' ? setPrecioVenta : setPrecioShot)(
                                formatNumber(event.target.value)
                              )
                            }
                          />
                        </div>
                        <div className='flex flex-col gap-2'>
                          <label htmlFor={'commission-' + tipo} className='text-sm'>
                            Comisión (opcional)
                          </label>
                          <Input
                            id={'commission-' + tipo}
                            inputMode='numeric'
                            placeholder='Sin comisión'
                            disabled={saving}
                            value={tipo === 'botella' ? comision : comisionShot}
                            onChange={event =>
                              (tipo === 'botella' ? setComision : setComisionShot)(
                                formatNumber(event.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                    </fieldset>
                  ))}
                </fieldset>

                <p className='text-[11px] text-gray-400 ml-1'>
                  Se trasladan las unidades más antiguas. El precio y la comisión quedan definidos
                  para esta presentación.
                </p>

                {esChampagneItem && tiers.length > 0 && (
                  <div className='space-y-2 rounded-xl border p-3'>
                    <p className='text-sm font-semibold'>Precios champagne por anfitrionas</p>
                    <div className='grid grid-cols-[2.5rem_1fr_1fr] gap-2 items-center'>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                        N°
                      </span>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                        Precio
                      </span>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                        Comisión
                      </span>
                      {tiers.flatMap((t, i) => [
                        <span
                          key={`n-${t.anfitrionas}`}
                          className='inline-flex items-center justify-center h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm'
                        >
                          {t.anfitrionas}
                        </span>,
                        <Input
                          key={`p-${t.anfitrionas}`}
                          value={t.precio}
                          onChange={e =>
                            setTiers(prev =>
                              prev.map((x, j) =>
                                j === i ? { ...x, precio: formatMiles(e.target.value) } : x
                              )
                            )
                          }
                          inputMode='numeric'
                          disabled={saving}
                          className='h-10'
                        />,
                        <Input
                          key={`c-${t.anfitrionas}`}
                          value={t.comision}
                          onChange={e =>
                            setTiers(prev =>
                              prev.map((x, j) =>
                                j === i ? { ...x, comision: formatMiles(e.target.value) } : x
                              )
                            )
                          }
                          inputMode='numeric'
                          disabled={saving}
                          className='h-10'
                        />
                      ])}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleOpenChange(false)}
                disabled={saving}
                className='rounded-full px-6'
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={saving || disponible === 0 || (!usarConfigGuardada && tipos.length === 0)}
                className='rounded-full px-6 bg-black text-white hover:bg-white hover:text-black border-2'
              >
                {saving ? (
                  <span className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Traspasando...
                  </span>
                ) : (
                  'Traspasar'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
