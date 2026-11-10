'use client';
import { ErrorState } from '@/components/shared/ErrorState';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { productImageUrl } from '@/lib/utils/productImage';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UnitLabelSelector } from './UnitLabelSelector';
import { SalePrices } from '@/components/bar/SalePrices';
import { isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { Product, Presentacion, UnidadProducto } from '@/types/product';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { AlertTriangle, Clock3, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { estadoVencimiento, fechaVencimientoUnidad } from '@/lib/business/vencimiento';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ProductDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  presentation?: Presentacion | null;
}
interface Tier {
  anfitrionas: number;
  precio: number;
  comision: number;
}

function PresentationPrices({
  presentation,
  field,
  mlShot,
  mlShotAnfitriona
}: {
  presentation: Presentacion;
  field: 'precio' | 'comision';
  mlShot?: number | null;
  mlShotAnfitriona?: number | null;
}) {
  if (isTierPricedItem(presentation)) return <span>Según número de anfitrionas</span>;
  return (
    <SalePrices
      options={presentation.opciones_venta}
      price={presentation.precio_venta}
      commission={presentation.comision}
      field={field}
      mlShot={mlShot}
      mlShotAnfitriona={mlShotAnfitriona}
    />
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='min-w-0'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-1 break-words text-sm font-medium'>{children}</dd>
    </div>
  );
}

function StockCodeSummary({
  unidades,
  fechaPresentacion,
  presentationId,
  onRetired
}: {
  unidades: UnidadProducto[];
  fechaPresentacion?: string | null;
  presentationId: string;
  onRetired: () => void;
}) {
  const [confirmarRetiro, setConfirmarRetiro] = useState(false);
  const [retirando, setRetirando] = useState(false);
  const grupos = {
    vencidas: [] as UnidadProducto[],
    por_vencer: [] as UnidadProducto[],
    buen_estado: [] as UnidadProducto[]
  };

  for (const unidad of unidades) {
    if (unidad.estado !== 'almacen' || unidad.ubicacion !== 'almacen') continue;
    const fecha = fechaVencimientoUnidad(
      unidad.fecha_vencimiento ?? null,
      fechaPresentacion ?? null
    );
    const estado = estadoVencimiento(fecha)?.estado;
    if (estado === 'vencido') grupos.vencidas.push(unidad);
    else if (estado === 'por_vencer') grupos.por_vencer.push(unidad);
    else grupos.buen_estado.push(unidad);
  }

  const tarjetas = [
    {
      key: 'vencidas' as const,
      titulo: 'Vencidos',
      icono: AlertTriangle,
      clases:
        'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
    },
    {
      key: 'por_vencer' as const,
      titulo: 'Por vencer (30 días)',
      icono: Clock3,
      clases:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
    },
    {
      key: 'buen_estado' as const,
      titulo: 'Buen estado',
      icono: ShieldCheck,
      clases:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
    }
  ];

  const retirarVencidos = async () => {
    if (!presentationId || grupos.vencidas.length === 0) return;
    setRetirando(true);
    try {
      const response = await fetch('/api/products/expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentacion_id: presentationId,
          origen: 'almacen',
          nota: 'Retiro desde el detalle de producto en Inventario'
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        toast.error(result?.message || 'No se pudieron retirar los productos vencidos');
        return;
      }
      toast.success(result.message || 'Productos vencidos retirados correctamente');
      setConfirmarRetiro(false);
      onRetired();
    } catch {
      toast.error('No se pudieron retirar los productos vencidos');
    } finally {
      setRetirando(false);
    }
  };

  return (
    <>
      <section className='flex flex-col gap-3' aria-label='Estado de unidades en bodega'>
        <h3 className='font-semibold'>Estado de unidades en bodega</h3>
        <div className='grid gap-2 sm:grid-cols-3'>
          {tarjetas.map(({ key, titulo, icono: Icono, clases }) => (
            <div key={key} className={`rounded-lg border p-3 ${clases}`}>
              <div className='flex items-center justify-between gap-2'>
                <span className='flex items-center gap-1 text-xs font-semibold'>
                  <Icono className='h-3.5 w-3.5' /> {titulo}
                </span>
                <strong className='text-lg'>{grupos[key].length}</strong>
              </div>
              <div className='mt-2 flex flex-wrap gap-1'>
                {grupos[key].length === 0 ? (
                  <span className='text-xs opacity-70'>Sin códigos</span>
                ) : (
                  grupos[key].map(unidad => (
                    <code
                      key={unidad.id}
                      className='rounded-md border border-current/20 bg-background px-1.5 py-0.5 text-[11px] font-semibold text-foreground'
                    >
                      {unidad.codigo}
                    </code>
                  ))
                )}
              </div>
              {key === 'vencidas' && grupos.vencidas.length > 0 && (
                <PermissionGuard module='products' action='edit' fallback={null}>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='mt-3 w-full rounded-full border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950'
                    onClick={() => setConfirmarRetiro(true)}
                  >
                    <Trash2 className='h-4 w-4' />
                    Retirar vencidos
                  </Button>
                </PermissionGuard>
              )}
            </div>
          ))}
        </div>
      </section>
      <AlertDialog open={confirmarRetiro} onOpenChange={setConfirmarRetiro}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirar productos vencidos</AlertDialogTitle>
            <AlertDialogDescription>
              Se retirarán {grupos.vencidas.length} unidad(es) vencida(s) desde Inventario. Las
              unidades pasarán al historial de vencidos retirados y saldrán del stock activo. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retirando} className='rounded-full'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={retirarVencidos}
              disabled={retirando}
              className='rounded-full'
            >
              {retirando ? 'Retirando…' : 'Retirar vencidos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ProductDetailsModal({
  open,
  onOpenChange,
  product,
  presentation = null
}: ProductDetailsModalProps) {
  const [detail, setDetail] = useState<Product | null>(null);
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [unidades, setUnidades] = useState<UnidadProducto[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const productId = product?.id;
  const presentationId = presentation?.id;

  useRealtimeRefresh(
    '/api/products',
    () => setAttempt(value => value + 1),
    open && Boolean(productId)
  );

  useEffect(() => {
    if (!open || !productId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);
    setPresentaciones([]);
    setUnidades([]);
    setTiers([]);
    async function read(url: string) {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo cargar la información del producto.');
      return result.data;
    }
    const encoded = encodeURIComponent(productId);
    Promise.all([
      read(`/api/products?id=${encoded}`),
      read(`/api/bar?producto_id=${encoded}`),
      read(
        `/api/products/units?producto_id=${encoded}${presentationId ? `&presentacion_id=${encodeURIComponent(presentationId)}` : ''}`
      ),
      read(`/api/products/${encoded}/tiers`)
    ])
      .then(([item, presentations, units, priceTiers]) => {
        if (controller.signal.aborted) return;
        setDetail(item);
        setPresentaciones(presentations);
        setUnidades(units.unidades);
        setTiers(priceTiers);
      })
      .catch(error => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : 'No se pudo cargar el producto.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, productId, presentationId, attempt]);

  const item =
    detail && detail.id === productId
      ? {
          ...product,
          ...detail,
          categoria:
            detail.categoria ||
            product?.categoria ||
            presentaciones[0]?.categoria_nombre ||
            undefined
        }
      : product;
  const selectedPrices =
    presentaciones.find(p => p.id === presentation?.id) ??
    (!presentationId && presentaciones.length === 1 ? presentaciones[0] : undefined);
  const visibleUnits = selectedPrices
    ? unidades.filter(u => u.presentacion_id === selectedPrices.id)
    : [];
  const displayPresentation = selectedPrices ?? presentation;
  // Las etiquetas de este modal llevan producto y presentación.
  const unidadesConEtiqueta = visibleUnits.map(unit => ({
    ...unit,
    producto_nombre: item?.name ?? null,
    presentacion_nombre: displayPresentation?.nombre ?? null
  }));
  const unidadesImprimibles = unidadesConEtiqueta.filter(
    unit => !unit.estado || unit.estado === 'almacen'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden rounded-2xl p-0'>
        <DialogHeader className='border-b p-4 pr-12 sm:p-6'>
          <DialogTitle>Detalle de la presentación</DialogTitle>
          <DialogDescription>
            Precios, inventario y etiquetas de esta presentación.
          </DialogDescription>
        </DialogHeader>
        {item && (
          <div className='flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6'>
            <div className='flex flex-col gap-4 sm:flex-row'>
              <div
                data-photo-surface
                className='relative size-32 shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-800/40'
              >
                <ProductPhoto
                  src={productImageUrl(displayPresentation?.foto, item.foto)}
                  alt={`${item.name} ${displayPresentation?.nombre ?? ''}`}
                  fill
                  className='object-contain'
                />
              </div>
              <div className='flex min-w-0 flex-1 flex-col gap-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h3 className='text-xl font-semibold'>
                    {item.name} {displayPresentation ? `— ${displayPresentation.nombre}` : ''}
                  </h3>
                  <Badge variant={item.status === 1 ? 'secondary' : 'outline'}>
                    {item.status === 1 ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <p className='text-sm text-muted-foreground'>
                  Código de barras:{' '}
                  <span className='font-mono'>
                    {displayPresentation?.codigo_barras || 'Sin código de barras'}
                  </span>{' '}
                  · {item.categoria || `Categoría ${item.category_id}`}
                </p>
                <p className='whitespace-pre-wrap break-words text-sm'>
                  {item.description || 'Sin descripción registrada.'}
                </p>
                {presentation && (
                  <p className='text-xs text-muted-foreground'>
                    Presentación seleccionada: {presentation.nombre}
                  </p>
                )}
              </div>
            </div>
            {loading ? (
              <div role='status' className='flex items-center gap-2 py-6'>
                <Loader2 className='size-5 animate-spin' />
                Cargando información actualizada...
              </div>
            ) : error || !selectedPrices ? (
              <ErrorState
                message={error || 'No se encontró la presentación seleccionada.'}
                onRetry={() => setAttempt(v => v + 1)}
              />
            ) : (
              <>
                <section className='flex flex-col gap-3' aria-label='Información general'>
                  <h3 className='font-semibold'>Información general</h3>
                  <dl className='grid grid-cols-2 gap-4 rounded-xl border p-4 sm:grid-cols-3'>
                    <Info label='Precio de venta en bar'>
                      <PresentationPrices
                        presentation={selectedPrices}
                        field='precio'
                        mlShot={item.ml_shot}
                        mlShotAnfitriona={item.ml_shot_anfitriona}
                      />
                    </Info>
                    <Info label='Comisión en bar'>
                      <PresentationPrices
                        presentation={selectedPrices}
                        field='comision'
                        mlShot={item.ml_shot}
                        mlShotAnfitriona={item.ml_shot_anfitriona}
                      />
                    </Info>
                    <Info label='Máximo de anfitrionas'>
                      {item.max_anfitrionas ?? 'Según configuración general'}
                    </Info>
                    <Info label='Ml por corto'>
                      {item.ml_shot != null && Number(item.ml_shot) > 0
                        ? `${Number(item.ml_shot)} ml`
                        : 'Configuración global'}
                      {item.ml_shot_anfitriona != null && Number(item.ml_shot_anfitriona) > 0
                        ? ` · Anf ${Number(item.ml_shot_anfitriona)} ml`
                        : ''}
                    </Info>
                    <Info label='Precio de compra'>
                      {formatCurrencyCLP(selectedPrices.precio_compra ?? 0)}
                    </Info>
                    <Info label='Stock en bodega'>{selectedPrices.stock ?? 0} unidades</Info>
                    <Info label='Stock en bar'>{selectedPrices.stock_bar ?? 0} unidades</Info>
                    <Info label='Stock total (Bar + Bodega)'>
                      {Number(selectedPrices.stock ?? 0) + Number(selectedPrices.stock_bar ?? 0)}{' '}
                      unidades
                    </Info>
                    <Info label='Stock mínimo'>
                      {selectedPrices.stock_minimo == null
                        ? 'Sin configurar'
                        : selectedPrices.stock_minimo.toLocaleString('es-CL')}
                    </Info>
                    <Info label='Stock máximo'>
                      {selectedPrices.stock_maximo == null
                        ? 'Sin configurar'
                        : selectedPrices.stock_maximo.toLocaleString('es-CL')}
                    </Info>
                  </dl>
                </section>
                <StockCodeSummary
                  unidades={visibleUnits}
                  fechaPresentacion={selectedPrices.fecha_vencimiento}
                  presentationId={selectedPrices.id}
                  onRetired={() => setAttempt(value => value + 1)}
                />
                {!!tiers.length &&
                  /champan|champagne/.test(
                    `${item.name} ${item.categoria ?? ''}`
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .toLowerCase()
                  ) && (
                    <section className='flex flex-col gap-3' aria-label='Precios por anfitrionas'>
                      <h3 className='font-semibold'>Precios por anfitrionas</h3>
                      <div className='overflow-x-auto'>
                        <Table className='w-full text-left'>
                          <TableHeader>
                            <TableRow className='border-b'>
                              <TableHead>Anfitrionas</TableHead>
                              <TableHead>Precio</TableHead>
                              <TableHead>Comisión</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tiers.map(tier => (
                              <TableRow key={tier.anfitrionas} className='border-b'>
                                <TableCell>{tier.anfitrionas}</TableCell>
                                <TableCell>{formatCurrencyCLP(tier.precio)}</TableCell>
                                <TableCell>{formatCurrencyCLP(tier.comision)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </section>
                  )}
                <section className='flex flex-col gap-3' aria-label='Códigos y etiquetas'>
                  <h3 className='font-semibold'>
                    Códigos y etiquetas ({unidadesImprimibles.length} disponibles)
                  </h3>
                  <p className='text-xs text-muted-foreground'>
                    Se muestran códigos activos disponibles para imprimir. Los retirados y vendidos
                    quedan excluidos.
                  </p>
                  {unidadesImprimibles.length ? (
                    <UnitLabelSelector key={selectedPrices.id} units={unidadesImprimibles} />
                  ) : (
                    <p className='text-sm text-muted-foreground'>Sin códigos generados.</p>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
