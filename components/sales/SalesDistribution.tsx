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
  defaultRole
}: {
  title: string;
  rows: DistribucionVenta[];
  defaultRole?: string;
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
        <div className='overflow-x-auto rounded-3xl border border-gray-100 dark:border-gray-800'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50 dark:bg-slate-800/50 text-xs text-gray-500 dark:text-neutral-400'>
              <tr>
                <th className='px-5 py-3 text-left'>Personal</th>
                <th className='px-5 py-3 text-left'>Rol</th>
                <th className='px-5 py-3 text-right'>Monto</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
              {rows.map((row, index) => (
                <tr key={row.usuario_id ?? `${row.nick}-${index}`}>
                  <td className='px-5 py-3 font-medium text-gray-900 dark:text-neutral-100'>
                    {row.nick ||
                      [row.nombre, row.apellido].filter(Boolean).join(' ') ||
                      'Personal sin identificar'}
                  </td>
                  <td className='px-5 py-3 text-gray-600 dark:text-neutral-300'>
                    {defaultRole ||
                      roles[String(row.rol ?? '').toLowerCase()] ||
                      row.rol ||
                      'Sin rol registrado'}
                  </td>
                  <td className='px-5 py-3 text-right font-semibold text-gray-900 dark:text-neutral-100'>
                    ${formatCurrency(row.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className='bg-gray-50 dark:bg-slate-800/50 font-bold text-gray-900 dark:text-white'>
              <tr>
                <td colSpan={2} className='px-5 py-3'>
                  Total distribuido
                </td>
                <td className='px-5 py-3 text-right'>${formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
