'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SalePrices } from '@/components/bar/SalePrices';
import { BarAnfitrionas, isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import type { TransferRecord } from '@/types/transfer';

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='space-y-3'>
      <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
        {title}
      </h3>
      {children}
    </section>
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
  return (
    <Dialog open={record !== null} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[92dvh] w-[calc(100vw_-_2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 [&>button]:top-2 [&>button]:right-2 [&>button]:flex [&>button]:h-10 [&>button]:w-10 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button:hover]:bg-accent'>
        {record && (
          <>
            <DialogHeader className='shrink-0 gap-1 border-b px-5 py-4 pr-14 text-left sm:px-6'>
              <DialogTitle className='text-lg font-bold'>Detalle de transferencia</DialogTitle>
              <DialogDescription className='truncate'>
                {record.producto_nombre} · {record.presentacion_nombre}
              </DialogDescription>
            </DialogHeader>
            <div className='min-h-0 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6'>
              <Section title='Datos de la transferencia'>
                <dl className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
                  <Field label='Producto'>{record.producto_nombre}</Field>
                  <Field label='Presentación'>{record.presentacion_nombre}</Field>
                  <Field label='Categoría'>{record.categoria_nombre || 'Sin categoría'}</Field>
                  <Field label='Cantidad'>{record.cantidad}</Field>
                  <Field label='Estado'>
                    <Badge
                      variant={record.estado === 'aceptada' ? 'default' : 'secondary'}
                      className='whitespace-nowrap'
                    >
                      {estadoLabel(record.estado)}
                    </Badge>
                  </Field>
                  <Field label='Solicitada por'>{record.usuario_nombre}</Field>
                  <Field label='Fecha de solicitud'>{formatFecha(record.fecha_crea)}</Field>
                </dl>
              </Section>

              <Section title='Resolución'>
                <dl className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
                  <Field label='Recibida por'>
                    {record.aceptado_nombre || 'Sin recepción registrada'}
                  </Field>
                  <Field label='Fecha de recepción'>{formatFecha(record.fecha_aceptacion)}</Field>
                </dl>
              </Section>

              <Section title='Venta configurada'>
                <dl className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
                  <Field label='Precio de venta'>{formatCurrencyCLP(record.precio_venta)}</Field>
                  <Field label='Comisión'>{formatCurrencyCLP(record.comision)}</Field>
                </dl>
                <div className='rounded-xl border bg-muted/30 p-3'>
                  <p className='mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                    Tipos de venta
                  </p>
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
                </div>
              </Section>

              <Section title='Parámetros de servicio'>
                <dl className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
                  <Field label='ml por shot (cliente)'>
                    {record.ml_shot != null ? `${record.ml_shot} ml` : 'Según configuración'}
                  </Field>
                  <Field label='ml por shot (anfitriona)'>
                    {record.ml_shot_anfitriona != null
                      ? `${record.ml_shot_anfitriona} ml`
                      : 'Igual que cliente'}
                  </Field>
                  <Field label='Máx. anfitrionas'>{record.max_anfitrionas ?? '—'}</Field>
                  <Field label='ml por botella'>
                    {record.ml_botella != null ? `${record.ml_botella} ml` : 'Según configuración'}
                  </Field>
                </dl>
              </Section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
