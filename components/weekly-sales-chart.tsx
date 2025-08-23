'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  TrendingDown
} from 'lucide-react';

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

export function WeeklySalesChart() {
  const [salesData, setSalesData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const formatNumber = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getWeekDates = (offset: number) => {
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
  };

  const fetchSalesData = async (offset: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stats/sales-by-week?offset=${offset}`);

      if (!response.ok) {
        throw new Error('Error al obtener datos de ventas');
      }

      const result = await response.json();

      if (result.success) {
        console.log('📊 [WEEKLY SALES] Datos recibidos:', result.data);
        console.log('📊 [WEEKLY SALES] Total ventas:', result.data.summary.totalVentas);
        console.log(
          '📊 [WEEKLY SALES] Tipo de total ventas:',
          typeof result.data.summary.totalVentas
        );
        setSalesData(result.data);
      } else {
        throw new Error(result.message || 'Error en la respuesta');
      }
    } catch (err) {
      setError('Error al cargar datos de ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData(currentWeekOffset);
  }, [currentWeekOffset]);

  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeekOffset(currentWeekOffset + 1);
    } else {
      setCurrentWeekOffset(Math.max(0, currentWeekOffset - 1));
    }
  };

  const getMaxValue = () => {
    if (!salesData?.data) return 350000;
    const maxValue = Math.max(...salesData.data.map(item => item.total));
    if (maxValue === 0) return 50000;
    return Math.ceil(maxValue / 50000) * 50000;
  };

  if (loading) {
    return (
      <Card className='w-full dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-green-50/30 border-0 shadow-lg'>
        <CardHeader className='bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg'>
          <CardTitle className='flex items-center gap-2'>
            <TrendingUp className='h-5 w-5' />
            Ventas por Semana
          </CardTitle>
        </CardHeader>
        <CardContent className='p-6'>
          <div className='flex items-center justify-center h-64'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto'></div>
              <p className='mt-2 text-sm dark:text-gray-300 text-gray-600'>Cargando datos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className='w-full dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-red-50/30 border-0 shadow-lg'>
        <CardHeader className='bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg'>
          <CardTitle className='flex items-center gap-2'>
            <TrendingUp className='h-5 w-5' />
            Ventas por Semana
          </CardTitle>
        </CardHeader>
        <CardContent className='p-6'>
          <div className='flex items-center justify-center h-64'>
            <div className='text-center text-red-600'>
              <p className='text-sm'>Error: {error}</p>
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
  const maxValue = getMaxValue();

  return (
    <Card className='w-full dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-green-50/30 border-0 shadow-lg overflow-hidden'>
      <CardHeader className='bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sm:p-6'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <CardTitle className='flex items-center gap-2 text-lg sm:text-xl'>
            <TrendingUp className='h-5 w-5' />
            Ventas por Semana
          </CardTitle>
          <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto'>
            <div className='flex gap-2 order-2 sm:order-1'>
              <span className='text-xs sm:text-sm font-medium bg-white/10 px-3 py-2 rounded-md order-1 sm:order-2 w-full sm:w-auto text-center'>
                {formatDate(new Date(start))} - {formatDate(new Date(end))}
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleWeekChange('prev')}
                className='bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs sm:text-sm'
              >
                <ChevronLeft className='h-4 w-4 sm:mr-1' />
                <span className='hidden sm:inline'>anterior</span>
                <span className='sm:hidden'>Anterior</span>
              </Button>

              <Button
                variant='outline'
                size='sm'
                onClick={() => handleWeekChange('next')}
                className='bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs sm:text-sm'
              >
                <span className='hidden sm:inline'>siguiente</span>
                <span className='sm:hidden'>Siguiente</span>
                <ChevronRight className='h-4 w-4 sm:ml-1' />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

             <CardContent className='p-6'>
         {/* Resumen mejorado y responsivo */}
         <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
                     <div className='text-center p-4 dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-blue-800/10 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm'>
            <div className='flex items-center justify-center mb-2'>
              <DollarSign className='h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400' />
            </div>
            <p className='text-xs font-medium mb-1 text-blue-600 dark:text-blue-400'>
              Total Ventas
            </p>
            <p className='text-sm sm:text-lg font-bold text-blue-900 dark:text-blue-100 break-words'>
              $ {formatNumber(salesData.summary.totalVentas)}
            </p>
          </div>

                     <div className='text-center p-4 dark:bg-gradient-to-br dark:from-green-900/20 dark:to-green-800/10 dark:border-green-700 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm'>
            <div className='flex items-center justify-center mb-2'>
              <Target className='h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400' />
            </div>
            <p className='text-xs font-medium mb-1 text-green-600 dark:text-green-400'>Promedio</p>
            <p className='text-sm sm:text-lg font-bold text-green-900 dark:text-green-100 break-words'>
              $ {formatNumber(Math.round(salesData.summary.promedioDiario))}
            </p>
          </div>

                     <div className='text-center p-4 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-purple-800/10 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm'>
            <div className='flex items-center justify-center mb-2'>
              <TrendingUp className='h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400' />
            </div>
            <p className='text-xs font-medium mb-1 text-purple-600 dark:text-purple-400'>
              Mejor Día
            </p>
            <p className='text-sm sm:text-lg font-bold text-purple-900 dark:text-purple-100'>
              {salesData.summary.diaMaxVentas}
            </p>
          </div>

                     <div className='text-center p-4 dark:bg-gradient-to-br dark:from-orange-900/20 dark:to-orange-800/10 dark:border-orange-700 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 shadow-sm'>
            <div className='flex items-center justify-center mb-2'>
              <TrendingDown className='h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400' />
            </div>
            <p className='text-xs font-medium mb-1 text-orange-600 dark:text-orange-400'>
              Peor Día
            </p>
            <p className='text-sm sm:text-lg font-bold text-orange-900 dark:text-orange-100'>
              {salesData.summary.diaMinVentas}
            </p>
          </div>
        </div>

                 {/* Gráfico completamente responsive y optimizado */}
         <div className='space-y-6'>
           <div className='relative dark:bg-gray-800 bg-white rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700'>
            {/* Container del gráfico con padding adaptativo */}
            <div
              className='relative w-full'
              style={{
                paddingLeft: 'clamp(40px, 8vw, 60px)',
                paddingRight: 'clamp(10px, 2vw, 20px)',
                paddingBottom: 'clamp(30px, 6vw, 40px)',
                paddingTop: 'clamp(15px, 3vw, 20px)'
              }}
            >
                             {/* Área del gráfico con altura adaptativa */}
               <div className='relative w-full h-64'>
                 {/* Líneas de cuadrícula horizontales */}
                 <div className='absolute inset-0 flex flex-col justify-between'>
                   {Array.from({ length: 5 }, (_, i) => (
                     <div
                       key={i}
                       className='border-t border-gray-200 dark:border-gray-600 opacity-50'
                     ></div>
                   ))}
                 </div>

                                                                     {/* SVG para el gráfico de barras */}
                   <svg className='absolute inset-0 h-full' style={{ overflow: 'visible', marginLeft: 'clamp(35px, 8vw, 50px)', width: 'calc(100% - clamp(35px, 8vw, 50px))' }}>
                   <defs>
                     <linearGradient id='barGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
                       <stop offset='0%' stopColor='#10B981' />
                       <stop offset='100%' stopColor='#059669' />
                     </linearGradient>
                     <linearGradient id='barHoverGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
                       <stop offset='0%' stopColor='#34D399' />
                       <stop offset='100%' stopColor='#10B981' />
                     </linearGradient>
                   </defs>

                                                                               {/* Barras */}
                     {salesData.data.map((day, index) => {
                       // Calcular posición X para alinear con las etiquetas de días
                       const availableWidth = 100; // Ancho disponible en el SVG
                       const barSpacing = availableWidth / (salesData.data.length - 1);
                       const x = index * barSpacing;
                       const yPercent = maxValue > 0 ? (day.total / maxValue) * 100 : 0;
                       const y = 100 - yPercent;
                       const barWidth = Math.min(barSpacing * 0.6, 6); // 60% del espacio entre barras, máximo 6%
                       const barX = x - (barWidth / 2); // Centrar la barra en el punto
                     
                     return (
                       <g key={day.dia_semana}>
                         {/* Barra principal */}
                         <rect
                           x={`${barX}%`}
                           y={`${y}%`}
                           width={`${barWidth}%`}
                           height={`${100 - y}%`}
                           fill='url(#barGradient)'
                           className='hover:fill-[url(#barHoverGradient)] transition-all duration-300 cursor-pointer drop-shadow-sm'
                           vectorEffect='non-scaling-stroke'
                           rx='2'
                           ry='2'
                         />
                         
                         {/* Borde superior de la barra */}
                         <rect
                           x={`${barX}%`}
                           y={`${y}%`}
                           width={`${barWidth}%`}
                           height='1%'
                           fill='#047857'
                           vectorEffect='non-scaling-stroke'
                           rx='2'
                           ry='2'
                         />
                         
                         {/* Tooltip on hover */}
                         <title>{`${day.dia_espanol}: $${formatNumber(day.total)}`}</title>
                       </g>
                     );
                   })}
                 </svg>
              </div>

              {/* Etiquetas del eje Y (valores) - completamente responsive */}
              <div
                className='absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 font-medium'
                style={{
                  width: 'clamp(35px, 8vw, 50px)',
                  marginTop: 'clamp(15px, 3vw, 20px)',
                  marginBottom: 'clamp(30px, 6vw, 40px)'
                }}
              >
                <span className='text-right truncate'>
                  ${formatNumber(Math.round(maxValue / 1000))}k
                </span>
                <span className='text-right truncate'>
                  ${formatNumber(Math.round((maxValue * 0.75) / 1000))}k
                </span>
                <span className='text-right truncate'>
                  ${formatNumber(Math.round((maxValue * 0.5) / 1000))}k
                </span>
                <span className='text-right truncate'>
                  ${formatNumber(Math.round((maxValue * 0.25) / 1000))}k
                </span>
                <span className='text-right truncate'>$0</span>
              </div>

              {/* Etiquetas del eje X (días) - completamente responsive */}
              <div
                className='absolute bottom-0 left-0 right-0 flex justify-between text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 font-medium'
                style={{
                  marginLeft: 'clamp(40px, 8vw, 60px)',
                  marginRight: 'clamp(10px, 2vw, 20px)'
                }}
              >
                {salesData.data.map(day => (
                  <span
                    key={day.dia_semana}
                    className='text-center truncate'
                    style={{
                      minWidth: 'clamp(30px, 6vw, 50px)',
                      maxWidth: 'clamp(40px, 8vw, 60px)'
                    }}
                  >
                    {day.dia_espanol}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

                 {/* Leyenda mejorada y responsiva */}
         <div className='mt-6 flex items-center justify-center'>
          <div className='flex items-center gap-3 text-xs sm:text-sm bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600'>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded'></div>
              <span className='text-gray-700 dark:text-gray-300 font-medium'>Ventas por Día</span>
            </div>
            <div className='w-px h-4 bg-gray-200 dark:bg-gray-600'></div>
            <span className='text-gray-500 dark:text-gray-400 text-xs'>
              {salesData.data.filter(d => d.total > 0).length} días con ventas
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
