'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import Paginate from '@/components/ui/paginate';
import type { PayrollRow } from '@/hooks/usePayroll';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';

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
  return (
    <div>
      {error && <div className='text-red-600 text-sm mb-3'>{error}</div>}
      {loading ? (
        <div className='text-sm text-gray-500'>Cargando...</div>
      ) : (
        <div className='mt-4 sm:mt-6 rounded-xl border bg-white overflow-hidden shadow-md'>
          <div className='overflow-x-auto'>
            <Table className='min-w-full rounded-xl overflow-hidden text-center'>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-center'>Nombre(s) <br /> Apellido(s)</TableHead>
                  <TableHead className='text-center'>Rol</TableHead>
                  <TableHead className='text-right'>Sueldos</TableHead>
                  <TableHead className='text-right'>Descuento AFP</TableHead>
                  <TableHead className='text-right'>
                    Comisiones <br /> Ventas
                  </TableHead>
                  <TableHead className='text-right'>Servicios</TableHead>
                  <TableHead className='text-right'>Propinas</TableHead>
                  <TableHead className='text-right'>
                    Descuentos <br /> Habitacion
                  </TableHead>
                  <TableHead className='text-right'>
                    Horas <br />
                    Extras
                  </TableHead>
                  <TableHead className='text-right'>Anticipos</TableHead>
                  <TableHead className='text-right'>Total a Pagar</TableHead>
                  <TableHead className='text-right'>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id_usuario}>
                    <TableCell>{r.usuario}</TableCell>
                    <TableCell>{r.rol}</TableCell>
                    <TableCell className='text-right'>
                      {formatCurrencyNoDecimals(r.sueldos)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrencyNoDecimals(r.aportes)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrencyNoDecimals(r.ventas)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrencyNoDecimals(r.servicios)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrencyNoDecimals(r.propinas)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrencyNoDecimals(r.descuentos)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrencyNoDecimals(r.total_monto_horas)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrencyNoDecimals(r.anticipos)}
                    </TableCell>
                    <TableCell className='text-right font-bold'>
                      {formatCurrencyNoDecimals(r.total)}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button size='sm' variant='outline' className='rounded-full' onClick={() => handlePay(r)}>
                        Pagar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {totalPages > 1 && (
        <div className='flex justify-center mt-4'>
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
      <ConfirmModal
        open={modalState.open}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        type={modalState.type}
        onConfirm={modalState.onConfirm || (() => {})}
        onCancel={modalState.onCancel}
        size={modalState.size}
      />
    </div>
  );
}
