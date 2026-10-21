'use client';
import { Button } from '@/components/ui/button';

import { useState } from 'react';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { AlertTriangle, GlassWater, Wine, type LucideIcon } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { CortoVendidoHoy, OrigenCorto, ShotsSummary } from '@/modules/inventario/contracts';

interface BarOpenBottleDetail {
  foto?: string | null;
  venta_corto_habilitada?: boolean;
  id: string;
  cantidad: number;
  ml_disponibles: number;
  ml_cliente: number;
  ml_anfitriona: number;
  shots_anfitriona_disponibles: number;
  shots_disponibles: number;
  producto_nombre: string;
  presentacion_nombre: string;
}

interface StatCard {
  title: string;
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  /** Los stats con detalle abren un modal desde toda la tarjeta. */
  onOpen?: () => void;
  overlayLabel?: string;
}

const ORIGEN_CORTO: Record<OrigenCorto, string> = {
  barra: 'Barra',
  cuenta: 'Cuenta',
  habitacion: 'Habitación',
  servicio: 'Servicio',
  pedido: 'Pedido'
};

/** «Habitación 12» cuando se conoce el nombre; el resto de orígenes, su etiqueta. */
function etiquetaOrigen(corto: CortoVendidoHoy): string {
  const base = ORIGEN_CORTO[corto.origen];
  return corto.origen === 'habitacion' && corto.habitacion_nombre
    ? `${base} ${corto.habitacion_nombre}`
    : base;
}

/** Hora local de la venta, sin la fecha. */
function horaDe(fecha: string): string {
  return fecha.replace('T', ' ').slice(11, 16);
}

/**
 * «Acompañamiento: Soda · 100 ml por corte (200 ml en total)» o «Sin
 * acompañamiento»: dice si el trago salió con bebida, cuál y cuánto.
 */
function detalleAcompanamiento(corto: CortoVendidoHoy): string {
  const acompanamiento = corto.acompanamiento;
  if (!acompanamiento) return 'Sin acompañamiento';
  const esPorMl = acompanamiento.ml_por_corto !== null;
  const porCorto = esPorMl ? (acompanamiento.ml_por_corto ?? 0) : (acompanamiento.unidades ?? 0);
  const unidad = esPorMl ? 'ml' : porCorto === 1 ? 'unidad' : 'unidades';
  const total = porCorto * corto.cantidad;
  const etiquetaTotal = `${total} ${esPorMl ? 'ml' : total === 1 ? 'unidad' : 'unidades'}`;
  return `Acompañamiento: ${acompanamiento.nombre ?? 'Bebida'} · ${porCorto} ${unidad} por corte${
    corto.cantidad > 1 ? ` (${etiquetaTotal} en total)` : ''
  }`;
}

/**
 * Cortos agrupados por venta, del ticket más reciente al más antiguo. Cada
 * agrupación es un ticket completo: mismo origen, misma venta y mismo cobro.
 */
function cortosPorVenta(cortos: CortoVendidoHoy[]): CortoVendidoHoy[][] {
  const tickets = new Map<string, CortoVendidoHoy[]>();
  for (const corto of cortos) {
    const ticket = tickets.get(corto.venta_id);
    if (ticket) ticket.push(corto);
    else tickets.set(corto.venta_id, [corto]);
  }
  return [...tickets.values()];
}

export function BarStatsCards({
  resumen,
  botellasAbiertas = []
}: {
  resumen: ShotsSummary | null;
  botellasAbiertas?: BarOpenBottleDetail[];
}) {
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [cortosAbierto, setCortosAbierto] = useState(false);
  const cortosHoy = resumen?.cortosHoy ?? [];
  // Un ticket por venta: el modal se lee como el ticket que lo originó.
  const tickets = cortosPorVenta(cortosHoy);
  // Resumen del día, siempre visible en el encabezado del modal.
  const totalCortosHoy = cortosHoy.reduce((total, corto) => total + corto.cantidad, 0);
  const cobradoCortos = cortosHoy.reduce((total, corto) => total + corto.subtotal, 0);
  const mlCortosHoy = cortosHoy.reduce((total, corto) => total + corto.ml, 0);
  const cortosAnfitriona = cortosHoy
    .filter(corto => corto.anfitriona)
    .reduce((total, corto) => total + corto.cantidad, 0);
  const cortosConAcompanamiento = cortosHoy
    .filter(corto => corto.acompanamiento)
    .reduce((total, corto) => total + corto.cantidad, 0);
  const pluralCortos = totalCortosHoy === 1 ? 'corto' : 'cortos';
  // Misma fuente que `mlColacionHoy`: las colaciones explican los ml servidos
  // que no son cortos vendidos.
  const colacionesHoy = resumen?.colacionesHoy ?? [];
  const mlDeVentas = resumen ? Math.max(resumen.mlServidosHoy - resumen.mlColacionHoy, 0) : 0;
  const stats: StatCard[] = [
    {
      title: 'Cortos servidos hoy',
      label: 'Hoy',
      value: resumen ? resumen.shotsServidosHoy : '—',
      detail: resumen
        ? resumen.mlColacionHoy > 0 && mlDeVentas === 0
          ? `${resumen.mlServidosHoy} ml de colaciones · clic para ver detalle`
          : `${resumen.mlServidosHoy} ml servidos${
              resumen.mlColacionHoy > 0
                ? ` (incluye ${resumen.mlColacionHoy} ml de colaciones)`
                : ''
            } · clic para ver detalle`
        : 'Cargando resumen del bar…',
      icon: GlassWater,
      onOpen: () => setCortosAbierto(true),
      overlayLabel: 'Ver los cortos servidos hoy y su origen'
    },
    {
      title: 'Disponible en botellas abiertas',
      label: 'Disponible',
      value: resumen ? `${resumen.mlRestantesTotales} ml` : '—',
      detail: resumen
        ? `${resumen.botellasAbiertas} ${resumen.botellasAbiertas === 1 ? 'botella abierta' : 'botellas abiertas'} en bar · clic para ver detalle`
        : 'Cargando resumen del bar…',
      icon: Wine,
      onOpen: () => setDetalleAbierto(true),
      overlayLabel: 'Ver las botellas abiertas y sus mililitros disponibles'
    },
    {
      title: 'Botellas por agotarse',
      label: 'Stock bajo',
      value: resumen ? resumen.botellasPorAgotarse : '—',
      detail: resumen
        ? `Con ${resumen.shotsAlerta} cortos o menos restantes`
        : 'Cargando resumen del bar…',
      icon: AlertTriangle
    }
  ];

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1'>
      {stats.map((stat, index) => (
        <MetricCard
          key={stat.title}
          label={stat.title}
          badge={stat.label}
          value={stat.value}
          icon={<stat.icon className='size-4' aria-hidden='true' />}
          tone={index === 0 ? 'emerald' : index === 1 ? 'purple' : 'amber'}
          className='relative min-w-0'
          footer={
            <>
              <p>{stat.detail}</p>
              {stat.onOpen && (
                <Button
                  variant='unstyled'
                  type='button'
                  className='absolute inset-0 rounded-3xl bg-transparent! focus-visible:outline-2 focus-visible:outline-primary'
                  onClick={stat.onOpen}
                  aria-label={stat.overlayLabel}
                />
              )}
            </>
          }
        />
      ))}
      <Dialog open={detalleAbierto} onOpenChange={setDetalleAbierto}>
        <DialogContent className='flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl'>
          <DialogHeader className='shrink-0 border-b px-5 py-5 sm:px-6'>
            <DialogTitle>Mililitros disponibles por botella</DialogTitle>
            <DialogDescription>
              Contenido disponible por producto y presentación. Los cortos se calculan según su
              configuración.
            </DialogDescription>
          </DialogHeader>
          <div className='min-h-0 flex-1 divide-y divide-border overflow-y-auto px-5 sm:px-6'>
            {botellasAbiertas.length === 0 ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>
                No hay botellas abiertas con contenido.
              </p>
            ) : (
              botellasAbiertas.map(botella => (
                <div
                  key={botella.id}
                  className='-mx-5 flex items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-muted/50 sm:-mx-6 sm:px-6'
                >
                  <SaleProductPhoto
                    foto={botella.foto ?? undefined}
                    name={botella.producto_nombre}
                    large={false}
                    compact
                  />
                  <div className='grid min-w-0 flex-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4'>
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold leading-snug'>
                        {botella.producto_nombre}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {botella.presentacion_nombre} · {botella.cantidad}{' '}
                        {botella.cantidad === 1 ? 'botella abierta' : 'botellas abiertas'}
                      </p>
                    </div>
                    <dl
                      className={`grid gap-x-4 ${botella.venta_corto_habilitada ? 'grid-cols-3' : 'grid-cols-1'}`}
                    >
                      <div>
                        <dt className='text-[11px] text-muted-foreground'>Disponible</dt>
                        <dd className='text-base font-semibold tabular-nums text-purple-700 dark:text-purple-300'>
                          {botella.ml_disponibles} ml
                        </dd>
                      </div>
                      {botella.venta_corto_habilitada && (
                        <>
                          <div>
                            <dt className='text-[11px] text-muted-foreground'>
                              Cliente · {botella.ml_cliente} ml
                            </dt>
                            <dd className='text-base font-semibold tabular-nums'>
                              {botella.shots_disponibles} cortos
                            </dd>
                          </div>
                          <div>
                            <dt className='text-[11px] text-muted-foreground'>
                              Anfitriona · {botella.ml_anfitriona} ml
                            </dt>
                            <dd className='text-base font-semibold tabular-nums'>
                              {botella.shots_anfitriona_disponibles} cortos
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={cortosAbierto} onOpenChange={setCortosAbierto}>
        <DialogContent className='flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl'>
          <DialogHeader className='shrink-0 border-b px-5 py-5 sm:px-6'>
            <DialogTitle>Cortos servidos hoy</DialogTitle>
            <DialogDescription>
              {resumen
                ? `${resumen.shotsServidosHoy} ${
                    resumen.shotsServidosHoy === 1 ? 'corto vendido' : 'cortos vendidos'
                  }${
                    resumen.mlColacionHoy > 0 ? ` y ${resumen.mlColacionHoy} ml de colaciones` : ''
                  } hoy.`
                : 'Detalle de los cortos y las colaciones de hoy.'}
            </DialogDescription>
            {totalCortosHoy > 0 && (
              <dl className='mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4'>
                <div>
                  <dt className='text-[11px] text-muted-foreground'>Cobrado en cortos</dt>
                  <dd className='text-sm font-semibold tabular-nums'>
                    {formatCurrencyCLP(cobradoCortos)}
                  </dd>
                </div>
                <div>
                  <dt className='text-[11px] text-muted-foreground'>Anfitriona / Cliente</dt>
                  <dd className='text-sm font-semibold tabular-nums'>
                    {cortosAnfitriona} / {totalCortosHoy - cortosAnfitriona} {pluralCortos}
                  </dd>
                </div>
                <div>
                  <dt className='text-[11px] text-muted-foreground'>Con acompañamiento</dt>
                  <dd className='text-sm font-semibold tabular-nums'>
                    {cortosConAcompanamiento} de {totalCortosHoy} {pluralCortos}
                  </dd>
                </div>
                <div>
                  <dt className='text-[11px] text-muted-foreground'>Servido en cortos</dt>
                  <dd className='text-sm font-semibold tabular-nums'>{mlCortosHoy} ml</dd>
                </div>
              </dl>
            )}
          </DialogHeader>
          <div className='min-h-0 flex-1 overflow-y-auto px-5 sm:px-6'>
            <h3 className='pb-2 pt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              Cortos vendidos
            </h3>
            <div className='divide-y divide-border'>
              {tickets.length === 0 ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  Todavía no se vendieron cortos hoy.
                </p>
              ) : (
                tickets.map(cortos => {
                  // La línea más antigua es la que abrió la venta.
                  const venta = cortos[cortos.length - 1];
                  const totalUnidades = cortos.reduce((total, corto) => total + corto.cantidad, 0);
                  const totalVenta = cortos.reduce((total, corto) => total + corto.subtotal, 0);
                  const totalMl = cortos.reduce((total, corto) => total + corto.ml, 0);
                  const detallesVenta = [
                    venta.cliente_nombre ? `Cliente ${venta.cliente_nombre}` : null,
                    venta.mesero_nombre ? `Mesero ${venta.mesero_nombre}` : null,
                    venta.vendido_por ? `Registró ${venta.vendido_por}` : null,
                    venta.metodo_pago
                  ].filter((detalle): detalle is string => Boolean(detalle));
                  return (
                    <section
                      key={venta.venta_id}
                      className='-mx-5 px-5 py-4 transition-colors duration-200 hover:bg-muted/50 sm:-mx-6 sm:px-6'
                    >
                      <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                        <p className='text-sm font-semibold leading-snug'>
                          Venta {venta.venta_codigo} · {horaDe(venta.fecha)}
                        </p>
                        <p className='text-sm font-semibold tabular-nums'>
                          {totalUnidades} {totalUnidades === 1 ? 'corto' : 'cortos'} · {totalMl} ml
                          · {formatCurrencyCLP(totalVenta)}
                        </p>
                      </div>
                      <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
                        <span className='rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                          {etiquetaOrigen(venta)}
                        </span>
                        {detallesVenta.length > 0 && (
                          <span className='text-xs text-muted-foreground'>
                            {detallesVenta.join(' · ')}
                          </span>
                        )}
                      </div>
                      <div className='mt-3 space-y-3 border-l-2 border-border pl-3 sm:pl-4'>
                        {cortos.map(corto => (
                          <div key={corto.id} className='flex gap-3'>
                            <SaleProductPhoto
                              foto={corto.producto_foto ?? undefined}
                              name={corto.producto_nombre}
                              large={false}
                              compact
                            />
                            <div className='min-w-0 flex-1 space-y-1.5'>
                              <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                                <p className='min-w-0 text-sm font-semibold leading-snug'>
                                  {corto.producto_nombre}
                                  {corto.presentacion_nombre && (
                                    <span className='font-normal text-muted-foreground'>
                                      {' '}
                                      · {corto.presentacion_nombre}
                                    </span>
                                  )}
                                </p>
                                <p className='text-sm font-semibold tabular-nums'>
                                  {formatCurrencyCLP(corto.subtotal)}
                                </p>
                              </div>
                              <p className='text-xs text-muted-foreground'>
                                {corto.cantidad} {corto.cantidad === 1 ? 'corto' : 'cortos'} ·{' '}
                                {corto.ml} ml · {formatCurrencyCLP(corto.precio)} c/u
                                {corto.comision > 0
                                  ? ` · Comisión ${formatCurrencyCLP(corto.comision)}`
                                  : ' · Sin comisión'}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {detalleAcompanamiento(corto)}
                              </p>
                              <div className='flex flex-wrap items-center gap-1.5'>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    corto.anfitriona
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {corto.anfitriona
                                    ? `Anfitriona${corto.anfitriona_nombre ? ` · ${corto.anfitriona_nombre}` : ''}`
                                    : 'Cliente'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
            <h3 className='border-t pb-2 pt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              Colaciones
              {resumen && resumen.mlColacionHoy > 0 ? ` · ${resumen.mlColacionHoy} ml` : ''}
            </h3>
            <div className='divide-y divide-border'>
              {colacionesHoy.length === 0 ? (
                <p className='py-6 text-center text-sm text-muted-foreground'>
                  No hay colaciones servidas hoy.
                </p>
              ) : (
                colacionesHoy.map(colacion => (
                  <div
                    key={colacion.id}
                    className='-mx-5 flex gap-3 px-5 py-4 transition-colors duration-200 hover:bg-muted/50 sm:-mx-6 sm:px-6'
                  >
                    <SaleProductPhoto
                      foto={colacion.producto_foto ?? undefined}
                      name={colacion.producto_nombre}
                      large={false}
                      compact
                    />
                    <div className='min-w-0 flex-1 space-y-1'>
                      <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                        <p className='min-w-0 text-sm font-semibold leading-snug'>
                          {colacion.producto_nombre}
                          {colacion.presentacion_nombre && (
                            <span className='font-normal text-muted-foreground'>
                              {' '}
                              · {colacion.presentacion_nombre}
                            </span>
                          )}
                        </p>
                        <p className='text-sm font-semibold tabular-nums'>{colacion.ml} ml</p>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Registró {colacion.registrado_por ?? '—'} · {horaDe(colacion.fecha)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
