'use client';

import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CommissionData, Statistics } from './hooks/useCommissionsReport';
import { formatNumber } from './commissionsFormatters';

const ITEMS_PER_PAGE = 5;

const getCommissionRowKey = (commission: CommissionData, absoluteIndex: number) => {
  const identity =
    commission.id_usuario ??
    commission.nombre_completo ??
    `${commission.nombre}-${commission.apellido}`;
  return `${identity}-${absoluteIndex}`;
};

const getPerformanceBadge = (comisiones: number, promedio: number) => {
  if (comisiones >= promedio * 1.5)
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (comisiones >= promedio)
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (comisiones >= promedio * 0.5)
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
};

const getPerformanceText = (comisiones: number, promedio: number) => {
  if (comisiones >= promedio * 1.5) return 'Excelente';
  if (comisiones >= promedio) return 'Bueno';
  if (comisiones >= promedio * 0.5) return 'Regular';
  return 'Necesita mejorar';
};

interface CommissionsTableProps {
  commissions: CommissionData[];
  statistics: Statistics;
  tablePage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CommissionsTable({
  commissions,
  statistics,
  tablePage,
  totalPages,
  onPageChange
}: CommissionsTableProps) {
  return (
    <CollapsibleCard
      title={
        <>
          <UserCheck className='h-5 w-5' /> Comisiones por Anfitriona
        </>
      }
      headerRight={
        <span className='text-sm text-gray-500 dark:text-gray-400 font-normal'>
          {commissions.length} anfitrionas
        </span>
      }
    >
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-gray-200 dark:border-gray-700'>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Anfitriona
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Ventas
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Servicios
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Total Ventas
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Total Servicios
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Comisiones
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Prom/Venta
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Prom/Servicio
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Días
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Prom/Día
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100'>
                Rendimiento
              </th>
            </tr>
          </thead>
          <tbody>
            {commissions
              .slice(tablePage * ITEMS_PER_PAGE, (tablePage + 1) * ITEMS_PER_PAGE)
              .map((commission, index) => (
                <tr
                  key={getCommissionRowKey(commission, tablePage * ITEMS_PER_PAGE + index)}
                  className='border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <td className='py-3 px-4'>
                    <p className='font-medium text-gray-900 dark:text-gray-100'>
                      {commission.nombre_completo}
                    </p>
                  </td>
                  <td className='py-3 px-4 text-gray-900 dark:text-gray-200'>
                    {commission.total_ventas}
                  </td>
                  <td className='py-3 px-4 text-gray-900 dark:text-gray-200'>
                    {commission.total_servicios}
                  </td>
                  <td className='py-3 px-4 text-gray-900 dark:text-gray-200'>
                    $ {formatNumber(commission.total_ventas_monto)}
                  </td>
                  <td className='py-3 px-4 text-gray-900 dark:text-gray-200'>
                    $ {formatNumber(commission.total_servicios_monto)}
                  </td>
                  <td className='py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400'>
                    $ {formatNumber(commission.total_comisiones)}
                  </td>
                  <td className='py-3 px-4 text-gray-900 dark:text-gray-200'>
                    $ {formatNumber(commission.promedio_por_venta)}
                  </td>
                  <td className='py-3 px-4 text-gray-900 dark:text-gray-200'>
                    $ {formatNumber(commission.promedio_por_servicio)}
                  </td>
                  <td className='py-3 px-4 text-gray-900 dark:text-gray-200'>
                    {commission.dias_trabajados}
                  </td>
                  <td className='py-3 px-4 text-gray-900 dark:text-gray-200'>
                    $ {formatNumber(commission.promedio_diario)}
                  </td>
                  <td className='py-3 px-4'>
                    <Badge
                      className={getPerformanceBadge(
                        commission.total_comisiones,
                        statistics.promedio_comision_por_anfitriona
                      )}
                    >
                      {getPerformanceText(
                        commission.total_comisiones,
                        statistics.promedio_comision_por_anfitriona
                      )}
                    </Badge>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {commissions.length > ITEMS_PER_PAGE && (
        <div className='flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Mostrando {tablePage * ITEMS_PER_PAGE + 1} -{' '}
            {Math.min((tablePage + 1) * ITEMS_PER_PAGE, commissions.length)} de {commissions.length}
          </p>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onPageChange(Math.max(0, tablePage - 1))}
              disabled={tablePage === 0}
            >
              <ChevronLeft className='h-4 w-4 mr-1' />
              Anterior
            </Button>
            <div className='flex items-center gap-1'>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={tablePage === i ? 'default' : 'outline-solid'}
                  size='sm'
                  className='w-8 h-8 p-0'
                  onClick={() => onPageChange(i)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onPageChange(Math.min(totalPages - 1, tablePage + 1))}
              disabled={tablePage >= totalPages - 1}
            >
              Siguiente
              <ChevronRight className='h-4 w-4 ml-1' />
            </Button>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}
