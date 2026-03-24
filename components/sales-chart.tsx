/* eslint-disable */
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BarChart3, DollarSign, ShoppingCart, Target, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

interface SalesData {
  mes: string;
  mes_num: number;
  total: number;
  cantidad_ventas: number;
}

interface SalesSummary {
  totalVentas: number;
  totalCantidad: number;
  mesMaxVentas: string;
  mesMinVentas: string;
  promedioMensual: number;
}

interface SalesResponse {
  year: number;
  data: SalesData[];
  summary: SalesSummary;
}

const MONTH_COLORS = [
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#6366F1', '#F97316',
  '#14B8A6', '#06B6D4', '#84CC16', '#F43F5E',
];

const MONTH_GRADIENTS = MONTH_COLORS.map((color, i) => ({
  id: `monthGrad${i}`,
  start: color,
  end: `${color}99`,
}));

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

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-white font-semibold text-sm mb-2">{data.mes}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-gray-300 text-xs">Ventas:</span>
            <span className="text-white font-bold text-sm ml-auto">
              $ {formatNumber(data.total)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-gray-300 text-xs">Cantidad:</span>
            <span className="text-emerald-300 font-bold text-sm ml-auto">
              {data.cantidad_ventas}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
  <div className="flex items-center justify-center mt-2 gap-4">
    <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/50">
      <div className="w-4 h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-sm" />
      <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">Ventas Mensuales</span>
    </div>
  </div>
);

export function SalesChart() {
  const [salesData, setSalesData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentYearOffset, setCurrentYearOffset] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const fetchSalesData = useCallback(async (offset: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stats/sales-by-month?offset=${offset}`);

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
    fetchSalesData(currentYearOffset);
  }, [currentYearOffset, fetchSalesData]);

  const handleYearChange = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentYearOffset(prev => prev + 1);
    } else {
      setCurrentYearOffset(prev => Math.max(0, prev - 1));
    }
  }, []);

  const chartData = useMemo(() => {
    if (!salesData?.data) return [];
    return salesData.data.map(item => ({
      ...item,
      mesCorto: item.mes.substring(0, 3),
    }));
  }, [salesData]);

  if (loading) {
    return (
      <Card className="dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-blue-50/30 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ventas por Mes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm dark:text-gray-300 text-gray-600">Cargando datos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-red-50/30 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ventas por Mes
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

  return (
    <Card className="dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-blue-50/30 border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ventas por Mes
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleYearChange('prev')}
              disabled={currentYearOffset >= 10}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center bg-white/10 px-3 py-1 rounded-md">
              {new Date().getFullYear() - currentYearOffset}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleYearChange('next')}
              disabled={currentYearOffset <= 0}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
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
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total Ventas</p>
            <p className="text-sm sm:text-lg font-bold text-blue-900 dark:text-blue-100 break-words">
              $ {formatNumber(salesData.summary.totalVentas)}
            </p>
          </div>
          <div className="text-center p-4 dark:bg-gradient-to-br dark:from-green-900/20 dark:to-green-800/10 dark:border-green-700 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Cantidad</p>
            <p className="text-sm sm:text-lg font-bold text-green-900 dark:text-green-100 break-words">
              {salesData.summary.totalCantidad}
            </p>
          </div>
          <div className="text-center p-4 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-purple-800/10 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Promedio</p>
            <p className="text-sm sm:text-lg font-bold text-purple-900 dark:text-purple-100 break-words">
              $ {formatNumber(Math.round(salesData.summary.promedioMensual))}
            </p>
          </div>
          <div className="text-center p-4 dark:bg-gradient-to-br dark:from-orange-900/20 dark:to-orange-800/10 dark:border-orange-700 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Mejor Mes</p>
            <p className="text-sm sm:text-lg font-bold text-orange-900 dark:text-orange-100 break-words">
              {salesData.summary.mesMaxVentas}
            </p>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-[300px] sm:h-[400px] w-full dark:bg-gray-800/50 bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              onMouseMove={(state) => {
                if (state?.activeTooltipIndex !== undefined) {
                  setActiveIndex(state.activeTooltipIndex as number);
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                {MONTH_GRADIENTS.map((grad, index) => (
                  <linearGradient key={grad.id} id={grad.id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={grad.start} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={grad.end} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
                vertical={false}
              />
              <XAxis
                dataKey="mesCorto"
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
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }}
              />
              <Legend content={<CustomLegend />} />
              <Bar
                dataKey="total"
                radius={[6, 6, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#monthGrad${index % 12})`}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                    style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Legend */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {salesData.data.filter(m => m.total > 0).length} meses con ventas en {salesData.year}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
