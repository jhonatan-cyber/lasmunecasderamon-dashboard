'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SalePrices } from '@/components/bar/SalePrices';
import { BarAnfitrionas, isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { cn } from '@/lib/utils/utils';
import type { TransferRecord } from '@/types/transfer';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import {
  ArrowLeftRight,
  CalendarClock,
  CircleCheck,
  Package,
  ReceiptText,
  SlidersHorizontal,
  UserRound,
  type LucideIcon
} from 'lucide-react';

/** Etiqueta legible del estado de una transferencia. */
export function estadoLabel(estado: TransferRecord['estado']): string {
  switch (estado) {
    case 'aceptada':
      return 'Aprobada';
    case 'rechazada':
      return 'Rechazada';
    case 'pendiente':
      return 'Pendiente';
    case 'historica':
      return 'Histórica';
    default:
      return estado;
  }
}

function estadoBadgeClass(estado: TransferRecord['estado']): string {
  switch (estado) {
    case 'aceptada':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'rechazada':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300';
    case 'pendiente':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300';
  }
}

function formatFecha(value?: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 16) : '—';
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='min-w-0'>
      <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </dt>
      <dd className='mt-0.5 break-words text-sm font-medium'>{children}</dd>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className='rounded-xl border bg-card p-3 sm:p-5'>
      <div className='mb-3 flex items-center gap-2'>
        <Icon className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
        <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function TimelineBlock({
  icon: Icon,
  title,
  person,
  date
}: {
  icon: LucideIcon;
  title: string;
  person: string;
  date: string;
}) {
  return (
    <div className='min-w-0'>
      <div className='flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        <Icon className='h-3.5 w-3.5' aria-hidden='true' />
        {title}
      </div>
      <p className='mt-1 break-words text-sm font-semibold'>{person}</p>
      <p className='text-xs text-muted-foreground'>{date}</p>
    </div>
  );
}

interface TransferHistoryDetailModalProps {
  record: TransferRecord | null;
  onOpenChange: (open: boolean) => void;
}

export function TransferHistoryDetailModal({
  record,
  onOpenChange
}: TransferHistoryDetailModalProps) {
  const opcionCorto = parseSavedOptions(record?.opciones_venta)?.find(
    option => option.tipo === 'shot'
  );
  // Sin venta por cortos en el traspaso no se muestran ml por shot: no describen
  // nada de lo que el barman va a servir.
  const vendeCortos =
    !!opcionCorto &&
    (Number(opcionCorto.precio) > 0 || preciosCortoAnfitriona(opcionCorto).length > 0);
  return (
    <Dialog open={record !== null} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[92dvh] w-[calc(100vw_-_1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 [&>button]:top-2 [&>button]:right-2 [&>button]:flex [&>button]:h-10 [&>button]:w-10 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button:hover]:bg-accent'>
        {record && (
          <>
            <DialogHeader className='shrink-0 gap-0 border-b px-4 py-4 pr-14 text-left sm:px-6'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 sm:flex'>
                  <ArrowLeftRight className='h-5 w-5' aria-hidden='true' />
                </div>
                <div className='min-w-0'>
                  <DialogTitle className='text-base font-bold sm:text-lg'>
                    Detalle de transferencia
                  </DialogTitle>
                  <DialogDescription className='truncate text-sm'>
                    {record.producto_nombre} · {record.presentacion_nombre}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-muted/20 p-3 sm:p-6'>
              <Section icon={Package} title='Resumen'>
                <div className='mb-4 flex flex-wrap items-center gap-2'>
                  <Badge
                    variant='outline'
                    className={cn(
                      'whitespace-nowrap px-2.5 py-0.5',
                      estadoBadgeClass(record.estado)
                    )}
                  >
                    {estadoLabel(record.estado)}
                  </Badge>
                </div>
                <dl className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                  <Field label='Producto'>{record.producto_nombre}</Field>
                  <Field label='Presentación'>{record.presentacion_nombre}</Field>
                  <Field label='Cantidad'>{record.cantidad}</Field>
                  <Field label='Categoría'>{record.categoria_nombre || 'Sin categoría'}</Field>
                </dl>
              </Section>

              <Section icon={CalendarClock} title='Trazabilidad'>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <TimelineBlock
                    icon={UserRound}
                    title='Solicitud'
                    person={record.usuario_nombre}
                    date={formatFecha(record.fecha_crea)}
                  />
                  <TimelineBlock
                    icon={CircleCheck}
                    title='Recepción'
                    person={record.aceptado_nombre || 'Sin recepción registrada'}
                    date={formatFecha(record.fecha_aceptacion)}
                  />
                </div>
              </Section>

              <Section icon={ReceiptText} title='Venta configurada'>
                <div className='text-sm'>
                  {isTierPricedItem({
                    categoria_nombre: record.categoria_nombre,
                    opciones_venta: record.opciones_venta,
                    precio_venta: record.precio_venta
                  }) ? (
                    <BarAnfitrionas
                      productoId={record.producto_id}
                      categoriaNombre={record.categoria_nombre}
                      precio={record.precio_venta}
                    />
                  ) : (
                    <SalePrices
                      options={record.opciones_venta}
                      price={record.precio_venta}
                      commission={record.comision}
                      mlShot={record.ml_shot}
                      mlShotAnfitriona={record.ml_shot_anfitriona}
                    />
                  )}
                </div>
              </Section>

              <Section icon={SlidersHorizontal} title='Parámetros de servicio'>
                <dl className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {vendeCortos && (
                    <>
                      <Field label='ml por shot (cliente)'>
                        {record.ml_shot != null ? `${record.ml_shot} ml` : 'Según configuración'}
                      </Field>
                      <Field label='ml por shot (anfitriona)'>
                        {record.ml_shot_anfitriona != null
                          ? `${record.ml_shot_anfitriona} ml`
                          : 'Igual que cliente'}
                      </Field>
                    </>
                  )}
                  <Field label='Máx. anfitrionas'>{record.max_anfitrionas ?? '—'}</Field>
                  <Field label='ml por botella'>
                    {record.ml_botella != null ? `${record.ml_botella} ml` : 'Según configuración'}
                  </Field>
                </dl>
              </Section>
            </div>

            <DialogFooter className='shrink-0 border-t bg-background px-4 py-3 sm:px-6 sm:py-4'>
              <Button
                type='button'
                variant='outline'
                className='w-full rounded-full px-8 py-2 transition-all duration-200 hover:scale-105 sm:w-auto dark:hover:bg-white dark:hover:text-black'
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
