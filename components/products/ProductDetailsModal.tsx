'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UnitLabelSelector } from './UnitLabelSelector';
import { SalePrices } from '@/components/bar/SalePrices';
import { isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { Product, Presentacion, UnidadProducto } from '@/types/product';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Loader2 } from 'lucide-react';

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
  mlShot
}: {
  presentation: Presentacion;
  field: 'precio' | 'comision';
  mlShot?: number | null;
}) {
  if (isTierPricedItem(presentation)) return <span>Según número de anfitrionas</span>;
  return (
    <SalePrices
      options={presentation.opciones_venta}
      price={presentation.precio_venta}
      commission={presentation.comision}
      field={field}
      mlShot={mlShot}
    />
  );
}

function imageUrl(foto?: string | null): string {
  if (!foto || foto === 'default.png') return '/api/images/products/default.png';
  if (foto.startsWith('http') || foto.startsWith('blob:') || foto.startsWith('/')) return foto;
  return `/api/images/products/${foto}`;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='min-w-0'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-1 break-words text-sm font-medium'>{children}</dd>
    </div>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden rounded-2xl p-0'>
        <DialogHeader className='border-b p-6 pr-12'>
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
                className='relative size-32 shrink-0 overflow-hidden rounded-xl border'
              >
                <Image
                  data-themed-photo
                  src={imageUrl(displayPresentation?.foto || item.foto)}
                  alt={`${item.name} ${displayPresentation?.nombre ?? ''}`}
                  fill
                  sizes='128px'
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
              <div role='alert' className='flex flex-col items-start gap-3 rounded-xl border p-4'>
                <p>{error || 'No se encontró la presentación seleccionada.'}</p>
                <Button variant='outline' onClick={() => setAttempt(v => v + 1)}>
                  Reintentar
                </Button>
              </div>
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
                      />
                    </Info>
                    <Info label='Comisión en bar'>
                      <PresentationPrices
                        presentation={selectedPrices}
                        field='comision'
                        mlShot={item.ml_shot}
                      />
                    </Info>
                    <Info label='Máximo de anfitrionas'>
                      {item.max_anfitrionas ?? 'Según configuración general'}
                    </Info>
                    <Info label='Ml por shot'>
                      {item.ml_shot != null && Number(item.ml_shot) > 0
                        ? `${Number(item.ml_shot)} ml`
                        : 'Configuración global'}
                    </Info>
                    <Info label='Precio de compra'>
                      {formatCurrencyCLP(selectedPrices.precio_compra ?? 0)}
                    </Info>
                    <Info label='Stock en almacén'>{selectedPrices.stock ?? 0} unidades</Info>
                    <Info label='Stock en bar'>{selectedPrices.stock_bar ?? 0} unidades</Info>
                  </dl>
                </section>
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
                        <table className='w-full text-left text-sm'>
                          <thead>
                            <tr className='border-b'>
                              <th className='p-2'>Anfitrionas</th>
                              <th className='p-2'>Precio</th>
                              <th className='p-2'>Comisión</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tiers.map(tier => (
                              <tr key={tier.anfitrionas} className='border-b'>
                                <td className='p-2'>{tier.anfitrionas}</td>
                                <td className='p-2'>{formatCurrencyCLP(tier.precio)}</td>
                                <td className='p-2'>{formatCurrencyCLP(tier.comision)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                <section className='flex flex-col gap-3' aria-label='Códigos y etiquetas'>
                  <h3 className='font-semibold'>
                    Códigos y etiquetas ({visibleUnits.length} cargados)
                  </h3>
                  <p className='text-xs text-muted-foreground'>
                    Se muestran hasta 1000 códigos recientes de esta presentación, incluidos los
                    inactivos.
                  </p>
                  {visibleUnits.length ? (
                    <UnitLabelSelector key={selectedPrices.id} units={visibleUnits} />
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
