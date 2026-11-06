'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Eye, Package, Trash2, Warehouse, Wine } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MetricCard } from '@/components/shared/MetricCard';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { VencimientoBadge } from '@/components/products/VencimientoBadge';
import type { LoteVencido, VencidoRetirado } from '@/modules/inventario/contracts';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

export function ExpiredStockPanel({
  origenPredeterminado = 'ambos',
  historialOnly = false
}: {
  origenPredeterminado?: 'almacen' | 'bar' | 'ambos';
  historialOnly?: boolean;
}) {
  const [lotes, setLotes] = useState<LoteVencido[]>([]);
  const [retirados, setRetirados] = useState<VencidoRetirado[]>([]);
  const [origen, setOrigen] = useState<'almacen' | 'bar' | 'ambos'>(origenPredeterminado);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<LoteVencido | null>(null);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<VencidoRetirado[] | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      if (historialOnly) {
        const resRetirados = await fetch('/api/products/expired?historial=1', {
          cache: 'no-store'
        });
        const bodyRetirados = await resRetirados.json().catch(() => ({}));
        if (!resRetirados.ok || !bodyRetirados?.success) {
          toast.error(bodyRetirados?.message || 'No se pudo cargar el historial');
          return;
        }
        setRetirados(Array.isArray(bodyRetirados.data) ? bodyRetirados.data : []);
        return;
      }

      const [res, resRetirados] = await Promise.all([
        fetch('/api/products/expired', { cache: 'no-store' }),
        fetch(`/api/products/expired?historial=1${origen === 'ambos' ? '' : `&origen=${origen}`}`, {
          cache: 'no-store'
        })
      ]);
      const body = await res.json().catch(() => ({}));
      const bodyRetirados = await resRetirados.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.message || 'No se pudieron cargar los lotes vencidos');
        return;
      }
      setLotes(Array.isArray(body.data) ? body.data : []);
      if (resRetirados.ok && bodyRetirados?.success) {
        setRetirados(Array.isArray(bodyRetirados.data) ? bodyRetirados.data : []);
      }
    } catch {
      toast.error('No se pudieron cargar los lotes vencidos');
    } finally {
      setLoading(false);
    }
  }, [historialOnly, origen]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useRealtimeRefresh('products', cargar);

  const darDeBaja = async () => {
    if (!confirmando) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/products/expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentacion_id: confirmando.presentacion_id, origen })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.message || 'No se pudo registrar la baja');
        return;
      }
      toast.success(body.message || `${confirmando.unidades_vencidas} botella(s) dadas de baja`);
      setConfirmando(null);
      await cargar();
    } catch {
      toast.error('No se pudo registrar la baja');
    } finally {
      setGuardando(false);
    }
  };

  const totalUnidades = lotes.reduce((total, lote) => total + lote.unidades_vencidas, 0);
  const totalBodega = lotes.reduce((total, lote) => total + lote.unidades_bodega, 0);
  const totalBar = lotes.reduce((total, lote) => total + lote.unidades_bar, 0);
  const totalRetirados = retirados.length;
  const valorRetirado = retirados.reduce(
    (total, registro) => total + Math.max(0, Number(registro.valor_retirado ?? 0)),
    0
  );
  const unidadesDesdeInventario = retirados.filter(
    registro => registro.ubicacion_origen === 'almacen'
  ).length;
  const unidadesDesdeBar = retirados.filter(registro => registro.ubicacion_origen === 'bar').length;
  const presentacionesRetiradas = new Set(
    retirados.map(registro => registro.presentacion_id).filter(Boolean)
  ).size;
  const gruposRetirados = useMemo(() => {
    const grupos = new Map<string, VencidoRetirado[]>();
    retirados.forEach(registro => {
      const clave = `${registro.producto_id ?? registro.producto_nombre}|${registro.presentacion_id ?? registro.presentacion_nombre}`;
      const grupo = grupos.get(clave) ?? [];
      grupo.push(registro);
      grupos.set(clave, grupo);
    });

    return Array.from(grupos.values())
      .map(registros => {
        const ordenados = [...registros].sort((a, b) =>
          String(b.fecha_retiro).localeCompare(String(a.fecha_retiro))
        );
        return {
          registros: ordenados,
          producto_nombre: ordenados[0].producto_nombre,
          presentacion_nombre: ordenados[0].presentacion_nombre,
          unidades: ordenados.length,
          valor: ordenados.reduce(
            (total, registro) => total + Math.max(0, Number(registro.valor_retirado ?? 0)),
            0
          ),
          fecha_retiro: ordenados[0].fecha_retiro,
          fecha_vencimientos: [
            ...new Set(ordenados.map(registro => registro.fecha_vencimiento).filter(Boolean))
          ]
        };
      })
      .sort((a, b) => String(b.fecha_retiro).localeCompare(String(a.fecha_retiro)));
  }, [retirados]);

  return (
    <PermissionGuard
      module='products'
      action='view'
      fallback={
        <div className='p-4 sm:p-6 lg:p-10 text-center text-gray-500 text-sm sm:text-base'>
          No tienes permiso para ver los lotes vencidos.
        </div>
      }
    >
      <TooltipProvider>
        <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
            <div className='min-w-0'>
              <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                <AlertTriangle className='w-6 h-6 text-red-500' />
                {historialOnly ? 'Productos vencidos retirados' : 'Lotes vencidos'}
              </h1>
              <p className='mt-2 text-sm sm:text-base text-gray-600'>
                {historialOnly
                  ? 'Historial de unidades vencidas que ya fueron retiradas del Inventario o Bar.'
                  : 'Botellas que ya no se pueden vender. Darlas de baja las saca del inventario y las registra como merma.'}
              </p>
            </div>
            {origenPredeterminado !== 'bar' && (
              <Button
                asChild
                variant='outline'
                className='rounded-full shrink-0 self-start sm:self-auto'
              >
                <Link href='/products'>
                  <ArrowLeft className='w-4 h-4 mr-1' />
                  Atrás
                </Link>
              </Button>
            )}
          </div>

          {!historialOnly && (
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 dark:bg-slate-900/40'>
              <span className='text-sm font-medium text-muted-foreground'>
                Retirar vencidos desde:
              </span>
              {(['almacen', 'bar', 'ambos'] as const).map(opcion => (
                <Button
                  key={opcion}
                  type='button'
                  size='sm'
                  variant={origen === opcion ? 'default' : 'outline'}
                  className='rounded-full'
                  onClick={() => setOrigen(opcion)}
                >
                  {opcion === 'almacen' ? 'Inventario' : opcion === 'bar' ? 'Bar' : 'Bodega y Bar'}
                </Button>
              ))}
            </div>
          )}

          {historialOnly && (
            <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
              <MetricCard
                tone='red'
                icon={<AlertTriangle className='h-4 w-4 text-red-600' />}
                badge='Retirados'
                label='Unidades'
                value={totalRetirados}
                isLoading={loading}
                footerValue={presentacionesRetiradas}
                footerLabel='presentaciones'
              />
              <MetricCard
                tone='purple'
                icon={<Package className='h-4 w-4 text-purple-600' />}
                badge='Inversión'
                label='Valor retirado'
                value={formatCurrencyCLP(valorRetirado)}
                isLoading={loading}
                footerLabel='precio de adquisición perdido'
              />
              <MetricCard
                tone='blue'
                icon={<Warehouse className='h-4 w-4 text-blue-600' />}
                badge='Origen'
                label='Desde Inventario'
                value={unidadesDesdeInventario}
                isLoading={loading}
                footerLabel='unidades retiradas'
              />
              <MetricCard
                tone='amber'
                icon={<Wine className='h-4 w-4 text-amber-600' />}
                badge='Origen'
                label='Desde Bar'
                value={unidadesDesdeBar}
                isLoading={loading}
                footerLabel='unidades retiradas'
              />
            </div>
          )}

          {!historialOnly && (
            <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
              <MetricCard
                tone='amber'
                icon={<Package className='h-4 w-4 text-amber-600' />}
                badge='Lotes'
                label='Presentaciones'
                value={lotes.length}
                footer={
                  <div className='flex items-center gap-1.5 pt-1'>
                    <span className='text-[10px] text-amber-700/50 font-medium uppercase tracking-tighter italic'>
                      Con stock vencido
                    </span>
                  </div>
                }
              />
              <MetricCard
                tone='red'
                icon={<AlertTriangle className='h-4 w-4 text-red-600' />}
                badge='Vencidas'
                label='Botellas'
                value={totalUnidades}
                footer={
                  <div className='flex items-center gap-1.5 pt-1'>
                    <span className='text-[10px] text-red-700/50 font-medium uppercase tracking-tighter italic'>
                      Bodega y bar
                    </span>
                  </div>
                }
              />
              <MetricCard
                tone='blue'
                icon={<Warehouse className='h-4 w-4 text-blue-600' />}
                badge='Bodega'
                label='En Bodega'
                value={totalBodega}
                footer={
                  <div className='flex items-center gap-1.5 pt-1'>
                    <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
                      Sin trasladar
                    </span>
                  </div>
                }
              />
              <MetricCard
                tone='purple'
                icon={<Wine className='h-4 w-4 text-purple-600' />}
                badge='Bar'
                label='En Bar'
                value={totalBar}
                footer={
                  <div className='flex items-center gap-1.5 pt-1'>
                    <span className='text-[10px] text-purple-700/50 font-medium uppercase tracking-tighter italic'>
                      Bloqueadas para la venta
                    </span>
                  </div>
                }
              />
            </div>
          )}

          {!historialOnly && (
            <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
              <div className='overflow-x-auto'>
                <Table className='min-w-full text-center'>
                  <TableHeader>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead className='text-center'>Producto</TableHead>
                      <TableHead className='text-center'>Presentación</TableHead>
                      <TableHead className='text-center'>Vencimiento</TableHead>
                      <TableHead className='text-center'>Códigos</TableHead>
                      <TableHead className='text-center'>Botellas</TableHead>
                      <TableHead className='text-center'>Bodega</TableHead>
                      <TableHead className='text-center'>Bar</TableHead>
                      <TableHead className='text-center'>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.length === 0 ? (
                      <TableRow key='empty'>
                        <TableCell colSpan={8} className='text-center sm:text-base bg-white'>
                          <EmptyState
                            variant='text'
                            title={loading ? 'Cargando...' : 'No hay lotes vencidos'}
                            description={
                              loading
                                ? undefined
                                : 'Todo el stock con fecha de vencimiento sigue vigente.'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      lotes.map(lote => (
                        <TableRow key={lote.presentacion_id} className='border-b transition-colors'>
                          <TableCell className='sm:px-4 text-center sm:text-sm font-medium'>
                            {lote.producto}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center sm:text-sm'>
                            <Badge variant='secondary' className='rounded-full'>
                              {lote.presentacion}
                            </Badge>
                          </TableCell>
                          <TableCell className='sm:px-4 text-center sm:text-sm'>
                            {lote.fecha_vencimiento ? (
                              <VencimientoBadge fecha={lote.fecha_vencimiento} />
                            ) : (
                              <span className='text-gray-400 dark:text-gray-500'>—</span>
                            )}
                          </TableCell>
                          <TableCell className='max-w-56 sm:px-4 text-center'>
                            <div className='flex max-h-20 flex-wrap justify-center gap-1 overflow-auto'>
                              {(lote.codigos ?? []).map(codigo => (
                                <code
                                  key={codigo}
                                  className='rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-semibold'
                                >
                                  {codigo}
                                </code>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className='sm:px-4 text-center font-mono sm:text-sm font-bold text-red-600 dark:text-red-400'>
                            {lote.unidades_vencidas}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                            {lote.unidades_bodega}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                            {lote.unidades_bar}
                          </TableCell>
                          <TableCell className='sm:px-4 text-center'>
                            <PermissionGuard module='products' action='edit' fallback={null}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='outline'
                                    size='icon'
                                    onClick={() => setConfirmando(lote)}
                                    aria-label={`Dar de baja el lote vencido de ${lote.producto} ${lote.presentacion}`}
                                    className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
                                  >
                                    <Trash2 className='h-4 w-4 text-red-600' aria-hidden='true' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Dar de baja</p>
                                </TooltipContent>
                              </Tooltip>
                            </PermissionGuard>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <section>
            <div className='overflow-x-auto'>
              <Table className='min-w-[700px] text-center'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-center'>Último retiro</TableHead>
                    <TableHead className='text-center'>Producto</TableHead>
                    <TableHead className='text-center'>Presentación</TableHead>
                    <TableHead className='text-center'>Vencimiento</TableHead>
                    <TableHead className='text-center'>Unidades</TableHead>
                    <TableHead className='text-center'>Valor retirado</TableHead>
                    <TableHead className='text-center'>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gruposRetirados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState
                          variant='text'
                          title='No hay vencidos retirados'
                          description='Las bajas aparecerán aquí con su información completa.'
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    gruposRetirados.map(grupo => (
                      <TableRow key={`${grupo.producto_nombre}-${grupo.presentacion_nombre}`}>
                        <TableCell className='whitespace-nowrap'>
                          {grupo.fecha_retiro
                            ? new Date(grupo.fecha_retiro).toLocaleString('es-CL')
                            : '—'}
                        </TableCell>
                        <TableCell className='font-medium'>{grupo.producto_nombre}</TableCell>
                        <TableCell>
                          <Badge variant='secondary' className='rounded-full'>
                            {grupo.presentacion_nombre}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap justify-center gap-1'>
                            {grupo.fecha_vencimientos.length > 0
                              ? grupo.fecha_vencimientos.map(fecha => (
                                  <Badge
                                    key={String(fecha)}
                                    variant='destructive'
                                    className='rounded-full'
                                  >
                                    {String(fecha)}
                                  </Badge>
                                ))
                              : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant='secondary' className='rounded-full'>
                            {grupo.unidades}
                          </Badge>
                        </TableCell>
                        <TableCell className='font-semibold text-red-600'>
                          {formatCurrencyCLP(grupo.valor)}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='outline'
                                size='icon'
                                className='rounded-full'
                                onClick={() => setDetalleSeleccionado(grupo.registros)}
                                aria-label={`Ver detalle de unidades retiradas de ${grupo.producto_nombre} ${grupo.presentacion_nombre}`}
                              >
                                <Eye className='h-4 w-4' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalle</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>

        <Dialog
          open={Boolean(detalleSeleccionado)}
          onOpenChange={abierto => !abierto && setDetalleSeleccionado(null)}
        >
          <DialogContent className='flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden rounded-2xl p-0'>
            <DialogHeader className='border-b bg-white px-5 py-4 dark:bg-slate-950 sm:px-6'>
              <DialogTitle className='text-lg font-bold sm:text-xl'>
                Detalle de unidades retiradas
              </DialogTitle>
              <DialogDescription>
                {detalleSeleccionado?.[0]
                  ? `${detalleSeleccionado[0].producto_nombre} · ${detalleSeleccionado[0].presentacion_nombre}`
                  : 'Códigos y datos de las unidades retiradas'}
              </DialogDescription>
            </DialogHeader>
            <div className='overflow-auto bg-slate-50/70 px-4 py-4 dark:bg-slate-950/30 sm:px-6'>
              <div className='grid gap-3 sm:grid-cols-2'>
                {(detalleSeleccionado ?? []).map((registro, index) => (
                  <article
                    key={registro.id}
                    className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'
                  >
                    <div className='mb-3 flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                          Unidad {index + 1}
                        </p>
                        <code className='mt-1 block break-all text-sm font-bold text-slate-900 dark:text-white'>
                          {registro.codigo}
                        </code>
                      </div>
                      <Badge variant='outline' className='shrink-0 rounded-full'>
                        {registro.ubicacion_origen === 'bar' ? 'Bar' : 'Inventario'}
                      </Badge>
                    </div>

                    <dl className='grid grid-cols-2 gap-x-3 gap-y-3 text-sm'>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Código de barras</dt>
                        <dd className='mt-0.5 break-all font-mono text-xs font-semibold'>
                          {registro.codigo_barras ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Vencimiento</dt>
                        <dd className='mt-0.5 font-semibold text-red-600'>
                          {registro.fecha_vencimiento ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Fecha de retiro</dt>
                        <dd className='mt-0.5 font-medium'>
                          {new Date(registro.fecha_retiro).toLocaleString('es-CL')}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Retiró</dt>
                        <dd className='mt-0.5 font-medium'>{registro.usuario_nombre ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Compra</dt>
                        <dd className='mt-0.5 font-medium'>
                          {registro.compra_folio ?? '—'}
                          {registro.fecha_elaboracion && (
                            <span className='block text-[11px] text-muted-foreground'>
                              Elaboración {registro.fecha_elaboracion}
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Adquisición</dt>
                        <dd className='mt-0.5 font-medium'>
                          {registro.fecha_adquisicion
                            ? new Date(registro.fecha_adquisicion).toLocaleDateString('es-CL')
                            : '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className='mt-4 flex items-center justify-between border-t pt-3'>
                      <span className='text-xs text-muted-foreground'>Valor retirado</span>
                      <span className='font-bold text-red-600'>
                        {formatCurrencyCLP(registro.valor_retirado)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {!historialOnly && (
          <AlertDialog
            open={Boolean(confirmando)}
            onOpenChange={abierto => !abierto && setConfirmando(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Dar de baja el lote vencido</AlertDialogTitle>
                <AlertDialogDescription>
                  Se van a dar de baja {confirmando?.unidades_vencidas ?? 0} botella(s) de «
                  {confirmando?.producto} {confirmando?.presentacion}», vencidas desde el{' '}
                  {confirmando?.fecha_vencimiento ?? '—'}. Las unidades salen del inventario y la
                  operación queda registrada en la tabla de vencidos retirados con origen, código,
                  compra, fecha de adquisición y valor invertido.
                  {origen === 'ambos'
                    ? ' Se retirarán las unidades de Inventario y Bar.'
                    : ` Se retirarán las unidades de ${origen === 'bar' ? 'Bar' : 'Inventario'} solamente.`}{' '}
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={guardando} className='rounded-full'>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={darDeBaja}
                  disabled={guardando}
                  className='rounded-full'
                >
                  {guardando ? 'Dando de baja…' : 'Dar de baja'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </TooltipProvider>
    </PermissionGuard>
  );
}
