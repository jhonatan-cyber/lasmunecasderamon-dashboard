'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Target,
  TrendingDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface SalesData {
  dia_semana: string;
  dia_espanol: string;
  orden: number;
  total: number;
}

interface SalesSummary {
  totalVentas: number;
  promedioDiario: number;
  diaMaxVentas: string;
  diaMinVentas: string;
}

interface SalesResponse {
  startDate: string;
  endDate: string;
  data: SalesData[];
  summary: SalesSummary;
}

const formatNumber = (amount: number) => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: SalesData }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-white font-semibold text-sm mb-2">{data.dia_espanol}</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-gray-300 text-xs">Total:</span>
          <span className="text-white font-bold text-sm ml-auto">
            $ {formatNumber(data.total)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

interface CustomDotProps {
  cx?: number;
  cy?: number;
  value?: number;
}

const CustomActiveDot = ({ cx, cy }: CustomDotProps) => {
  if (cx === undefined || cy === undefined) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="#10B981" opacity={0.2} />
      <circle cx={cx} cy={cy} r={5} fill="#10B981" stroke="#fff" strokeWidth={2} />
    </g>
  );
};

export function WeeklySalesChart() {
  const [salesData, setSalesData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'short'
    });
  }, []);

  const getWeekDates = useCallback((offset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const mondayTarget = new Date(mondayThisWeek);
    mondayTarget.setDate(mondayThisWeek.getDate() - offset * 7);

    const sundayTarget = new Date(mondayTarget);
    sundayTarget.setDate(mondayTarget.getDate() + 6);

    return {
      start: mondayTarget.toISOString().split('T')[0],
      end: sundayTarget.toISOString().split('T')[0]
    };
  }, []);

  const fetchSalesData = useCallback(async (offset: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stats/sales-by-week?offset=${offset}`);

      if (!response.ok) {
        throw new Error('Error al obtener datos de ventas');
      }

      const result = await response.json();

      if (result.success) {
        setSalesData(result.data);
      } else {
        throw new Error(result.message || 'Error en la respuesta');
      }
    } catch (err) {
      setError('Error al cargar datos de ventas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesData(currentWeekOffset);
  }, [currentWeekOffset, fetchSalesData]);

  const handleWeekChange = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeekOffset(prev => prev + 1);
    } else {
      setCurrentWeekOffset(prev => Math.max(0, prev - 1));
    }
  }, []);

  const averageLine = useMemo(() => {
    if (!salesData?.summary?.promedioDiario) return 0;
    return Math.round(salesData.summary.promedioDiario);
  }, [salesData]);

  const chartData = useMemo(() => {
    if (!salesData?.data) return [];
    return salesData.data.map(item => ({
      ...item,
      diaCorto: item.dia_espanol.substring(0, 3),
    }));
  }, [salesData]);

  if (loading) {
    return (
      <Card className="w-full dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-green-50/30 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ventas por Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-sm dark:text-gray-300 text-gray-600">Cargando datos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-red-50/30 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ventas por Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-red-600">
              <p className="text-sm">Error: {error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!salesData) {
    return null;
  }

  const { start, end } = getWeekDates(currentWeekOffset);

  return (
    <Card className="w-full dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-green-50/30 border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <TrendingUp className="h-5 w-5" />
            Ventas por Semana
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex gap-2 order-2 sm:order-1">
              <span className="text-xs sm:text-sm font-medium bg-white/10 px-3 py-2 rounded-md order-1 sm:order-2 w-full sm:w-auto text-center">
                {formatDate(new Date(start))} - {formatDate(new Date(end))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleWeekChange('prev')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs sm:text-sm"
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">anterior</span>
                <span className="sm:hidden">Anterior</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleWeekChange('next')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">siguiente</span>
                <span className="sm:hidden">Siguiente</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="text-center p-4 dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-blue-800/10 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs font-medium mb-1 text-blue-600 dark:text-blue-400">
              Total Ventas
            </p>
            <p className="text-sm sm:text-lg font-bold text-blue-900 dark:text-blue-100 break-words">
              $ {formatNumber(salesData.summary.totalVentas)}
            </p>
          </div>

          <div className="text-center p-4 dark:bg-gradient-to-br dark:from-green-900/20 dark:to-green-800/10 dark:border-green-700 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs font-medium mb-1 text-green-600 dark:text-green-400">Promedio</p>
            <p className="text-sm sm:text-lg font-bold text-green-900 dark:text-green-100 break-words">
              $ {formatNumber(Math.round(salesData.summary.promedioDiario))}
            </p>
          </div>

          <div className="text-center p-4 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-purple-800/10 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-xs font-medium mb-1 text-purple-600 dark:text-purple-400">
              Mejor Día
            </p>
            <p className="text-sm sm:text-lg font-bold text-purple-900 dark:text-purple-100">
              {salesData.summary.diaMaxVentas}
            </p>
          </div>

          <div className="text-center p-4 dark:bg-gradient-to-br dark:from-orange-900/20 dark:to-orange-800/10 dark:border-orange-700 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-xs font-medium mb-1 text-orange-600 dark:text-orange-400">
              Peor Día
            </p>
            <p className="text-sm sm:text-lg font-bold text-orange-900 dark:text-orange-100">
              {salesData.summary.diaMinVentas}
            </p>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-[300px] sm:h-[400px] w-full dark:bg-gray-800/50 bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
                vertical={false}
              />
              <XAxis
                dataKey="diaCorto"
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className="text-gray-600 dark:text-gray-400"
                tickLine={false}
                axisLine={{ stroke: 'currentColor', className: 'text-gray-300 dark:text-gray-600' }}
              />
              <YAxis
                tickFormatter={formatCompact}
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className="text-gray-500 dark:text-gray-400"
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              {averageLine > 0 && (
                <ReferenceLine
                  y={averageLine}
                  stroke="#F59E0B"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Prom: ${formatCompact(averageLine)}`,
                    position: 'right',
                    fill: '#F59E0B',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#weeklyGradient)"
                dot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                activeDot={<CustomActiveDot />}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Legend */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center gap-4 text-xs sm:text-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-sm" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Ventas por Día</span>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <div className="w-4 h-0 border-t-2 border-dashed border-amber-500" />
              <span className="text-gray-500 dark:text-gray-400 text-xs">Promedio</span>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {salesData.data.filter(d => d.total > 0).length} días con ventas
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
