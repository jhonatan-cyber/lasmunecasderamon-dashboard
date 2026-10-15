'use client';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';

import type { TransferRecord } from '@/types/transfer';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';

function Prices({ rows }: { rows: { label: string; precio: number; comision: number }[] }) {
  return (
    <Table className='w-full'>
      <TableHeader className='border-b text-xs text-muted-foreground'>
        <TableRow>
          <TableHead className='text-left font-medium'>Opción</TableHead>
          <TableHead className='text-right font-medium'>Precio</TableHead>
          <TableHead className='text-right font-medium'>Comisión</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className='divide-y'>
        {rows.map(row => (
          <TableRow key={row.label}>
            <TableHead className='pr-2 text-left font-medium'>{row.label}</TableHead>
            <TableCell className='text-right font-semibold tabular-nums'>
              {formatCurrencyCLP(row.precio)}
            </TableCell>
            <TableCell className='pl-3 text-right tabular-nums text-muted-foreground'>
              {formatCurrencyCLP(row.comision)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Measure({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-1 text-sm font-medium'>{value}</dd>
    </div>
  );
}

export function TransferSaleDetails({ record }: { record: TransferRecord }) {
  const options = record.opciones_venta?.length
    ? record.opciones_venta
    : [{ tipo: 'botella' as const, precio: record.precio_venta, comision: record.comision }];
  return (
    <section className='space-y-5' aria-label='Detalle de venta enviado'>
      {options.map(option => (
        <section key={option.tipo} className='min-w-0 space-y-4 rounded-2xl border p-4 sm:p-5'>
          <h3 className='text-base font-semibold'>
            {option.tipo === 'botella' ? 'Venta por botella' : 'Venta por corto'}
          </h3>
          {option.tipo === 'botella' ? (
            <>
              <Prices
                rows={[{ label: 'Botella', precio: option.precio, comision: option.comision ?? 0 }]}
              />
              <dl className='grid grid-cols-2 gap-4 rounded-xl bg-muted/40 p-3'>
                <Measure
                  label='Máximo de anfitrionas'
                  value={Number(option.comision) > 0 ? record.max_anfitrionas || 1 : 0}
                />
                <Measure
                  label='Bebida'
                  value={
                    option.acompanamiento
                      ? `${option.acompanamiento.unidades} unidades por botella`
                      : 'Sin bebida'
                  }
                />
              </dl>
              {option.acompanamiento && (
                <p className='text-xs text-muted-foreground'>
                  {option.acompanamiento.tipo || 'La bebida se elige al vender.'}
                </p>
              )}
              {Number(option.comision) > 0 &&
                (record.tiers ?? []).some(
                  row => row.anfitrionas <= (record.max_anfitrionas || 1)
                ) && (
                  <Prices
                    rows={(record.tiers ?? [])
                      .filter(row => row.anfitrionas <= (record.max_anfitrionas || 1))
                      .map(row => ({
                        label: `${row.anfitrionas} anfitrionas`,
                        precio: row.precio,
                        comision: row.comision
                      }))}
                  />
                )}
            </>
          ) : (
            <>
              <div className='grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
                <section className='min-w-0 space-y-3'>
                  <h4 className='text-sm font-semibold'>Cliente</h4>
                  <div className='rounded-xl bg-muted/40 p-3'>
                    <p className='text-lg font-semibold tabular-nums'>
                      {formatCurrencyCLP(option.precio)}
                    </p>
                    <p className='mt-1 text-xs text-muted-foreground'>Sin comisión</p>
                  </div>
                  <dl className='grid grid-cols-2 gap-3 sm:grid-cols-1'>
                    <Measure
                      label='Ml corto cliente'
                      value={record.ml_shot ? `${record.ml_shot} ml` : 'No especificados'}
                    />
                    <Measure label='Bebida cliente' value='Producto completo' />
                  </dl>
                </section>
                <section className='min-w-0 space-y-3 sm:border-l sm:pl-5'>
                  <h4 className='text-sm font-semibold'>Anfitriona</h4>
                  <Prices
                    rows={(preciosCortoAnfitriona(option).length
                      ? preciosCortoAnfitriona(option)
                      : [
                          {
                            precio: option.precio_anfitriona || option.precio,
                            comision: option.comision ?? 0
                          }
                        ]
                    ).map((row, index) => ({ ...row, label: `Corto anfitriona ${index + 1}` }))}
                  />
                  <dl className='grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3'>
                    <Measure
                      label='Ml corto anfitriona'
                      value={
                        record.ml_shot_anfitriona || record.ml_shot
                          ? `${record.ml_shot_anfitriona ?? record.ml_shot} ml`
                          : 'No especificados'
                      }
                    />
                    <Measure
                      label='Bebida anfitriona'
                      value={`${option.ml_acompanamiento_anfitriona ?? 0} ml`}
                    />
                  </dl>
                </section>
              </div>
            </>
          )}
        </section>
      ))}
    </section>
  );
}
