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
} from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatShortDateEs } from '@/lib/calendarUtils';

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
    <div className="space-y-6">
      {/* Filtros y Controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Período:</span>
              </div>
              <Select value={period} onValueChange={value => setPeriod(value as SalesPeriod)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="yesterday">Ayer</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <span className="text-gray-500">a</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {getPeriodLabel(period)}
              </Badge>
              <Button onClick={exportReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData ? formatCurrencyNoDecimals(salesData.totalVentas) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesData?.cantidadVentas || 0} ventas realizadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 bg-gradient-to-br from-green-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData ? formatCurrencyNoDecimals(salesData.promedioVenta) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio por transacción
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 bg-gradient-to-br from-purple-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Propinas</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData ? formatCurrencyNoDecimals(salesData.totalPropinas) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Propinas recibidas
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cantidad Ventas</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData?.cantidadVentas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Transacciones totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métodos de Pago - Donut Chart */}
      <CollapsibleCard
        title="Ventas por Método de Pago"
        headerClassName="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Donut Chart */}
          <div className="h-[280px] sm:h-[350px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={4}
                    strokeWidth={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                        style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Sin datos de métodos de pago</p>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            {paymentItems.map((item, index) => {
              const pct = paymentTotal > 0 ? ((item.value / paymentTotal) * 100).toFixed(1) : '0';
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-10 rounded-full" style={{ backgroundColor: item.color }} />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pct}% del total</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold" style={{ color: item.color }}>
                    {formatCurrencyNoDecimals(item.value)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleCard>

      {/* Ventas por Día - Bar Chart */}
      <CollapsibleCard
        title={<><CalendarDays className="h-5 w-5" /> Ventas por Día</>}
        headerClassName="bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
      >
        <div className="h-[300px] sm:h-[400px] w-full">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="propinasBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  vertical={false}
                />
                <XAxis
                  dataKey="fechaCorta"
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
                <Tooltip content={<BarTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px' }}
                  formatter={(value: string) => (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{value}</span>
                  )}
                />
                <Bar
                  dataKey="ventas"
                  name="Ventas"
                  fill="url(#salesBarGrad)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="propinas"
                  name="Propinas"
                  fill="url(#propinasBarGrad)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <p className="text-sm">No hay datos para mostrar en este período</p>
            </div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}
