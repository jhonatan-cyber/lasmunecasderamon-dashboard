import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter
} from '@/components/ui/table';
import type { DistribucionVenta } from '@/types/venta';
import { formatCurrency } from '@/lib/business/salesUtils';

const roles: Record<string, string> = {
  garzon: 'Garzón',
  cajero: 'Cajero',
  barman: 'Barman',
  anfitriona: 'Anfitriona'
};

export function SalesDistribution({
  title,
  rows,
  defaultRole,
  flat = false
}: {
  title: string;
  rows: DistribucionVenta[];
  defaultRole?: string;
  flat?: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + Number(row.monto || 0), 0);
  return (
    <section className='space-y-3' aria-label={title}>
      <h3 className='text-sm font-bold text-gray-900 dark:text-white'>{title}</h3>
      {rows.length === 0 ? (
        <p className='text-sm text-gray-500 dark:text-neutral-400'>
          No hay reparto registrado para esta venta.
        </p>
      ) : (
        <div
          className={
            flat
              ? 'overflow-x-auto border-y border-border'
              : 'overflow-x-auto rounded-3xl border border-gray-100 dark:border-gray-800'
          }
        >
          <Table className='w-full'>
            <TableHeader className='text-xs text-gray-500 dark:text-neutral-400'>
              <TableRow>
                <TableHead className='text-left'>Personal</TableHead>
                <TableHead className='text-left'>Rol</TableHead>
                <TableHead className='text-right'>Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className='divide-y divide-gray-100 dark:divide-gray-800'>
              {rows.map((row, index) => (
                <TableRow key={row.usuario_id ?? `${row.nick}-${index}`}>
                  <TableCell className='font-medium dark:text-neutral-100'>
                    {row.nick ||
                      [row.nombre, row.apellido].filter(Boolean).join(' ') ||
                      'Personal sin identificar'}
                  </TableCell>
                  <TableCell className='dark:text-neutral-300'>
                    {defaultRole ||
                      roles[String(row.rol ?? '').toLowerCase()] ||
                      row.rol ||
                      'Sin rol registrado'}
                  </TableCell>
                  <TableCell className='text-right font-semibold dark:text-neutral-100'>
                    ${formatCurrency(row.monto)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className='bg-gray-50 dark:bg-slate-800/50 font-bold text-gray-900 dark:text-white'>
              <TableRow>
                <TableCell colSpan={2}>Total distribuido</TableCell>
                <TableCell className='text-right'>${formatCurrency(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </section>
  );
}
