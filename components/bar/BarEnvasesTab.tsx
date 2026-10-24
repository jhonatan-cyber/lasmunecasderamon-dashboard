'use client';

import { ProductImageLightbox } from '@/components/products/ProductImageLightbox';
import { EscaneoLote } from '@/components/products/EscaneoLote';
import { MOTIVO_ENVASE } from '@/hooks/products/useContainerScan';
import type { EscaneoEnvase } from '@/hooks/products/useContainerScan';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils/utils';
import type {
  DevolucionEnvaseRegistro,
  DevolucionEnvaseResultado
} from '@/modules/inventario/contracts';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AlertTriangle, PackageCheck } from 'lucide-react';

interface BarEnvasesTabProps {
  containersError: boolean;
  onRetry: () => void;
  resultado: DevolucionEnvaseResultado | null;
  entregadosSesion: number;
  rechazadosSesion: number;
  envasesEnCola: number;
  sesion: EscaneoEnvase[];
  sincronizando: boolean;
  avisoSonoro: boolean;
  onAlternarSonido: () => void;
  onLimpiar: () => void;
  onReintentar: () => void;
  devoluciones: DevolucionEnvaseRegistro[];
  loadingDevol: boolean;
}

export function BarEnvasesTab({
  containersError,
  onRetry,
  resultado,
  entregadosSesion,
  rechazadosSesion,
  envasesEnCola,
  sesion,
  sincronizando,
  avisoSonoro,
  onAlternarSonido,
  onLimpiar,
  onReintentar,
  devoluciones,
  loadingDevol
}: BarEnvasesTabProps) {
  if (containersError) {
    return <ListLoadError message='No se pudo cargar el historial de envases.' onRetry={onRetry} />;
  }

  return (
    <PermissionGuard
      module='products'
      action='return_container'
      fallback={
        <div className='text-center text-gray-500 text-sm sm:text-base py-8'>
          No tienes permiso para verificar la entrega de envases.
        </div>
      }
    >
      <div className='space-y-4'>
        {resultado && (
          <div
            className={cn(
              'p-4 rounded-2xl border text-sm',
              resultado.ok
                ? 'bg-green-50 border-green-200 text-green-800'
                : resultado.motivo === 'ya_devuelto'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
            )}
            role='status'
          >
            <p className='font-bold flex items-center gap-2'>
              {resultado.ok ? (
                <>
                  <PackageCheck className='w-4 h-4' />
                  Envase entregado a la bodega
                </>
              ) : (
                <>
                  <AlertTriangle className='w-4 h-4' />
                  {MOTIVO_ENVASE[resultado.motivo] ?? 'No es nuestro'}
                </>
              )}
            </p>
            <p className='mt-1'>{resultado.mensaje}</p>
            {resultado.unidad && (
              <p className='text-xs mt-1 font-mono'>
                {resultado.unidad.producto_nombre || '—'} ·{' '}
                {resultado.unidad.presentacion_nombre || '—'} · SKU {resultado.unidad.codigo}
              </p>
            )}
          </div>
        )}

        <EscaneoLote
          aceptados={entregadosSesion}
          rechazados={rechazadosSesion}
          enCola={envasesEnCola}
          sesion={sesion}
          sincronizando={sincronizando}
          sonido={avisoSonoro}
          onAlternarSonido={onAlternarSonido}
          onLimpiar={onLimpiar}
          onReintentar={onReintentar}
          etiquetaAceptado='Entregado'
          tituloAceptados='Entregados a la bodega'
          mostrarContadores={false}
          mostrarLimpiar={false}
          mostrarAvisoSonoro={false}
        />

        <div>
          <p className='text-xs font-medium text-muted-foreground mb-2'>
            Devoluciones registradas ({devoluciones.length})
          </p>
          <BoneyardSkeleton name='bar-containers' loading={loadingDevol}>
            <div className='overflow-hidden rounded-3xl border bg-card'>
              <div className='overflow-x-auto'>
                <Table className='min-w-full text-center'>
                  <TableHeader>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead>Fecha</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Presentación</TableHead>
                      <TableHead>Compra</TableHead>
                      <TableHead>Merma</TableHead>
                      <TableHead>Entregado por</TableHead>
                      <TableHead>Recepción en bodega</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devoluciones.length === 0 ? (
                      <TableRow key='empty'>
                        <TableCell colSpan={8} className='text-center text-muted-foreground'>
                          {loadingDevol ? 'Cargando...' : 'Sin envases entregados todavía.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      devoluciones.map(d => (
                        <TableRow
                          key={d.id}
                          className='border-b transition-colors hover:bg-muted/50'
                        >
                          <TableCell className='sm:px-4 text-center sm:text-sm whitespace-nowrap'>
                            {d.fecha_devolucion
                              ? (() => {
                                  const f = new Date(d.fecha_devolucion);
                                  return (
                                    <span>
                                      {f.toLocaleDateString('es-CL', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                      })}
                                      <br />
                                      <span className='text-gray-400'>
                                        {f.toLocaleTimeString('es-CL', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </span>
                                  );
                                })()
                              : '—'}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                            {d.codigo}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center sm:text-sm font-medium'>
                            {d.producto_nombre || '—'}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center sm:text-sm'>
                            {d.presentacion_nombre || '—'}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                            {d.compra_folio || '—'}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                            {Number(d.ml_merma ?? 0)} ml
                          </TableCell>
                          <TableCell className='sm:px-4 text-center sm:text-sm'>
                            {d.usuario_nombre || d.usuario_nick
                              ? `${d.usuario_nombre || ''} ${d.usuario_apellido || ''}`.trim() ||
                                d.usuario_nick
                              : '—'}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center sm:text-sm'>
                            {d.pendiente_confirmacion ? (
                              <Badge className='bg-amber-100 text-amber-700 rounded-full px-2 sm:px-3 py-1 text-xs'>
                                Pendiente de bodega
                              </Badge>
                            ) : (
                              <>
                                <Badge className='bg-green-100 text-green-700 rounded-full px-2 sm:px-3 py-1 text-xs'>
                                  Recibido
                                </Badge>
                                <p className='mt-1 text-[10px] text-gray-500'>
                                  {d.confirmado_nombre || d.confirmado_nick || '—'}
                                  {d.fecha_confirmacion
                                    ? ` · ${new Date(d.fecha_confirmacion).toLocaleString('es-CL', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}`
                                    : ''}
                                </p>
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
        </div>
      </div>
    </PermissionGuard>
  );
}
