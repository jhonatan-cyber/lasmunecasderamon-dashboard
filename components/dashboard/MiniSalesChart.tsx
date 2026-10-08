'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import logger from '@/lib/utils/logger';

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils/utils';

type ViewMode = 'month' | 'week';

interface SalesChartPoint {
  label: string;
  ventas: number;
  promedio: number;
  cantidad_ventas?: number;
  mes_num?: number;
  dia_semana?: string;
  dia_espanol?: string;
  orden?: number;
  total?: number;
}

interface MonthSalesData {
  mes: string;
  mes_num: number;
  total: number;
  cantidad_ventas: number;
}

interface WeekSalesData {
  dia_semana: string;
  dia_espanol: string;
  orden: number;
  total: number;
}

interface MonthlyResponse {
  year: number;
  data: MonthSalesData[];
  summary: {
    totalVentas: number;
    promedioMensual: number;
  };
}

interface WeeklyResponse {
  startDate: string;
  endDate: string;
  data: WeekSalesData[];
  summary: {
    totalVentas: number;
    promedioDiario: number;
  };
}

const formatNumber = (amount: number) => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const isHigh = value > (payload[0].payload.promedio || 0);

    return (
      <div className='bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl ring-1 ring-white/5 min-w-[200px]'>
        <div className='flex items-center justify-between mb-3 border-b border-white/10 pb-2'>
          <span className='text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]'>
            {label}
          </span>
          {payload[0].payload.cantidad_ventas && (
            <span className='bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase'>
              {payload[0].payload.cantidad_ventas} vtas
            </span>
          )}
        </div>

        <div className='space-y-1'>
          <div className='flex items-baseline gap-1'>
            <span className='text-emerald-500 text-sm font-black'>$</span>
            <span className='text-white text-2xl font-black tracking-tighter'>
              {formatNumber(value)}
            </span>
          </div>

          <div className='flex items-center gap-1.5 opacity-80'>
            {isHigh ? (
              <TrendingUp className='h-3 w-3 text-emerald-400' />
            ) : (
              <TrendingDown className='h-3 w-3 text-rose-400' />
            )}
            <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
              {isHigh ? 'Sobre el promedio' : 'Bajo el promedio'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function MiniSalesChart() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [monthData, setMonthData] = useState<MonthlyResponse | null>(null);
  const [weekData, setWeekData] = useState<WeeklyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearOffset, setYearOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchMonthData = useCallback(async (offset: number) => {
    try {
      const response = await fetch(`/api/stats/sales-by-month?offset=${offset}`);
      if (!response.ok) throw new Error('Error al obtener datos');
      const result = await response.json();
      if (result.success) setMonthData(result.data);
    } catch (e) {
      logger.captureException(e, { context: 'MiniSalesChart:fetchMonthData' });
    }
  }, []);

  const fetchWeekData = useCallback(async (offset: number) => {
    try {
      const response = await fetch(`/api/stats/sales-by-week?offset=${offset}`);
      if (!response.ok) throw new Error('Error al obtener datos');
      const result = await response.json();
      if (result.success) setWeekData(result.data);
    } catch (e) {
      logger.captureException(e, { context: 'MiniSalesChart:fetchWeekData' });
    }
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchMonthData(yearOffset), fetchWeekData(weekOffset)]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMonthData(yearOffset), fetchWeekData(weekOffset)]).finally(() =>
      setLoading(false)
    );
  }, [yearOffset, weekOffset, fetchMonthData, fetchWeekData]);

  const chartData = useMemo<SalesChartPoint[]>(() => {
    const promedio =
      viewMode === 'month'
        ? monthData?.summary?.promedioMensual || 0
        : weekData?.summary?.promedioDiario || 0;

    if (viewMode === 'month' && monthData?.data) {
      const monthNames = [
        'ENE',
        'FEB',
        'MAR',
        'ABR',
        'MAY',
        'JUN',
        'JUL',
        'AGO',
        'SEP',
        'OCT',
        'NOV',
        'DIC'
      ];

      const fullYearData = monthNames.map((name, index) => ({
        label: name,
        ventas: 0,
        cantidad_ventas: 0,
        promedio: monthData.summary.promedioMensual || 0,
        mes_num: index + 1
      }));

      monthData.data.forEach(item => {
        const monthIndex = item.mes_num - 1;
        if (fullYearData[monthIndex]) {
          fullYearData[monthIndex].ventas = item.total;
          fullYearData[monthIndex].cantidad_ventas = item.cantidad_ventas;
        }
      });

      return fullYearData;
    }
    if (viewMode === 'week' && weekData?.data) {
      return weekData.data.map(item => ({
        ...item,
        label: item.dia_espanol.toUpperCase(),
        ventas: item.total,
        promedio
      }));
    }
    return [];
  }, [viewMode, monthData, weekData]);

  const summary = viewMode === 'month' ? monthData?.summary : weekData?.summary;
  const currentPeriod =
    viewMode === 'month'
      ? `AÑO ${monthData?.year || new Date().getFullYear()}`
      : `SEMANA ${weekData?.startDate ? new Date(weekData.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''} - ${weekData?.endDate ? new Date(weekData.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''}`;

  if (!mounted || (loading && !monthData && !weekData))
    return (
      <div className='h-[500px] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/10 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800'>
        <div className='flex flex-col items-center gap-6'>
          <div className='relative'>
            <div className='h-16 w-16 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin' />
            <div className='absolute inset-0 flex items-center justify-center'>
              <Activity className='h-6 w-6 text-emerald-500 animate-pulse' />
            </div>
          </div>
          <div className='text-center space-y-1'>
            <p className='text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest'>
              Procesando Inteligencia
            </p>
            <p className='text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]'>
              Sincronizando base de datos...
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <div className='w-full space-y-10 group'>
      {}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-8'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center gap-4'>
            <div className='p-3 bg-emerald-500 shadow-xl shadow-emerald-500/20 rounded-2xl'>
              <BarChart3 className='h-6 w-6 text-white' />
            </div>
            <div className='flex flex-col'>
              <h3 className='text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white'>
                Análisis de Rendimiento
              </h3>
              <div className='flex items-center gap-2'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
                <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>
                  {currentPeriod}
                </span>
              </div>
            </div>
          </div>

          {summary && (
            <div aria-live='polite' className='flex items-center gap-10 mt-2'>
              <div className='flex flex-col'>
                <span className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-60'>
                  Ingresos Brutos
                </span>
                <div className='flex items-baseline gap-1'>
                  <span className='text-emerald-500 text-lg font-black'>$</span>
                  <span className='text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic'>
                    {formatNumber(summary.totalVentas)}
                  </span>
                </div>
              </div>
              <div className='h-12 w-px bg-slate-200 dark:bg-slate-800' />
              <div className='flex flex-col'>
                <span className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-60'>
                  Promedio {viewMode === 'month' ? 'Mensual' : 'Diario'}
                </span>
                <span className='text-3xl font-black text-emerald-500 tracking-tighter'>
                  ${' '}
                  {formatNumber(
                    Math.round(
                      viewMode === 'month'
                        ? (summary as any).promedioMensual
                        : (summary as any).promedioDiario
                    )
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {}
        <div className='flex flex-wrap items-center gap-4'>
          {}
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            aria-label='Actualizar datos del gráfico'
            className={cn(
              'p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-xs',
              isRefreshing && 'animate-spin text-emerald-500'
            )}
          >
            <RefreshCw className='h-5 w-5' />
          </button>

          {}
          <div className='flex items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1 shadow-xs'>
            <button
              onClick={() =>
                viewMode === 'month'
                  ? setYearOffset(prev => prev + 1)
                  : setWeekOffset(prev => prev + 1)
              }
              aria-label={viewMode === 'month' ? 'Siguiente año' : 'Siguiente semana'}
              className='p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>
            <div className='px-4 flex flex-col items-center min-w-[80px]'>
              <span className='text-[8px] font-black text-slate-400 uppercase tracking-widest'>
                Navegar
              </span>
              <span className='text-[10px] font-black text-slate-900 dark:text-white uppercase'>
                {viewMode === 'month' ? 'Año' : 'Semana'}
              </span>
            </div>
            <button
              onClick={() =>
                viewMode === 'month'
                  ? setYearOffset(prev => Math.max(0, prev - 1))
                  : setWeekOffset(prev => Math.max(0, prev - 1))
              }
              disabled={viewMode === 'month' ? yearOffset === 0 : weekOffset === 0}
              aria-label={viewMode === 'month' ? 'Año anterior' : 'Semana anterior'}
              className='p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-20'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>

          {}
          <button
            onClick={() => {
              setYearOffset(0);
              setWeekOffset(0);
            }}
            disabled={viewMode === 'month' ? yearOffset === 0 : weekOffset === 0}
            className={cn(
              'px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-xs',
              (viewMode === 'month' ? yearOffset === 0 : weekOffset === 0)
                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-transparent opacity-50 cursor-not-allowed'
                : 'bg-white dark:bg-slate-900 text-emerald-500 border-slate-200 dark:border-slate-800 hover:border-emerald-500/30'
            )}
          >
            Hoy
          </button>

          {}
          <div className='flex p-1 bg-slate-950 dark:bg-slate-900 rounded-[1.25rem] border border-white/5 shadow-2xl'>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500',
                viewMode === 'month'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Mensual
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500',
                viewMode === 'week'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Semanal
            </button>
          </div>
        </div>
      </div>

      {}
      <div className='relative h-[450px] w-full bg-white/40 dark:bg-slate-900/20 backdrop-blur-xs rounded-[3rem] p-8 border border-slate-200/60 dark:border-slate-800/60 shadow-inner overflow-hidden'>
        <div className='absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-emerald-500/20 to-transparent' />

        <ResponsiveContainer width='100%' height='100%'>
          {viewMode === 'week' ? (
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              barGap={12}
            >
              <defs>
                <linearGradient id='barGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#10B981' stopOpacity={1} />
                  <stop offset='100%' stopColor='#059669' stopOpacity={0.8} />
                </linearGradient>
                <filter id='shadow' height='200%'>
                  <feGaussianBlur in='SourceAlpha' stdDeviation='8' result='blur' />
                  <feOffset in='blur' dx='0' dy='8' result='offsetBlur' />
                  <feFlood floodColor='#10B981' floodOpacity='0.2' result='offsetColor' />
                  <feComposite
                    in='offsetColor'
                    in2='offsetBlur'
                    operator='in'
                    result='offsetBlur'
                  />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in='SourceGraphic' />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray='4 4'
                vertical={false}
                stroke='#94a3b8'
                opacity={0.05}
              />
              <XAxis
                dataKey='label'
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}
                dy={20}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                tickFormatter={value => `$${value / 1000}k`}
              />
              <Tooltip
                content={<CustomTooltip viewMode={viewMode} />}
                cursor={{ fill: 'currentColor', opacity: 0.03, radius: 20 }}
              />
              <Bar
                dataKey='ventas'
                name='Ventas'
                fill='url(#barGradient)'
                radius={12}
                animationDuration={2000}
                barSize={isMobile ? 25 : 50}
                filter='url(#shadow)'
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fillOpacity={entry.ventas >= entry.promedio ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id='colorVentas' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#10B981' stopOpacity={0.4} />
                  <stop offset='95%' stopColor='#10B981' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='4 4'
                vertical={false}
                stroke='#94a3b8'
                opacity={0.05}
              />
              <XAxis
                dataKey='label'
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}
                dy={20}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                tickFormatter={value => `$${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
              <Area
                type='monotone'
                dataKey='ventas'
                stroke='#10B981'
                strokeWidth={6}
                fillOpacity={1}
                fill='url(#colorVentas)'
                animationDuration={2500}
                dot={{ r: 6, fill: '#10B981', strokeWidth: 3, stroke: '#fff' }}
                activeDot={{ r: 10, strokeWidth: 4, stroke: '#fff', fill: '#10B981' }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
