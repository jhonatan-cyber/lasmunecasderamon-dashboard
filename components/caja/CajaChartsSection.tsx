'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Package, Wallet } from 'lucide-react';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface ProductoVenta {
  producto: string;
  unidades: number;
  monto: number;
}

interface ShotsVendidos {
  monto: number;
  cantidad: number;
}

interface CajaChartsSectionProps {
  isLoading: boolean;
  totalIngresos: number;
  totalEgresos: number;
  ventasTragos: number;
  ventasChampagne: number;
  ventasBarras: number;
  servicios: number;
  ventasPorProducto?: ProductoVenta[];
  /** Shots servidos en la caja partidos por precio (migración 039). Corte transversal. */
  shotsCliente?: ShotsVendidos;
  shotsAnfitriona?: ShotsVendidos;
}

const truncateName = (name: string, max = 18) =>
  name.length > max ? `${name.slice(0, max - 1)}…` : name;

interface ProductoTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ProductoVenta }>;
}

const ProductoTooltip = ({ active, payload }: ProductoTooltipProps) => {
  if (!active || !payload?.length) return null;
  const { producto, unidades, monto } = payload[0].payload;
  return (
    <div className='bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl max-w-[220px]'>
      <p className='text-white font-semibold text-sm mb-2'>{producto}</p>
      <div className='space-y-1.5'>
        <div className='flex items-center justify-between gap-4'>
          <span className='text-gray-300 text-xs'>Monto:</span>
          <span className='text-emerald-300 font-bold text-sm'>
            {formatCurrencyNoDecimals(monto)}
          </span>
        </div>
        <div className='flex items-center justify-between gap-4'>
          <span className='text-gray-300 text-xs'>Unidades:</span>
          <span className='text-blue-300 text-sm'>{unidades}</span>
        </div>
      </div>
    </div>
  );
};

export function CajaChartsSection({
  isLoading,
  totalIngresos,
  totalEgresos,
  ventasTragos,
  ventasChampagne,
  ventasBarras,
  servicios,
  ventasPorProducto = [],
  shotsCliente = { monto: 0, cantidad: 0 },
  shotsAnfitriona = { monto: 0, cantidad: 0 }
}: CajaChartsSectionProps) {
  // La plata de los shots ya está sumada en las ventas de la caja: es un corte
  // transversal para ver cuánto entró a precio de cliente y cuánto a precio de anfitriona.
  const hayShots =
    Number(shotsCliente.cantidad || 0) > 0 || Number(shotsAnfitriona.cantidad || 0) > 0;
  const shots = [
    { label: 'Cliente', datos: shotsCliente },
    { label: 'Anfitriona', datos: shotsAnfitriona }
  ];
  const pieData = [
    { name: 'Tragos', value: ventasTragos },
    { name: 'Champaña', value: ventasChampagne },
    { name: 'Barras', value: ventasBarras },
    { name: 'Servicios', value: servicios }
  ].filter(item => item.value > 0);

  const productoData = ventasPorProducto.map(item => ({
    ...item,
    shortName: truncateName(item.producto)
  }));
  const totalUnidades = productoData.reduce((sum, item) => sum + Number(item.unidades || 0), 0);
  const topProducto = productoData[0];
  const chartHeight = Math.max(200, productoData.length * 34 + 40);

  return (
    <div id='charts-container' className='grid grid-cols-1 lg:grid-cols-2 gap-6 items-start'>
      <div
        id='chart-pie'
        className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs'
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
                <Tooltip formatter={value => formatCurrencyNoDecimals(Number(value ?? 0))} />
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

        {hayShots && (
          <div className='mt-4 pt-3 border-t border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400'>
                Shots vendidos
              </span>
              <span className='text-[10px] text-gray-400 dark:text-gray-500'>
                Ya incluidos en las ventas
              </span>
            </div>
            <div className='mt-2 space-y-1'>
              {shots.map(item => (
                <div
                  key={item.label}
                  className='flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 dark:bg-amber-900/20'
                >
                  <span className='text-xs text-amber-700 dark:text-amber-300'>
                    {item.label} · {Number(item.datos.cantidad || 0)} shots
                  </span>
                  <span className='text-sm font-bold text-amber-800 dark:text-amber-200'>
                    {formatCurrencyNoDecimals(item.datos.monto || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        id='chart-products'
        className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs'
      >
        <h4 className='text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
          <Package className='w-4 h-4 text-blue-500' />
          Ventas por Producto
        </h4>
        <div className='grid grid-cols-2 gap-2 mb-3'>
          <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2'>
            <p className='text-xs text-blue-600 dark:text-blue-400'>Unidades Vendidas</p>
            <p className='text-base font-bold text-blue-700 dark:text-blue-300'>{totalUnidades}</p>
          </div>
          <div className='bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2'>
            <p className='text-xs text-emerald-600 dark:text-emerald-400'>Producto Top</p>
            <p
              className='text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate'
              title={topProducto?.producto}
            >
              {topProducto ? truncateName(topProducto.producto, 14) : '—'}
            </p>
          </div>
        </div>
        <div style={{ height: chartHeight }}>
          {isLoading ? (
            <Skeleton className='h-full w-full rounded-xl' />
          ) : productoData.length > 0 ? (
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={productoData}
                layout='vertical'
                margin={{ top: 5, right: 16, left: 4, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' horizontal={false} />
                <XAxis
                  type='number'
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `$${v / 1000}k`}
                />
                <YAxis
                  type='category'
                  dataKey='shortName'
                  width={110}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip
                  content={<ProductoTooltip />}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                />
                <Bar dataKey='monto' name='Monto' radius={[0, 8, 8, 0]} barSize={18}>
                  {productoData.map((_, index) => (
                    <Cell key={`prod-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className='h-full flex items-center justify-center text-gray-500'>
              No hay ventas de productos en esta caja
            </div>
          )}
        </div>
        <div className='mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between'>
          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
            Total vendido:
          </span>
          <span className='text-sm font-bold text-gray-900 dark:text-white'>
            {formatCurrencyNoDecimals(productoData.reduce((sum, item) => sum + item.monto, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
