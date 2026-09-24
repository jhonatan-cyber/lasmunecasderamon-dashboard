'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { TopPerformer } from './hooks/useCommissionsReport';
import { formatNumber, formatCompact } from './commissionsFormatters';

const TOP_PERFORMER_COLORS = ['#F59E0B', '#9CA3AF', '#D97706', '#6366F1', '#EC4899'];

interface PerformerTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: TopPerformer & { shortName: string } }>;
}

const PerformerTooltip = ({ active, payload }: PerformerTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className='bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl max-w-[220px]'>
        <p className='text-white font-semibold text-sm mb-2'>{data.nombre_completo}</p>
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-gray-300 text-xs'>Comisiones:</span>
            <span className='text-emerald-300 font-bold text-sm'>
              $ {formatNumber(data.total_comisiones)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-gray-300 text-xs'>Ventas:</span>
            <span className='text-blue-300 text-sm'>{data.total_ventas_count}</span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-gray-300 text-xs'>Servicios:</span>
            <span className='text-purple-300 text-sm'>{data.total_servicios_count}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface TopPerformersChartProps {
  data: (TopPerformer & { shortName: string })[];
}

export function TopPerformersChart({ data }: TopPerformersChartProps) {
  return (
    <Card className='border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md'>
      <CardHeader className='border-b border-gray-50 dark:border-gray-700/50 pb-4'>
        <CardTitle className='text-lg font-black flex items-center gap-2'>
          <div className='p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30'>
            <Award className='h-4 w-4 text-amber-600' />
          </div>
          Top Performers (Ranking Comisiones)
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-8'>
        <div className='h-[400px] w-full'>
          {data.length > 0 ? (
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={data}
                layout='vertical'
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <defs>
                  {TOP_PERFORMER_COLORS.map((color, i) => (
                    <linearGradient
                      key={`perfGrad${i}`}
                      id={`perfGrad${i}`}
                      x1='0'
                      y1='0'
                      x2='1'
                      y2='0'
                    >
                      <stop offset='0%' stopColor={color} stopOpacity={0.9} />
                      <stop offset='100%' stopColor={color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                  <filter id='shadowBar' height='200%'>
                    <feDropShadow dx='2' dy='2' stdDeviation='3' floodOpacity='0.15' />
                  </filter>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='currentColor'
                  className='text-gray-100 dark:text-gray-700/50'
                  horizontal={false}
                  vertical={true}
                />
                <XAxis
                  type='number'
                  tickFormatter={formatCompact}
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                  className='text-gray-400 dark:text-gray-500'
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type='category'
                  dataKey='shortName'
                  width={90}
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
                  className='text-gray-700 dark:text-gray-300'
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<PerformerTooltip />}
                  cursor={{
                    fill: 'currentColor',
                    className: 'text-gray-50 dark:text-gray-800/40',
                    radius: 8
                  }}
                />
                <Bar
                  dataKey='total_comisiones'
                  name='Comisión Total'
                  radius={[0, 8, 8, 0]}
                  animationDuration={1500}
                  animationEasing='ease-out'
                  barSize={32}
                  style={{ filter: 'url(#shadowBar)' }}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#perfGrad${index % TOP_PERFORMER_COLORS.length})`}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className='flex items-center justify-center h-full text-gray-400 italic'>
              <p className='text-sm'>No hay datos de performers</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
