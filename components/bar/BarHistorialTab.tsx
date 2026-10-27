'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { BarAnfitrionas, isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { SalePrices } from '@/components/bar/SalePrices';
import { ListLoadError } from '@/components/shared/ListLoadError';
import Paginate from '@/components/shared/Paginate';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';

export interface Movimiento {
  estado?: string;
  aceptado_nombre?: string | null;
  fecha_aceptacion?: string | null;
  opciones_venta?: import('@/types/sale-options').SaleOption[];
  producto_id: string;
  categoria_nombre?: string | null;
  id: string;
  tipo: string;
  cantidad: number;
  /** Ml servidos por shots en una venta (null = solo botellas). */
  ml?: number | null;
  /** Ml por shot del producto; null/undefined = valor global de Configuraciones. */
  ml_shot?: number | null;
  /** Ml por shot a anfitriona; null/undefined = igual que a cliente. */
  ml_shot_anfitriona?: number | null;
  precio_venta: number | null;
  comision: number | null;
  fecha_crea: string;
  producto_nombre: string | null;
  presentacion_nombre: string | null;
  usuario_nombre: string | null;
  usuario_apellido: string | null;
  usuario_nick: string | null;
  /** Botellas que tocó una colación y los ml que salieron de cada una. */
  unidades_consumidas?: {
    unidad_id: string;
    codigo: string;
    codigo_barras: string | null;
    ml_consumido: number;
  }[];
}

interface HistorialMeta {
  total: number;
  pagina: number;
  paginas: number;
  limite: number;
}

interface BarHistorialTabProps {
  movementsError: boolean;
  onRetry: () => void;
  loading: boolean;
  movimientos: Movimiento[];
  hayFiltro: boolean;
  meta: HistorialMeta | null;
  page: number;
  onPageChange: (page: number) => void;
}

export function BarHistorialTab({
  movementsError,
  onRetry,
  loading,
  movimientos,
  hayFiltro,
  meta,
  page,
  onPageChange
}: BarHistorialTabProps) {
  if (movementsError) {
    return (
      <ListLoadError message='No se pudo cargar el historial de movimientos.' onRetry={onRetry} />
    );
  }

  return (
    <>
      <BoneyardSkeleton name='bar-history' loading={loading}>
        <div className='overflow-hidden rounded-3xl border bg-card'>
          <div className='overflow-x-auto'>
            <Table className='min-w-full text-center'>
              <TableHeader>
                <TableRow className='hover:bg-transparent'>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio venta</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Recepción / resolución</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow key='empty'>
                    <TableCell colSpan={10} className='text-center text-muted-foreground'>
                      <EmptyState
                        variant='text'
                        title={
                          loading
                            ? 'Cargando...'
                            : hayFiltro
                              ? 'Sin movimientos que coincidan con el filtro.'
                              : 'Sin movimientos registrados.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  movimientos.map(m => (
                    <TableRow key={m.id} className='border-b transition-colors hover:bg-muted/50'>
                      <TableCell className='sm:px-4 text-center sm:text-sm whitespace-nowrap'>
                        {m.fecha_crea
                          ? (() => {
                              const f = new Date(m.fecha_crea);
                              const fecha = f.toLocaleDateString('es-CL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              });
                              const hora = f.toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                              return (
                                <span>
                                  {fecha}
                                  <br />
                                  <span className='text-gray-400'>{hora}</span>
                                </span>
                              );
                            })()
                          : '—'}
                      </TableCell>
                      <TableCell className='sm:px-4 text-center sm:text-sm font-medium'>
                        {m.producto_nombre || '—'}
                        {(m.unidades_consumidas?.length ?? 0) > 0 ? (
                          <ul className='mt-1 space-y-0.5 text-[11px] font-normal text-muted-foreground'>
                            {(m.unidades_consumidas ?? []).map(unidad => (
                              <li key={unidad.unidad_id} className='tabular-nums'>
                                {unidad.codigo || 'Sin código'}: {unidad.ml_consumido} ml
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </TableCell>
                      <TableCell className='sm:px-4 text-center sm:text-sm'>
                        {m.presentacion_nombre || '—'}
                      </TableCell>
                      <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                        {m.tipo === 'colacion' ? (
                          <>
                            {Number(m.ml ?? 0) > 0 && (
                              <p className='text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                {Number(m.ml)} ml
                              </p>
                            )}
                            {Number(m.cantidad ?? 0) > 0 && (
                              <p className='text-[10px] uppercase text-muted-foreground'>
                                {m.cantidad} un.
                              </p>
                            )}
                            {Number(m.ml ?? 0) === 0 && Number(m.cantidad ?? 0) === 0 && '—'}
                          </>
                        ) : (
                          <>
                            {m.cantidad}
                            {Number(m.ml ?? 0) > 0 && (
                              <p className='text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                {Number(m.ml)} ml
                              </p>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                        {isTierPricedItem(m) ? (
                          <BarAnfitrionas
                            productoId={m.producto_id}
                            categoriaNombre={m.categoria_nombre}
                            precio={m.precio_venta}
                            compact
                          />
                        ) : m.opciones_venta ? (
                          <SalePrices
                            options={m.opciones_venta}
                            field='precio'
                            mlShot={m.ml_shot}
                            mlShotAnfitriona={m.ml_shot_anfitriona}
                          />
                        ) : m.precio_venta !== null && m.precio_venta !== undefined ? (
                          formatCurrencyCLP(Number(m.precio_venta))
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                        {isTierPricedItem(m) ? (
                          <span className='text-muted-foreground'>Según tabla</span>
                        ) : m.opciones_venta ? (
                          <SalePrices
                            options={m.opciones_venta}
                            field='comision'
                            mlShot={m.ml_shot}
                            mlShotAnfitriona={m.ml_shot_anfitriona}
                          />
                        ) : m.comision !== null && m.comision !== undefined ? (
                          formatCurrencyCLP(Number(m.comision))
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className='sm:px-4 text-center sm:text-sm font-mono'>
                        {m.usuario_nombre || m.usuario_nick || '—'}
                      </TableCell>
                      <TableCell>
                        {m.tipo === 'colacion'
                          ? 'Colación'
                          : m.tipo === 'venta'
                            ? 'Vendida'
                            : m.estado === 'aceptada'
                              ? 'Aceptada'
                              : m.estado === 'pendiente'
                                ? 'Pendiente'
                                : m.estado === 'rechazada'
                                  ? 'Rechazada'
                                  : 'Histórica'}
                      </TableCell>
                      <TableCell>
                        {m.tipo === 'venta' || m.tipo === 'colacion' ? (
                          <span className='text-muted-foreground'>—</span>
                        ) : (
                          <>
                            <span>{m.aceptado_nombre || 'Sin recepción registrada'}</span>
                            {m.fecha_aceptacion && (
                              <p className='text-xs text-muted-foreground'>
                                {m.fecha_aceptacion.replace('T', ' ').slice(0, 16)}
                              </p>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </BoneyardSkeleton>
      {meta && meta.total > 0 && (
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <p role='status' className='text-sm text-muted-foreground'>
            {meta.total} {meta.total === 1 ? 'movimiento' : 'movimientos'}
            {hayFiltro ? ` · ${movimientos.length} en esta página` : ''}
          </p>
          <Paginate page={page} totalPages={meta.paginas} setPage={onPageChange} />
        </div>
      )}
    </>
  );
}
