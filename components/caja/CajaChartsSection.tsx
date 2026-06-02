'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Wallet } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface CajaChartsSectionProps {
  isLoading: boolean;
  totalIngresos: number;
  totalEgresos: number;
  ventasTragos: number;
  ventasChampagne: number;
  ventasBarras: number;
  servicios: number;
}

export function CajaChartsSection({
  isLoading,
  totalIngresos,
  totalEgresos,
  ventasTragos,
  ventasChampagne,
  ventasBarras,
  servicios
}: CajaChartsSectionProps) {
  const chartData = [
    { name: 'Tragos', valor: ventasTragos, propinas: 0 },
    { name: 'Champaña', valor: ventasChampagne, propinas: 0 },
    { name: 'Barras', valor: ventasBarras, propinas: 0 },
    { name: 'Servicios', valor: servicios, propinas: 0 }
  ];

  const pieData = [
    { name: 'Tragos', value: ventasTragos },
    { name: 'Champaña', value: ventasChampagne },
    { name: 'Barras', value: ventasBarras },
    { name: 'Servicios', value: servicios }
  ].filter(item => item.value > 0);

  return (
    <div id='charts-container' className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      <div
        id='chart-bars'
        className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'
      >
        <h4 className='text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
          <TrendingUp className='w-4 h-4 text-blue-500' />
          Ventas por Categoría
        </h4>
        <div className='grid grid-cols-3 gap-2 mb-3'>
          <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center'>
            <p className='text-xs text-blue-600 dark:text-blue-400 font-medium'>Tragos</p>
            <p className='text-sm font-bold text-blue-700 dark:text-blue-300'>
              {formatCurrencyNoDecimals(ventasTragos)}
            </p>
          </div>
          <div className='bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center'>
            <p className='text-xs text-purple-600 dark:text-purple-400 font-medium'>Champaña</p>
            <p className='text-sm font-bold text-purple-700 dark:text-purple-300'>
              {formatCurrencyNoDecimals(ventasChampagne)}
            </p>
          </div>
          <div className='bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center'>
            <p className='text-xs text-emerald-600 dark:text-emerald-400 font-medium'>Barras</p>
            <p className='text-sm font-bold text-emerald-700 dark:text-emerald-300'>
              {formatCurrencyNoDecimals(ventasBarras)}
            </p>
          </div>
        </div>
        <div className='h-48'>
          {isLoading ? (
            <Skeleton className='h-full w-full rounded-xl' />
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                <XAxis dataKey='name' tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrencyNoDecimals(value)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey='valor' fill='#3b82f6' radius={[8, 8, 0, 0]} name='Ventas' />
                <Bar dataKey='propinas' fill='#f59e0b' radius={[8, 8, 0, 0]} name='Propinas' />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className='mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between'>
          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Total Ventas:</span>
          <span className='text-sm font-bold text-gray-900 dark:text-white'>
            {formatCurrencyNoDecimals(totalIngresos)}
          </span>
        </div>
      </div>

      <div
        id='chart-pie'
        className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'
      >
        <h4 className='text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
          <Wallet className='w-4 h-4 text-emerald-500' />
          Distribución de Ingresos
        </h4>
        <div className='grid grid-cols-2 gap-2 mb-3'>
          <div className='bg-slate-50 dark:bg-slate-800 rounded-lg p-2'>
            <p className='text-xs text-slate-500 dark:text-slate-400'>Ingresos Totales</p>
            <p className='text-base font-bold text-slate-700 dark:text-slate-300'>
              {formatCurrencyNoDecimals(totalIngresos)}
            </p>
          </div>
          <div className='bg-slate-50 dark:bg-slate-800 rounded-lg p-2'>
            <p className='text-xs text-slate-500 dark:text-slate-400'>Egresos Totales</p>
            <p className='text-base font-bold text-slate-700 dark:text-slate-300'>
              {formatCurrencyNoDecimals(totalEgresos)}
            </p>
          </div>
        </div>
        <div className='h-48'>
          {isLoading ? (
            <Skeleton className='h-full w-full rounded-xl' />
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={pieData}
                  cx='50%'
                  cy='50%'
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey='value'
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrencyNoDecimals(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className='h-full flex items-center justify-center text-gray-500'>
              No hay datos para mostrar
            </div>
          )}
        </div>
        <div className='flex flex-wrap justify-center gap-2 mt-2'>
          {pieData.map((entry, index) => (
            <div key={entry.name} className='flex items-center gap-1'>
              <div
                className='w-3 h-3 rounded-full'
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className='text-xs text-gray-600 dark:text-gray-400'>
                {entry.name}: {formatCurrencyNoDecimals(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
