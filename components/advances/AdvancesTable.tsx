'use client';

import Image from 'next/image';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { Anticipo } from '@/hooks/personal/useAnticipos';
import { User, Calendar, Wallet, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvancesTableProps {
  loading: boolean;
  advances: Anticipo[];
  pageSize?: number;
  isAdmin?: boolean;
  onAction?: (id: string | number, action: 'approve' | 'reject') => Promise<any>;
  activeTab?: 'pending' | 'paid';
}

export default function AdvancesTable({
  loading,
  advances,
  pageSize = 10,
  isAdmin = false,
  onAction,
  activeTab = 'pending'
}: AdvancesTableProps) {
  // Filter by tab
  const filteredAdvances = advances.filter(a => {
    if (activeTab === 'pending') {
      // Por cobrar: estado 1 sin fecha_cobro, estado 2 (pendiente), estado 0 (pagado directo sin cobrar)
      return Number(a.estado) === 1 || Number(a.estado) === 2;
    } else {
      // Cobrados: estado 4 (cobrado en planilla) o tiene fecha_cobro
      return Number(a.estado) === 4 || !!a.fecha_cobro;
    }
  });

  const paidAdvances = filteredAdvances.filter(a => Number(a.estado) === 0);
  const pendingAdvances = filteredAdvances.filter(a => Number(a.estado) === 1 || Number(a.estado) === 2);

  if (filteredAdvances.length === 0 && !loading) {
    return (
      <Card className='border-none shadow-md rounded-3xl bg-white dark:bg-slate-900/40 overflow-hidden'>
        <CardContent className='flex flex-col items-center justify-center py-16 text-gray-500'>
          <Wallet className='h-12 w-12 mb-4 opacity-20' />
          <p className='text-lg font-medium'>No hay anticipos {activeTab === 'pending' ? 'por cobrar' : 'cobrados'}</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (estado: number, anticipo: Anticipo) => {
    // Si tiene fecha_cobro es cobrado (desde planilla)
    if (anticipo.fecha_cobro) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-purple-100 text-purple-700 border-none hover:bg-purple-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Cobrado
        </Badge>
      );
    }
    // Si tiene fecha_entrega es entregado (entrega manual)
    if (anticipo.fecha_entrega) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Entregado
        </Badge>
      );
    }
    // Estado 2 = Pendiente (solicitado, sin aprobar)
    if (Number(estado) === 2) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-blue-100 text-blue-700 border-none hover:bg-blue-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Pendiente
        </Badge>
      );
    }
    // Estado 3 = Rechazado
    if (Number(estado) === 3) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-rose-100 text-rose-700 border-none hover:bg-rose-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Rechazado
        </Badge>
      );
    }
    // Estado 1 = Por Cobrar (aprobado, sin entregar)
    return (
      <Badge className='rounded-full px-3 py-1 bg-amber-100 text-amber-700 border-none hover:bg-amber-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
        Por Cobrar
      </Badge>
    );
  };

  // Vista de tarjetas para móviles
  const renderMobileCardView = (advancesToRender: Anticipo[], title: string) => (
    <div className='lg:hidden space-y-4'>
      <h3 className='text-sm font-semibold text-gray-900 dark:text-white px-2'>
        {title} ({advancesToRender.length})
      </h3>
      {loading && advancesToRender.length === 0 ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Card
            key={i}
            className='rounded-3xl border-none shadow-md bg-white dark:bg-slate-900/40 overflow-hidden animate-pulse'
          >
            <CardContent className='p-4'>
              <Skeleton className='h-6 w-1/2 mb-4' />
              <Skeleton className='h-4 w-full mb-2' />
              <Skeleton className='h-4 w-3/4 mb-2' />
              <Skeleton className='h-4 w-1/2' />
            </CardContent>
          </Card>
        ))
      ) : advancesToRender.length === 0 ? (
        <Card className='rounded-3xl border-none shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden'>
          <CardContent className='p-8 text-center text-gray-500'>
            <p className='text-sm'>No hay anticipos en esta categoría</p>
          </CardContent>
        </Card>
      ) : (
        advancesToRender.map(a => (
          <Card
            key={a.id_anticipo}
            className='rounded-3xl border-none shadow-md bg-white dark:bg-slate-900/40 overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-200'
          >
            <CardContent className='p-5 space-y-4'>
              <div className='flex justify-between items-start'>
                <div className='flex items-center gap-3'>
                  <div className='h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm relative'>
                    {a.foto ? (
                      <Image
                        src={a.foto.startsWith('http') ? a.foto : `/img/users/${a.foto}`}
                        alt={a.nick}
                        fill
                        sizes='40px'
                        className='object-cover'
                      />
                    ) : (
                      <span className='text-sm'>
                        {(a.name || a.nombre || '')?.substring(0, 1)}
                        {(a.lastName || a.apellido || '')?.substring(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-sm font-bold text-gray-900 dark:text-white leading-tight'>
                      {a.name || a.nombre} {a.lastName || a.apellido}
                    </span>
                    <span className='text-[10px] text-purple-600 font-semibold uppercase tracking-wider'>
                      @{a.nick}
                    </span>
                  </div>
                </div>
                <div className='flex flex-col items-end gap-2'>{getStatusBadge(a.estado, a)}</div>
              </div>

              <div className='flex items-center justify-between pb-1'>
                <div className='flex items-center gap-2 text-[10px] text-gray-500 font-medium'>
                  <Calendar className='h-3 w-3' />
                  {formatDateTimeDmyLabel(a.fecha_crea).date}
                </div>
                <div className='text-lg font-black text-emerald-600'>
                  {formatCurrencyCLP(a.monto)}
                </div>
              </div>

              {isAdmin && Number(a.estado) === 2 && onAction && (
                <div className='flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-800'>
                  <Button
                    variant='ghost'
                    className='flex-1 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs h-9'
                    onClick={() => onAction(a.id_anticipo, 'approve')}
                  >
                    <Check className='h-4 w-4 mr-2' /> Aprobar
                  </Button>
                  <Button
                    variant='ghost'
                    className='flex-1 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs h-9'
                    onClick={() => onAction(a.id_anticipo, 'reject')}
                  >
                    <X className='h-4 w-4 mr-2' /> Rechazar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Vista de tabla para desktop
  const renderDesktopTableView = (advancesToRender: Anticipo[], title: string) => (
    <div className='hidden lg:block space-y-4'>
      <h3 className='text-sm font-semibold text-gray-900 dark:text-white px-2'>
        {title} ({advancesToRender.length})
      </h3>
      {loading && advancesToRender.length === 0 ? (
        <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
          <Table>
            <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
              <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Empleado
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                  Fecha Solic.
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                  Fecha Aprob.
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                  Estado
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-right'>
                  Monto
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                  Entregado por
                </TableHead>
                {isAdmin && (
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`loading-${i}`}>
                  <TableCell>
                    <Skeleton className='h-10 w-40 rounded-full' />
                  </TableCell>
<TableCell>
                      <Skeleton className='h-4 w-24 mx-auto' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-6 w-20 mx-auto rounded-full' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-24 ml-auto' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-24 mx-auto' />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Skeleton className='h-8 w-20 mx-auto rounded-full' />
                      </TableCell>
                    )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : advancesToRender.length === 0 ? (
        <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
          <div className='p-8 text-center text-gray-500'>
            <p className='text-sm'>No hay anticipos en esta categoría</p>
          </div>
        </div>
      ) : (
        <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
          <Table>
            <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
              <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Empleado
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                  Fecha Solic.
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                  Fecha Aprob.
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                  Estado
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-right'>
                  Monto
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                  Entregado por
                </TableHead>
                {isAdmin && (
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {advancesToRender.map((a, idx) => {
                const creacion = formatDateTimeDmyLabel(a.fecha_crea);
                return (
                  <TableRow
                    key={a.id_anticipo}
                    className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === advancesToRender.length - 1 ? 'last:rounded-b-xl' : ''}`}
                  >
                    <TableCell className='py-3 px-4'>
                      <div className='flex items-center gap-3'>
                        <div className='h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm relative group-hover:scale-110 transition-transform duration-200'>
                          {a.foto ? (
                            <Image
                              src={a.foto.startsWith('http') ? a.foto : `/img/users/${a.foto}`}
                              alt={a.nick}
                              fill
                              sizes='40px'
                              className='object-cover'
                            />
                          ) : (
                            <span className='text-sm'>
                              {(a.name || a.nombre || '')?.substring(0, 1)}
                              {(a.lastName || a.apellido || '')?.substring(0, 1)}
                            </span>
                          )}
                        </div>
                        <div className='flex flex-col'>
                          <span className='font-bold text-sm text-gray-900 dark:text-white leading-tight'>
                            {a.name || a.nombre} {a.lastName || a.apellido}
                          </span>
                          <span className='text-[10px] text-purple-600 font-bold uppercase tracking-wider'>
                            @{a.nick}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='py-3 px-4 text-center'>
                      <div className='flex flex-col'>
                        <span className='font-bold text-sm text-gray-900 dark:text-white'>
                          {creacion.date}
                        </span>
                        <span className='text-xs text-gray-400'>{creacion.time}</span>
                      </div>
                    </TableCell>
                    <TableCell className='py-3 px-4 text-center'>
                      {a.fecha_aprobacion ? (
                        <div className='flex flex-col'>
                          <span className='font-bold text-sm text-gray-900 dark:text-white'>
                            {formatDateTimeDmyLabel(a.fecha_aprobacion).date}
                          </span>
                          <span className='text-xs text-gray-400'>
                            {formatDateTimeDmyLabel(a.fecha_aprobacion).time}
                          </span>
                        </div>
                      ) : (
                        <span className='text-xs text-gray-400 italic'>-</span>
                      )}
                    </TableCell>
                    <TableCell className='py-3 px-4 text-center'>
                      {getStatusBadge(a.estado, a)}
                    </TableCell>
                    <TableCell className='py-3 px-4 text-right font-bold text-emerald-600'>
                      {formatCurrencyCLP(a.monto)}
                    </TableCell>
                    <TableCell className='py-3 px-4 text-center'>
                      {a.entregado_por_nombre ? (
                        <span className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
                          {a.entregado_por_nombre} {a.entregado_por_apellido}
                        </span>
                      ) : (
                        <span className='text-xs text-gray-400 italic'>-</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className='py-3 px-4 text-center'>
                        {Number(a.estado) === 2 && onAction ? (
                          <div className='flex items-center justify-center gap-2'>
                            <Button
                              size='sm'
                              variant='ghost'
                              className='h-8 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 font-bold text-[10px] uppercase transition-all active:scale-95'
                              onClick={() => onAction(a.id_anticipo, 'approve')}
                            >
                              <Check className='h-3 w-3 mr-1' /> Aprobar
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              className='h-8 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 font-bold text-[10px] uppercase transition-all active:scale-95'
                              onClick={() => onAction(a.id_anticipo, 'reject')}
                            >
                              <X className='h-3 w-3 mr-1' /> Rechazar
                            </Button>
                          </div>
                        ) : (
                          <div className='flex justify-center'>
                            <Badge className='rounded-full px-3 py-1 bg-gray-100 text-gray-400 border-none font-bold uppercase tracking-tighter text-[9px] italic'>
                              Ya Procesado
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <div className='space-y-6'>
      {/* Anticipos Por Cobrar */}
      {(pendingAdvances.length > 0 || loading) && (
        <>
          {renderMobileCardView(pendingAdvances, activeTab === 'pending' ? 'Por Cobrar' : 'Cobrados')}
          {renderDesktopTableView(pendingAdvances, activeTab === 'pending' ? 'Por Cobrar' : 'Cobrados')}
        </>
      )}

      {/* Anticipos Pagados */}
      {(paidAdvances.length > 0 || loading) && (
        <>
          {renderMobileCardView(paidAdvances, activeTab === 'pending' ? 'Entregados' : 'Cobrados en Planilla')}
          {renderDesktopTableView(paidAdvances, activeTab === 'pending' ? 'Entregados' : 'Cobrados en Planilla')}
        </>
      )}

      {filteredAdvances.length === 0 && !loading && (
        <Card className='border-none shadow-md rounded-3xl bg-white dark:bg-slate-900/40 overflow-hidden'>
          <CardContent className='flex flex-col items-center justify-center py-16 text-gray-500'>
            <Wallet className='h-12 w-12 mb-4 opacity-20' />
            <p className='text-lg font-medium'>No hay anticipos {activeTab === 'pending' ? 'por cobrar' : 'cobrados'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
