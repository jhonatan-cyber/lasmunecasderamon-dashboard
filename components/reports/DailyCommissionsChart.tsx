'use client';

import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { BarChart3 } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { DailyCommission } from './hooks/useCommissionsReport';
import { formatNumber, formatCompact } from './commissionsFormatters';

interface DailyTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: DailyCommission & { diaCorto: string };
  }>;
}

const DailyTooltip = ({ active, payload }: DailyTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className='bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl'>
        <p className='text-white font-semibold text-sm mb-2'>{data.dia_espanol}</p>
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-1.5'>
              <div className='w-2.5 h-2.5 rounded-full bg-blue-400' />
              <span className='text-gray-300 text-xs'>Ventas:</span>
            </div>
            <span className='text-white font-bold text-sm'>
              $ {formatNumber(data.total_ventas_monto)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-1.5'>
              <div className='w-2.5 h-2.5 rounded-full bg-purple-400' />
              <span className='text-gray-300 text-xs'>Servicios:</span>
            </div>
            <span className='text-white font-bold text-sm'>
              $ {formatNumber(data.total_servicios_monto)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-1.5'>
              <div className='w-2.5 h-2.5 rounded-full bg-emerald-400' />
              <span className='text-gray-300 text-xs'>Comisiones:</span>
            </div>
            <span className='text-emerald-300 font-bold text-sm'>
              $ {formatNumber(data.total_comisiones)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface DailyCommissionsChartProps {
  data: (DailyCommission & { diaCorto: string })[];
}

export function DailyCommissionsChart({ data }: DailyCommissionsChartProps) {
  return (
    <CollapsibleCard
      title={
        <>
          <BarChart3 className='h-5 w-5' /> Comisiones por Día de la Semana
        </>
      }
      headerClassName='bg-linear-to-r from-indigo-600 to-blue-600 text-white'
    >
      <div className='h-[320px] sm:h-[450px] w-full'>
        {data.length > 0 ? (
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id='ventasGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#3B82F6' stopOpacity={0.9} />
                  <stop offset='100%' stopColor='#3B82F6' stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id='serviciosGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#8B5CF6' stopOpacity={0.9} />
                  <stop offset='100%' stopColor='#8B5CF6' stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='currentColor'
                className='text-gray-200 dark:text-gray-700'
                vertical={false}
              />
              <XAxis
                dataKey='diaCorto'
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className='text-gray-600 dark:text-gray-400'
                tickLine={false}
                axisLine={{
                  stroke: 'currentColor',
                  className: 'text-gray-300 dark:text-gray-600'
                }}
              />
              <YAxis
                tickFormatter={formatCompact}
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className='text-gray-500 dark:text-gray-400'
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip content={<DailyTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '8px' }}
                formatter={(value: string) => (
                  <span className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                    {value}
                  </span>
                )}
              />
              <Bar
                dataKey='total_ventas_monto'
                name='Ventas'
                fill='url(#ventasGrad)'
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationEasing='ease-out'
              />
              <Bar
                dataKey='total_servicios_monto'
                name='Servicios'
                fill='url(#serviciosGrad)'
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationEasing='ease-out'
              />
              <Line
                type='monotone'
                dataKey='total_comisiones'
                name='Comisiones'
                stroke='#10B981'
                strokeWidth={3}
                dot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1000}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className='flex items-center justify-center h-48 text-gray-400'>
            <p className='text-sm'>No hay datos de comisiones diarias</p>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
