/* eslint-disable */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatShortDateEs } from '@/lib/utils/calendarUtils';

interface SalesData {
  totalVentas: number;
  cantidadVentas: number;
  promedioVenta: number;
  totalPropinas: number;
  ventasPorMetodo: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
  ventasPorDia: Array<{
    fecha: string;
    ventas: number;
    cantidad: number;
    propinas: number;
  }>;
}

type SalesPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const PAYMENT_COLORS = ['#10B981', '#3B82F6', '#8B5CF6'];
const PAYMENT_LABELS = ['Efectivo', 'Tarjeta', 'Transferencia'];

const formatNumber = (amount: number) => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
};

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}

const PieTooltip = ({ active, payload }: PieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.fill }} />
          <span className="text-white font-semibold text-sm">{data.name}</span>
        </div>
        <p className="text-emerald-300 font-bold text-lg mt-1">
          $ {formatNumber(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: { fechaCorta: string; cantidad: number; propinas: number } }>;
}

const BarTooltip = ({ active, payload }: BarTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-white font-semibold text-sm mb-2">{data.fechaCorta}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-gray-300 text-xs">Ventas:</span>
            <span className="text-white font-bold text-sm ml-auto">
              $ {formatNumber(payload[0].value)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-gray-300 text-xs">Propinas:</span>
            <span className="text-amber-300 font-bold text-sm ml-auto">
              $ {formatNumber(data.propinas)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-gray-300 text-xs">Cantidad:</span>
            <span className="text-emerald-300 font-bold text-sm ml-auto">
              {data.cantidad}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const renderPieLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function SalesReport() {
  const [period, setPeriod] = useState<SalesPeriod>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [period, startDate, endDate]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period === 'custom') {
        params.append('period', 'custom');
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        params.append('period', period);
      }

      const response = await fetch(`/api/reports/sales?${params}`);
      const data = await response.json();

      if (data.success) {
        setSalesData(data.data);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (value: SalesPeriod) => {
    switch (value) {
      case 'today': return 'Hoy';
      case 'yesterday': return 'Ayer';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      case 'custom': return 'Personalizado';
      default: return 'Hoy';
    }
  };

  const pieData = useMemo(() => {
    if (!salesData?.ventasPorMetodo) return [];
    return [
      { name: 'Efectivo', value: salesData.ventasPorMetodo.efectivo },
      { name: 'Tarjeta', value: salesData.ventasPorMetodo.tarjeta },
      { name: 'Transferencia', value: salesData.ventasPorMetodo.transferencia },
    ].filter(item => item.value > 0);
  }, [salesData]);

  const barData = useMemo(() => {
    if (!salesData?.ventasPorDia) return [];
    return salesData.ventasPorDia.map(dia => {
      const fecha = new Date(dia.fecha);
      return {
        ...dia,
        fechaCorta: formatShortDateEs(fecha),
        diaNum: fecha.getDate().toString().padStart(2, '0'),
        label: formatShortDateEs(fecha),
      };
    });
  }, [salesData]);

  const paymentItems = useMemo(() => {
    if (!salesData?.ventasPorMetodo) return [];

    return [
      { label: 'Efectivo', value: salesData.ventasPorMetodo.efectivo, color: PAYMENT_COLORS[0] },
      { label: 'Tarjeta', value: salesData.ventasPorMetodo.tarjeta, color: PAYMENT_COLORS[1] },
      {
        label: 'Transferencia',
        value: salesData.ventasPorMetodo.transferencia,
        color: PAYMENT_COLORS[2]
      }
    ].filter(item => item.value > 0);
  }, [salesData]);

  const paymentTotal = useMemo(
    () => paymentItems.reduce((sum, item) => sum + item.value, 0),
    [paymentItems]
  );

  const exportReport = () => {
    console.log('Exportando reporte...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos de ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Filtros Rápidos - Action Chips */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'yesterday', label: 'Ayer' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: 'custom', label: 'Personalizado' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setPeriod(chip.id as SalesPeriod)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                period === chip.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm scale-105'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {period === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
              <span className="text-gray-400 font-bold">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          )}
          
          <Button 
            onClick={exportReport} 
            variant="default" 
            className="rounded-xl px-6 bg-gray-900 hover:bg-gray-800 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-lg shadow-gray-200 dark:shadow-blue-900/20 transition-all active:scale-95"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas Principales con Diseño Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: 'Total Ventas', 
            value: salesData ? formatCurrencyNoDecimals(salesData.totalVentas) : '$0',
            sub: `${salesData?.cantidadVentas || 0} transacciones`,
            icon: DollarSign,
            color: 'blue',
            grad: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'
          },
          { 
            title: 'Promedio Venta', 
            value: salesData ? formatCurrencyNoDecimals(salesData.promedioVenta) : '$0',
            sub: 'Valor medio por ticket',
            icon: TrendingUp,
            color: 'emerald',
            grad: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20'
          },
          { 
            title: 'Total Propinas', 
            value: salesData ? formatCurrencyNoDecimals(salesData.totalPropinas) : '$0',
            sub: 'Recaudado para staff',
            icon: Users,
            color: 'purple',
            grad: 'from-purple-50 to-fuchsia-50 dark:from-purple-950/20 dark:to-fuchsia-950/20'
          },
          { 
            title: 'Volumen', 
            value: salesData?.cantidadVentas || 0,
            sub: 'Cantidad de ventas',
            icon: ShoppingCart,
            color: 'amber',
            grad: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20'
          },
        ].map((stat, i) => (
          <Card key={i} className={`relative border-0 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.grad} opacity-50`}></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{stat.title}</CardTitle>
              <div className={`w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center group-hover:rotate-12 transition-transform`}>
                <stat.icon className={`h-5 w-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {stat.value}
              </div>
              <p className="text-xs font-medium text-gray-500 mt-1">
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen de Métodos de Pago - Chips Compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {paymentItems.map((item, index) => (
          <div key={index} className="bg-white dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: item.color }} />
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.label}</p>
                <p className="text-xl font-black text-gray-900 dark:text-gray-100">
                  {formatCurrencyNoDecimals(item.value)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                {paymentTotal > 0 ? ((item.value / paymentTotal) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos de Ventas con Diseño Premium */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Distribución por Método (Pie Chart) */}
        <Card className="xl:col-span-1 border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md">
          <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <TrendingUp className="h-4 w-4 text-violet-600" />
              </div>
              Métodos de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[320px] w-full relative">
              {pieData.length > 0 ? (
                <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {formatCompact(paymentTotal)}
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        strokeWidth={0}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                            style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.15))' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p className="text-sm font-medium italic">Sin datos disponibles</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 space-y-3">
              {paymentItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.label}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">
                    {paymentTotal > 0 ? ((item.value / paymentTotal) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Evolución de Ventas (Bar Chart con Gradientes) */}
        <Card className="xl:col-span-2 border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md">
          <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
              Evolución Temporal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[400px] w-full">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={barData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="premiumSalesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="premiumTipsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                      <filter id="shadow" height="200%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2"/>
                      </filter>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke="currentColor"
                      className="text-gray-100 dark:text-gray-700/50"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="fechaCorta"
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                      className="text-gray-400 dark:text-gray-500"
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      tickFormatter={formatCompact}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                      className="text-gray-400 dark:text-gray-500"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      content={<BarTooltip />} 
                      cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', className: 'text-gray-300 dark:text-gray-600' }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas Brutas"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#premiumSalesAreaGrad)"
                      animationDuration={2000}
                      activeDot={{ r: 6, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2, style: { filter: 'url(#shadow)' } }}
                    />
                    <Area
                      type="monotone"
                      dataKey="propinas"
                      name="Propinas"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#premiumTipsAreaGrad)"
                      animationDuration={2500}
                      activeDot={{ r: 6, fill: "#F59E0B", stroke: "#fff", strokeWidth: 2, style: { filter: 'url(#shadow)' } }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 italic">
                  <p className="text-sm">No se encontraron registros en este rango</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
