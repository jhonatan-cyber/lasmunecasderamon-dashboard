'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Package, Trash2, Warehouse, Wine } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MetricCard } from '@/components/shared/MetricCard';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { LoteVencido } from '@/modules/inventario/contracts';

export function ExpiredStockPanel() {
  const [lotes, setLotes] = useState<LoteVencido[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<LoteVencido | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/expired', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.message || 'No se pudieron cargar los lotes vencidos');
        return;
      }
      setLotes(Array.isArray(body.data) ? body.data : []);
    } catch {
      toast.error('No se pudieron cargar los lotes vencidos');
    } finally {
      setLoading(false);
    }
  }, []);

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
        body: JSON.stringify({ presentacion_id: confirmando.presentacion_id })
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
                Lotes vencidos
              </h1>
              <p className='mt-2 text-sm sm:text-base text-gray-600'>
                Botellas que ya no se pueden vender. Darlas de baja las saca del inventario y las
                registra como merma.
              </p>
            </div>
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
          </div>

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

          <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
            <div className='overflow-x-auto'>
              <Table className='min-w-full text-center'>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='text-center'>Producto</TableHead>
                    <TableHead className='text-center'>Presentación</TableHead>
                    <TableHead className='text-center'>Vencimiento</TableHead>
                    <TableHead className='text-center'>Botellas</TableHead>
                    <TableHead className='text-center'>Bodega</TableHead>
                    <TableHead className='text-center'>Bar</TableHead>
                    <TableHead className='text-center'>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.length === 0 ? (
                    <TableRow key='empty'>
                      <TableCell colSpan={7} className='text-center sm:text-base bg-white'>
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
        </div>

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
                operación queda registrada en el historial como merma. Esta acción no se puede
                deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={guardando} className='rounded-full'>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={darDeBaja} disabled={guardando} className='rounded-full'>
                {guardando ? 'Dando de baja…' : 'Dar de baja'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </PermissionGuard>
  );
}
