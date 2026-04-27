'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Printer,
  Download,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  ArrowDownCircle,
  ShoppingCart,
  Home,
  Calendar,
  User,
  CreditCard
} from 'lucide-react';
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
import {
  formatCurrencyNoDecimals,
  formatCurrencyCLP,
  formatFechaLarga,
  formatSoloHora
} from '@/lib/utils/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import Paginate from '@/components/shared/Paginate';

// Función para obtener el día de la semana en español
const getDiaSemana = (fecha: string | Date): string => {
  const date = new Date(fecha);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[date.getDay()];
};

// Colores para gráficos
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface CajaDetailsProps {
  caja: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Skeleton para tarjetas de resumen
function SummaryCardSkeleton() {
  return (
    <div className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700'>
      <div className='flex items-center gap-4'>
        <Skeleton className='w-12 h-12 rounded-xl' />
        <div className='flex-1'>
          <Skeleton className='h-3 w-24 mb-2' />
          <Skeleton className='h-6 w-32' />
        </div>
      </div>
    </div>
  );
}

// Skeleton para tabla
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-8 w-full' />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-12 w-full' />
      ))}
    </div>
  );
}

export default function CajaDetails({ caja, open, onOpenChange }: CajaDetailsProps) {
  const cajaId = caja?.id_caja;

  // Estados para ventas, retiros y servicios
  const [ventas, setVentas] = useState<any[]>([]);
  const [retiros, setRetiros] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);

  // Estados de carga
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [retirosLoading, setRetirosLoading] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  // Estados para ventas por categoría
  const [ventasTragosChicas, setVentasTragosChicas] = useState<any>({
    total_venta: 0,
    propinas: 0
  });
  const [ventasChampagne, setVentasChampagne] = useState<any>({ total_venta: 0, propinas: 0 });
  const [ventasBarras, setVentasBarras] = useState<any>({ total_venta: 0, propinas: 0 });
  const [loadingTragosChicas, setLoadingTragosChicas] = useState(false);
  const [loadingChampagne, setLoadingChampagne] = useState(false);
  const [loadingBarras, setLoadingBarras] = useState(false);

  // Estados para filtros
  const [searchVentas, setSearchVentas] = useState('');
  const [searchServicios, setSearchServicios] = useState('');

  // Paginación
  const [ventasPage, setVentasPage] = useState(1);
  const [serviciosPage, setServiciosPage] = useState(1);
  const [retirosPage, setRetirosPage] = useState(1);
  const itemsLimit = 10;

  // Tab activa
  const [activeTab, setActiveTab] = useState('resumen');

  // Efecto para cargar datos cuando el modal abre
  useEffect(() => {
    if (open && cajaId) {
      fetchRetiros();
      fetchVentas();
      fetchServicios();
      fetchResumenFinanciero();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cajaId]);

  // Filtrar ventas
  const filteredVentas = useMemo(() => {
    if (!searchVentas.trim()) return ventas;
    return ventas.filter(
      (v: any) =>
        (v.cliente_nombre || '').toLowerCase().includes(searchVentas.toLowerCase()) ||
        (v.habitacion_nombre || '').toLowerCase().includes(searchVentas.toLowerCase()) ||
        (v.categoria || '').toLowerCase().includes(searchVentas.toLowerCase())
    );
  }, [ventas, searchVentas]);

  // Filtrar servicios
  const filteredServicios = useMemo(() => {
    if (!searchServicios.trim()) return servicios;
    return servicios.filter(
      (s: any) =>
        (s.cliente_nombre || '').toLowerCase().includes(searchServicios.toLowerCase()) ||
        (s.anfitrionas_nombres || '').toLowerCase().includes(searchServicios.toLowerCase()) ||
        (s.habitacion_nombre || '').toLowerCase().includes(searchServicios.toLowerCase())
    );
  }, [servicios, searchServicios]);

  if (!caja) return null;

  const fetchRetiros = async () => {
    setRetirosLoading(true);
    try {
      const resp = await fetch(`/api/cashregister/retiros?id_caja=${caja.id_caja}`);
      const data = await resp.json();
      if (data.success) setRetiros(data.data || []);
    } catch (error) {
      console.error('Error cargando retiros:', error);
    } finally {
      setRetirosLoading(false);
    }
  };

  const fetchResumenFinanciero = async () => {
    setLoadingTragosChicas(true);
    setLoadingChampagne(true);
    setLoadingBarras(true);
    try {
      const [resChicas, resChampagne, resBarras] = await Promise.all([
        fetch(`/api/caja/ventas-tragos-chicas?caja_id=${caja.id_caja}`),
        fetch(`/api/caja/ventas-champagne?caja_id=${caja.id_caja}`),
        fetch(`/api/caja/ventas-barras?caja_id=${caja.id_caja}`)
      ]);
      const dataChicas = await resChicas.json();
      const dataChampagne = await resChampagne.json();
      const dataBarras = await resBarras.json();
      setVentasTragosChicas(dataChicas || { total_venta: 0, propinas: 0 });
      setVentasChampagne(dataChampagne || { total_venta: 0, propinas: 0 });
      setVentasBarras(dataBarras || { total_venta: 0, propinas: 0 });
    } catch (error) {
      console.error('Error fetching financial summary:', error);
    } finally {
      setLoadingTragosChicas(false);
      setLoadingChampagne(false);
      setLoadingBarras(false);
    }
  };

  const fetchVentas = async () => {
    setLoadingVentas(true);
    try {
      const resp = await fetch(`/api/ventas?id_caja=${caja.id_caja}`);
      const data = await resp.json().catch(() => ({ success: false }));
      console.log('API Ventas response:', data);

      // Manejar diferentes estructuras de respuesta
      let ventasData = [];
      if (data.success) {
        if (Array.isArray(data.data)) {
          ventasData = data.data;
        } else if (data.data?.data && Array.isArray(data.data.data)) {
          // Estructura anidada: {success: true, data: {data: [...], total: N}}
          ventasData = data.data.data;
        } else if (data.data?.data && Array.isArray(data.data.data.data)) {
          // Doble anidación
          ventasData = data.data.data.data;
        }
      } else if (Array.isArray(data)) {
        ventasData = data;
      }

      setVentas(ventasData);
      console.log('Ventas cargadas:', ventasData.length);
      if (ventasData.length > 0) {
        console.log('Estructura de venta:', ventasData[0]);
      }
    } catch (error) {
      console.error('Error cargando ventas:', error);
      setVentas([]);
    } finally {
      setLoadingVentas(false);
    }
  };

  const fetchServicios = async () => {
    setLoadingServicios(true);
    try {
      const resp = await fetch(`/api/servicios?id_caja=${caja.id_caja}`);
      const data = await resp.json().catch(() => ({ success: false }));
      if (data.success) setServicios(data.data || []);
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setLoadingServicios(false);
    }
  };

  // Cálculos financieros
  const totalPropinas =
    Number(ventasTragosChicas?.propinas || 0) +
    Number(ventasChampagne?.propinas || 0) +
    Number(ventasBarras?.propinas || 0);
  const totalVentas =
    Number(ventasTragosChicas?.total_venta || 0) +
    Number(ventasChampagne?.total_venta || 0) +
    Number(ventasBarras?.total_venta || 0);
  const totalIngresos = totalVentas + Number(caja?.servicios || 0);
  const totalEgresos =
    Number(caja?.devoluciones || 0) +
    Number(caja?.anticipo || 0) +
    retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0);
  const balanceActual = Number(caja?.monto_apertura || 0) + totalIngresos - totalEgresos;

  // Datos para gráfico de barras
  const chartData = [
    {
      name: 'Tragos',
      valor: ventasTragosChicas?.total_venta || 0,
      propinas: ventasTragosChicas?.propinas || 0
    },
    {
      name: 'Champaña',
      valor: ventasChampagne?.total_venta || 0,
      propinas: ventasChampagne?.propinas || 0
    },
    {
      name: 'Barras',
      valor: ventasBarras?.total_venta || 0,
      propinas: ventasBarras?.propinas || 0
    },
    { name: 'Servicios', valor: caja?.servicios || 0, propinas: 0 }
  ];

  // Datos para gráfico de pie (distribución de ingresos)
  const pieData = [
    { name: 'Tragos', value: ventasTragosChicas?.total_venta || 0 },
    { name: 'Champaña', value: ventasChampagne?.total_venta || 0 },
    { name: 'Barras', value: ventasBarras?.total_venta || 0 },
    { name: 'Servicios', value: caja?.servicios || 0 }
  ].filter(d => d.value > 0);

  // Pagination
  const getPaginatedItems = (items: any[], page: number) => {
    const safeItems = Array.isArray(items) ? items : [];
    const startIndex = (page - 1) * itemsLimit;
    return safeItems.slice(startIndex, startIndex + itemsLimit);
  };

  const totalPages = (items: any[]) => {
    const safeItems = Array.isArray(items) ? items : [];
    return Math.ceil(safeItems.length / itemsLimit);
  };

  // Estados de carga combinados
  const isLoadingSummary = loadingTragosChicas || loadingChampagne || loadingBarras;

  const estadoInfo =
    caja.estado === 1
      ? { label: 'En curso', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
      : { label: 'Cerrada', color: 'bg-slate-500/10 text-slate-600 border-slate-200' };

  // Función para imprimir
  const handlePrint = () => {
    window.print();
  };

  // Función para exportar a CSV
  const handleExport = () => {
    const data = {
      caja: {
        id: caja.id_caja,
        fecha_apertura: caja.fecha_apertura,
        cajero: caja.cajero_nombre,
        monto_apertura: caja.monto_apertura
      },
      resumen: {
        total_ventas: totalVentas,
        total_servicios: caja.servicios,
        total_propina: totalPropinas,
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        balance_actual: balanceActual
      },
      ventas: ventas,
      servicios: servicios,
      retiros: retiros
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caja-${caja.id_caja}-resumen.json`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-7xl max-h-[95vh] flex flex-col p-0 w-[95vw] overflow-hidden rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900 print:max-w-full print:w-full print:h-auto print:overflow-visible'>
        <DialogHeader className='p-6 pb-2 border-b flex-shrink-0 bg-white dark:bg-slate-900 print:hidden'>
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-bold text-slate-900 dark:text-white flex items-center gap-4'>
              <Calendar className='w-5 h-5 text-gray-500' />
              Detalles de Caja - {getDiaSemana(caja.fecha_apertura)}{' '}
              <Badge
                variant='secondary'
                className={`${estadoInfo.color} rounded-xl px-4 py-1 text-xs font-black uppercase tracking-widest border shadow-sm`}
              >
                {estadoInfo.label}
              </Badge>
            </DialogTitle>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='rounded-full gap-2'
                onClick={handlePrint}
              >
                <Printer className='w-4 h-4' />
                <span className='hidden sm:inline'>Imprimir</span>
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='rounded-full gap-2'
                onClick={handleExport}
              >
                <Download className='w-4 h-4' />
                <span className='hidden sm:inline'>Exportar</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Stats - Sticky Header */}
        <div className='sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-6 py-4 print:hidden'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {isLoadingSummary ? (
              <>
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
              </>
            ) : (
              <>
                <div className='bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center'>
                      <TrendingUp className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
                    </div>
                    <div>
                      <p className='text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase'>
                        Ingresos
                      </p>
                      <p className='text-lg font-black text-gray-900 dark:text-white'>
                        {formatCurrencyNoDecimals(totalIngresos)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center'>
                      <TrendingDown className='w-5 h-5 text-rose-600 dark:text-rose-400' />
                    </div>
                    <div>
                      <p className='text-xs font-bold text-rose-600 dark:text-rose-400 uppercase'>
                        Egresos
                      </p>
                      <p className='text-lg font-black text-gray-900 dark:text-white'>
                        {formatCurrencyNoDecimals(totalEgresos)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center'>
                      <Wallet className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                    </div>
                    <div>
                      <p className='text-xs font-bold text-blue-600 dark:text-blue-400 uppercase'>
                        Balance
                      </p>
                      <p className='text-lg font-black text-gray-900 dark:text-white'>
                        {formatCurrencyNoDecimals(balanceActual)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center'>
                      <CreditCard className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                    </div>
                    <div>
                      <p className='text-xs font-bold text-amber-600 dark:text-amber-400 uppercase'>
                        Propinas
                      </p>
                      <p className='text-lg font-black text-gray-900 dark:text-white'>
                        {formatCurrencyNoDecimals(totalPropinas)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='flex-1 flex flex-col min-h-0'
        >
          <TabsList className='mx-6 mt-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl print:hidden'>
            <TabsTrigger
              value='resumen'
              className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value='ventas'
              className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
            >
              Ventas ({ventas.length})
            </TabsTrigger>
            <TabsTrigger
              value='servicios'
              className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
            >
              Servicios ({servicios.length})
            </TabsTrigger>
            <TabsTrigger
              value='retiros'
              className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
            >
              Retiros ({retiros.length})
            </TabsTrigger>
          </TabsList>

          <div className='flex-1 overflow-y-auto custom-scrollbar p-6'>
            {/* TAB RESUMEN */}
            <TabsContent value='resumen' className='mt-0 space-y-8'>
              {/* Info de Caja */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2'>
                <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700'>
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center'>
                      <User className='w-5 h-5 text-emerald-600' />
                    </div>
                    <div>
                      <p className='text-xs font-bold text-gray-500 uppercase'>Abierta por</p>
                      <p className='font-bold text-gray-900 dark:text-white'>
                        {caja.cajero_nombre || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {formatFechaLarga(caja.fecha_apertura)} • {formatSoloHora(caja.fecha_apertura)}
                  </p>
                </div>
                {caja.fecha_cierre && (
                  <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center gap-3 mb-3'>
                      <div className='w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center'>
                        <User className='w-5 h-5 text-slate-600' />
                      </div>
                      <div>
                        <p className='text-xs font-bold text-gray-500 uppercase'>Cerrada por</p>
                        <p className='font-bold text-gray-900 dark:text-white'>
                          {caja.cajero_cierre_nombre || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {formatFechaLarga(caja.fecha_cierre)} • {formatSoloHora(caja.fecha_cierre)}
                    </p>
                  </div>
                )}
              </div>

              {/* Gráficos */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden'>
                {/* Gráfico de Barras */}
                <div className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'>
                  <h4 className='text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                    <TrendingUp className='w-4 h-4 text-blue-500' />
                    Ventas por Categoría
                  </h4>
                  <div className='h-64'>
                    {isLoadingSummary ? (
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
                          <Bar
                            dataKey='propinas'
                            fill='#f59e0b'
                            radius={[8, 8, 0, 0]}
                            name='Propinas'
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Gráfico de Pie */}
                <div className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'>
                  <h4 className='text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                    <Wallet className='w-4 h-4 text-emerald-500' />
                    Distribución de Ingresos
                  </h4>
                  <div className='h-64'>
                    {isLoadingSummary ? (
                      <Skeleton className='h-full w-full rounded-xl' />
                    ) : pieData.length > 0 ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx='50%'
                            cy='50%'
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey='value'
                          >
                            {pieData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
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
                  {/* Leyenda */}
                  <div className='flex flex-wrap justify-center gap-3 mt-2'>
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className='flex items-center gap-1'>
                        <div
                          className='w-3 h-3 rounded-full'
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className='text-xs text-gray-600 dark:text-gray-400'>
                          {entry.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detalle Financiero */}
              <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
                <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
                  <h4 className='font-bold text-gray-900 dark:text-white'>Detalle Financiero</h4>
                </div>
                <div className='p-4 space-y-3'>
                  {isLoadingSummary ? (
                    <>
                      <Skeleton className='h-10 w-full' />
                      <Skeleton className='h-10 w-full' />
                      <Skeleton className='h-10 w-full' />
                      <Skeleton className='h-12 w-full' />
                    </>
                  ) : (
                    <>
                      <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          Monto Apertura
                        </span>
                        <span className='font-bold text-gray-900 dark:text-white'>
                          {formatCurrencyNoDecimals(caja.monto_apertura)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          Ventas Tragos
                        </span>
                        <span className='font-bold text-gray-900 dark:text-white'>
                          {formatCurrencyNoDecimals(ventasTragosChicas?.total_venta || 0)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          Ventas Champaña
                        </span>
                        <span className='font-bold text-gray-900 dark:text-white'>
                          {formatCurrencyNoDecimals(ventasChampagne?.total_venta || 0)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          Ventas Barras
                        </span>
                        <span className='font-bold text-gray-900 dark:text-white'>
                          {formatCurrencyNoDecimals(ventasBarras?.total_venta || 0)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>Servicios</span>
                        <span className='font-bold text-emerald-600'>
                          {formatCurrencyNoDecimals(caja.servicios || 0)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
                          Devoluciones
                        </span>
                        <span className='font-bold text-rose-600'>
                          -{formatCurrencyNoDecimals(caja.devoluciones || 0)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>Anticipos</span>
                        <span className='font-bold text-rose-600'>
                          -{formatCurrencyNoDecimals(caja.anticipo || 0)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>Retiros</span>
                        <span className='font-bold text-rose-600'>
                          -{formatCurrencyNoDecimals(retiros.reduce((sum, r) => sum + r.monto, 0))}
                        </span>
                      </div>
                      <div className='flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-900/20 -mx-4 px-4 mt-2'>
                        <span className='font-bold text-emerald-800 dark:text-emerald-200'>
                          Balance Final
                        </span>
                        <span className='text-xl font-black text-emerald-700 dark:text-emerald-300'>
                          {formatCurrencyNoDecimals(balanceActual)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB VENTAS */}
            <TabsContent value='ventas' className='mt-0 space-y-4'>
              {/* Buscador */}
              <div className='relative print:hidden'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  placeholder='Buscar por cliente, habitación o categoría...'
                  value={searchVentas}
                  onChange={e => setSearchVentas(e.target.value)}
                  className='pl-10 rounded-xl'
                />
              </div>

              {loadingVentas ? (
                <TableSkeleton rows={5} />
              ) : filteredVentas.length === 0 ? (
                <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
                  <ShoppingCart className='w-12 h-12 mx-auto mb-3 opacity-30' />
                  <p className='font-medium mb-2'>
                    {ventas.length === 0
                      ? 'No hay ventas registradas en esta caja'
                      : 'No hay ventas que coincidan con la búsqueda'}
                  </p>
                  {ventas.length === 0 && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={fetchVentas}
                      className='rounded-full text-xs'
                    >
                      Reintentar carga
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
                    <div className='overflow-x-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow className='bg-gray-50 dark:bg-gray-800/50'>
                            <TableHead className='font-bold text-xs'>CLIENTE</TableHead>
                            <TableHead className='font-bold text-xs'>HAB.</TableHead>
                            <TableHead className='font-bold text-xs'>CAT.</TableHead>
                            <TableHead className='font-bold text-xs text-right'>CANT.</TableHead>
                            <TableHead className='font-bold text-xs text-right'>PRECIO</TableHead>
                            <TableHead className='font-bold text-xs text-right'>PROPINA</TableHead>
                            <TableHead className='font-bold text-xs'>HORA</TableHead>
                            <TableHead className='font-bold text-xs'>PAGO</TableHead>
                            <TableHead className='font-bold text-xs text-right'>TOTAL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getPaginatedItems(filteredVentas, ventasPage).map(
                            (venta: any, idx: number) => (
                              <TableRow
                                key={idx}
                                className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              >
                                <TableCell className='font-medium text-sm'>
                                  {venta.cliente_nombre || 'General'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='outline' className='text-xs'>
                                    {venta.habitacion_nombre ||
                                      (venta.habitacion_id ? 'Habitación' : 'Barra')}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-sm capitalize text-gray-600'>
                                  {venta.item_count || 0} items
                                </TableCell>
                                <TableCell className='text-right font-bold'>
                                  {venta.item_count || 0}
                                </TableCell>
                                <TableCell className='text-right text-sm text-gray-600'>
                                  {formatCurrencyNoDecimals(venta.sub_total)}
                                </TableCell>
                                <TableCell className='text-right text-sm text-amber-600'>
                                  {formatCurrencyNoDecimals(venta.propina)}
                                </TableCell>
                                <TableCell className='text-sm text-gray-500'>
                                  {formatSoloHora(venta.fecha_crea)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='secondary' className='text-xs capitalize'>
                                    {venta.metodo_pago || 'efectivo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-right font-black'>
                                  {formatCurrencyNoDecimals(venta.total)}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  {totalPages(filteredVentas) > 1 && (
                    <div className='print:hidden'>
                      <Paginate
                        page={ventasPage}
                        totalPages={totalPages(filteredVentas)}
                        setPage={setVentasPage}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* TAB SERVICIOS */}
            <TabsContent value='servicios' className='mt-0 space-y-4'>
              {/* Buscador */}
              <div className='relative print:hidden'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  placeholder='Buscar por cliente, anfitriona o habitación...'
                  value={searchServicios}
                  onChange={e => setSearchServicios(e.target.value)}
                  className='pl-10 rounded-xl'
                />
              </div>

              {loadingServicios ? (
                <TableSkeleton rows={5} />
              ) : filteredServicios.length === 0 ? (
                <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
                  <Home className='w-12 h-12 mx-auto mb-3 opacity-30' />
                  <p>No hay servicios registrados</p>
                </div>
              ) : (
                <>
                  <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
                    <div className='overflow-x-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow className='bg-gray-50 dark:bg-gray-800/50'>
                            <TableHead className='font-bold text-xs'>CLIENTE</TableHead>
                            <TableHead className='font-bold text-xs'>ANFITRIONAS</TableHead>
                            <TableHead className='font-bold text-xs'>HAB.</TableHead>
                            <TableHead className='font-bold text-xs text-right'>SERVICIO</TableHead>
                            <TableHead className='font-bold text-xs text-right'>
                              HABITACIÓN
                            </TableHead>
                            <TableHead className='font-bold text-xs text-right'>IVA</TableHead>
                            <TableHead className='font-bold text-xs'>FECHA</TableHead>
                            <TableHead className='font-bold text-xs'>PAGO</TableHead>
                            <TableHead className='font-bold text-xs text-right'>TOTAL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getPaginatedItems(filteredServicios, serviciosPage).map(
                            (servicio: any, idx: number) => (
                              <TableRow
                                key={idx}
                                className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              >
                                <TableCell className='font-medium text-sm'>
                                  {servicio.cliente_nombre || 'N/A'}
                                </TableCell>
                                <TableCell className='text-sm text-gray-600 italic'>
                                  {servicio.anfitrionas_nombres || 'Sin asignar'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='outline' className='text-xs'>
                                    {servicio.habitacion_nombre || 'N/A'}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-right text-sm font-semibold text-emerald-600'>
                                  {formatCurrencyNoDecimals(servicio.monto || 0)}
                                </TableCell>
                                <TableCell className='text-right text-sm font-semibold text-blue-600'>
                                  {formatCurrencyNoDecimals(servicio.precio_habitacion || 0)}
                                </TableCell>
                                <TableCell className='text-right text-sm font-semibold text-purple-600'>
                                  {formatCurrencyNoDecimals(servicio.iva || 0)}
                                </TableCell>
                                <TableCell className='text-sm text-gray-500'>
                                  {formatFechaLarga(servicio.fecha_crea)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='secondary' className='text-xs capitalize'>
                                    {servicio.metodo_pago || 'efectivo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-right font-black'>
                                  {formatCurrencyNoDecimals(servicio.total || 0)}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  {totalPages(filteredServicios) > 1 && (
                    <div className='print:hidden'>
                      <Paginate
                        page={serviciosPage}
                        totalPages={totalPages(filteredServicios)}
                        setPage={setServiciosPage}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* TAB RETIROS */}
            <TabsContent value='retiros' className='mt-0 space-y-4'>
              {retirosLoading ? (
                <TableSkeleton rows={5} />
              ) : retiros.length === 0 ? (
                <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
                  <ArrowDownCircle className='w-12 h-12 mx-auto mb-3 opacity-30' />
                  <p>No hay retiros registrados</p>
                </div>
              ) : (
                <>
                  <div className='space-y-3'>
                    {getPaginatedItems(retiros, retirosPage).map((retiro: any, idx: number) => (
                      <div
                        key={idx}
                        className='bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:shadow-md transition-shadow'
                      >
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center'>
                            <ArrowDownCircle className='w-6 h-6 text-orange-600' />
                          </div>
                          <div>
                            <p className='font-bold text-gray-900 dark:text-white'>
                              {retiro.motivo || 'Sin motivo'}
                            </p>
                            <p className='text-xs text-gray-500'>
                              {formatFechaLarga(retiro.fecha_retiro)} •{' '}
                              {formatSoloHora(retiro.fecha_retiro)}
                            </p>
                            <p className='text-xs text-gray-400'>
                              Por: {retiro.cajero_nombre || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='text-xl font-black text-orange-600'>
                            -{formatCurrencyCLP(retiro.monto)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {retiros.length > 0 && (
                    <div className='bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800'>
                      <div className='flex justify-between items-center'>
                        <span className='font-bold text-orange-800 dark:text-orange-200'>
                          Total Retirado
                        </span>
                        <span className='text-xl font-black text-orange-700 dark:text-orange-300'>
                          {formatCurrencyCLP(retiros.reduce((sum, r) => sum + r.monto, 0))}
                        </span>
                      </div>
                    </div>
                  )}
                  {totalPages(retiros) > 1 && (
                    <div className='print:hidden'>
                      <Paginate
                        page={retirosPage}
                        totalPages={totalPages(retiros)}
                        setPage={setRetirosPage}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className='flex-shrink-0 border-t border-slate-100 dark:border-slate-800 p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center px-6 rounded-b-2xl print:hidden'>
          <Button
            variant='outline'
            size='sm'
            className='rounded-full px-8 bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all duration-200 font-bold gap-2'
            onClick={() => onOpenChange(false)}
          >
            <X className='w-4 h-4' />
            Cerrar Detalles
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
