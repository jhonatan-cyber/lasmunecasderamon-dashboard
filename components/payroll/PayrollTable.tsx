'use client';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Paginate from '@/components/shared/Paginate';
import type { PayrollRow } from '@/hooks/personal';
import { useConfirmModal } from '@/hooks/shared';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Wallet } from 'lucide-react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';

interface PayrollTableProps {
  title?: string;
  rows: PayrollRow[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  setPage: (n: number) => void;
  onRefetch?: () => Promise<void> | void;
}

export default function PayrollTable({
  rows,
  loading,
  error,
  page,
  totalPages,
  setPage,
  onRefetch
}: PayrollTableProps) {
  const { modalState, showConfirm, closeModal } = useConfirmModal();
  const { userPermissions } = useUserPermissions();
  const { user } = useCurrentUser();
  const canPay = useMemo(() => {
    const isAdmin = user?.role?.toLowerCase() === 'administrador';
    if (isAdmin) {
      return true;
    }
    return userPermissions.some(
      p =>
        p.module === 'pagos_trabajadores' && (p.action === 'pagar' || p.action === 'listar_pagos')
    );
  }, [userPermissions, user?.role]);

  const handlePay = async (row: PayrollRow) => {
    const confirmed = await showConfirm({
      title: 'Confirmar pago',
      message: `¿Deseas pagar el total de ${formatCurrencyNoDecimals(row.total)} a ${row.usuario}?`,
      confirmText: 'Pagar',
      cancelText: 'Cancelar',
      type: 'question',
      size: 'md'
    });
    if (confirmed) {
      try {
        const res = await fetch('/api/payroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: row.id_usuario })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Error al procesar pago');
        showSuccessToast('Pago procesado correctamente');
        if (onRefetch) await onRefetch();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al procesar pago';
        showErrorToast(msg);
      }
    }
  };
  const rowToCard = (r: PayrollRow) => (
    <div
      key={r.id_usuario}
      className='bg-white dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3'
    >
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Avatar className='h-10 w-10'>
            {r.usuario_foto && r.usuario_foto !== '' ? (
              <AvatarImage
                src={`/img/users/${r.usuario_foto}`}
                alt={r.usuario || 'Usuario'}
                className='w-full h-full object-cover rounded-full'
              />
            ) : (
              <AvatarFallback className='bg-purple-100 text-purple-700 font-bold text-xs'>
                {r.usuario?.substring(0, 2).toUpperCase() || 'NA'}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className='font-semibold text-sm'>{r.usuario}</p>
            <Badge className='bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full px-2 py-0.5 text-[10px] font-medium'>
              {r.rol}
            </Badge>
          </div>
        </div>
        <div className='text-right'>
          <p className='text-xs text-gray-400'>Total a Pagar</p>
          <p className='font-bold text-sm'>{formatCurrencyNoDecimals(r.total)}</p>
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2 text-xs'>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2'>
          <span className='text-gray-400'>Sueldos</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.sueldos)}</span>
        </div>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2'>
          <span className='text-gray-400'>Desc. AFP</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.aportes)}</span>
        </div>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2'>
          <span className='text-gray-400'>Com. Ventas</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.ventas)}</span>
        </div>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2'>
          <span className='text-gray-400'>Servicios</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.servicios)}</span>
        </div>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2'>
          <span className='text-gray-400'>Propinas</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.propinas)}</span>
        </div>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2'>
          <span className='text-gray-400'>Desc. Hab.</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.descuentos)}</span>
        </div>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2'>
          <span className='text-gray-400'>Hs. Extras</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.total_monto_horas)}</span>
        </div>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2'>
          <span className='text-gray-400'>Gratif.</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.gratificaciones)}</span>
        </div>
        <div className='flex justify-between bg-gray-50 dark:bg-slate-900/20 rounded-lg px-3 py-2 col-span-2'>
          <span className='text-gray-400'>Anticipos</span>
          <span className='font-medium'>{formatCurrencyNoDecimals(r.anticipos)}</span>
        </div>
      </div>
      {canPay && (
        <Button
          size='sm'
          onClick={() => handlePay(r)}
          className='w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold'
        >
          Pagar {formatCurrencyNoDecimals(r.total)}
        </Button>
      )}
    </div>
  );

  return (
    <div>
      {error && <div className='text-red-600 text-sm mb-3'>{error}</div>}

      {}
      <div className='block lg:hidden space-y-3'>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='bg-white dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3'
            >
              <div className='flex items-center gap-3'>
                <Skeleton className='h-10 w-10 rounded-full' />
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-3 w-16' />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className='h-8 rounded-lg' />
                ))}
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className='flex flex-col items-center gap-3 py-16'>
            <div className='w-14 h-14 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center'>
              <Wallet className='w-6 h-6 text-gray-400' />
            </div>
            <p className='text-sm font-medium text-gray-500'>No hay registros de pagos</p>
          </div>
        ) : (
          rows.map(r => rowToCard(r))
        )}
      </div>

      {}
      <div className='hidden lg:block mt-4 sm:mt-6 bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
        <div className='overflow-x-auto'>
          <Table className='min-w-full text-base text-center'>
            <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
              <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-start'>
                  Nombre(s) / Apellido(s)
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Rol</TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Sueldos</TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Desc. AFP
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Com. Ventas
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Servicios
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Propinas
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Desc. Hab.
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Hs. Extras
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Gratif.</TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Anticipos
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Total a Pagar
                </TableHead>
                {canPay && (
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className='border-b border-gray-100 dark:border-gray-800'>
                    {Array.from({ length: canPay ? 13 : 12 }).map((_, j) => (
                      <TableCell key={j} className='py-4 px-5'>
                        <Skeleton className='h-4 w-16 rounded mx-auto' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canPay ? 13 : 12} className='py-16 text-center'>
                    <div className='flex flex-col items-center gap-3'>
                      <div className='w-14 h-14 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center'>
                        <Wallet className='w-6 h-6 text-gray-400' />
                      </div>
                      <p className='text-sm font-medium text-gray-500'>No hay registros de pagos</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow
                    key={r.id_usuario}
                    className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 border-gray-100 dark:border-gray-800 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === rows.length - 1 ? 'last:rounded-b-xl' : ''}`}
                  >
                    <TableCell className='font-medium text-start text-sm py-4 px-5'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-8 w-8'>
                          {r.usuario_foto && r.usuario_foto !== '' ? (
                            <AvatarImage
                              src={`/img/users/${r.usuario_foto}`}
                              alt={r.usuario || 'Usuario'}
                              className='w-full h-full object-cover rounded-full'
                            />
                          ) : (
                            <AvatarFallback className='bg-purple-100 text-purple-700 font-bold text-xs'>
                              {r.usuario?.substring(0, 2).toUpperCase() || 'NA'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className='font-medium'>{r.usuario}</span>
                      </div>
                    </TableCell>
                    <TableCell className='text-center py-4 px-5'>
                      <Badge className='bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full px-2 py-1 text-xs font-medium'>
                        {r.rol}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.sueldos)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.aportes)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.ventas)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.servicios)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.propinas)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.descuentos)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.total_monto_horas)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.gratificaciones)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.anticipos)}
                    </TableCell>
                    <TableCell className='text-center font-bold text-sm py-4 px-5'>
                      {formatCurrencyNoDecimals(r.total)}
                    </TableCell>
                    {canPay && (
                      <TableCell className='text-center py-4 px-5'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handlePay(r)}
                          className='h-8 px-3 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors duration-200 text-xs font-semibold'
                        >
                          Pagar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className='flex justify-center mt-4'>
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
      <ConfirmModal
        open={modalState.open}
        onOpenChange={open => {
          if (!open) closeModal();
        }}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        hideCancel={modalState.hideCancel}
        type={modalState.type}
        onConfirm={modalState.onConfirm || (() => {})}
        onCancel={modalState.onCancel}
        size={modalState.size}
      />
    </div>
  );
}
