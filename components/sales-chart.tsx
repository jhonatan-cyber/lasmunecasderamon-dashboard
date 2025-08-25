'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, Calendar } from "lucide-react";

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

export function SalesChart() {
  const [salesData, setSalesData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentYearOffset, setCurrentYearOffset] = useState(0);

  const fetchSalesData = async (offset: number) => {
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
  };

  useEffect(() => {
    fetchSalesData(currentYearOffset);
  }, [currentYearOffset]);

  const handleYearChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentYearOffset(currentYearOffset + 1);
    } else {
      setCurrentYearOffset(Math.max(0, currentYearOffset - 1));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getMaxValue = () => {
    if (!salesData?.data) return 0;
    const maxValue = Math.max(...salesData.data.map(item => item.total));
    // Redondear hacia arriba al siguiente múltiplo de 100,000
    return Math.ceil(maxValue / 100000) * 100000;
  };

  const getBarHeight = (value: number) => {
    // Calcular altura basada en el máximo dinámico
    const maxValue = getMaxValue();
    const height = (value / maxValue) * 100;
    return Math.max(height, 1); // Mínimo 1% de altura para barras muy pequeñas
  };

  const getBarColor = (monthIndex: number) => {
    // Array de colores diferentes para cada mes
    const colors = [
      'bg-red-500',      // Enero
      'bg-blue-500',     // Febrero
      'bg-green-500',    // Marzo
      'bg-yellow-500',   // Abril
      'bg-purple-500',   // Mayo
      'bg-pink-500',     // Junio
      'bg-indigo-500',   // Julio
      'bg-orange-500',   // Agosto
      'bg-teal-500',     // Septiembre
      'bg-cyan-500',     // Octubre
      'bg-lime-500',     // Noviembre
      'bg-rose-500'      // Diciembre
    ];
    
    return colors[monthIndex] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card className="dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-blue-50/30 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
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



  const maxValue = getMaxValue();

  return (
    <Card className="dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 bg-gradient-to-br from-white to-blue-50/30 border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
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
        {/* Resumen mejorado */}
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

        {/* Gráfico de barras mejorado */}
        <div className="space-y-6">
          <div className="relative dark:bg-gray-800 bg-white rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            {/* Eje Y con valores dinámicos */}
            <div className="absolute left-0 top-6 bottom-6 w-20 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span>${formatNumber(maxValue)}</span>
              <span>${formatNumber(Math.round(maxValue * 0.875))}</span>
              <span>${formatNumber(Math.round(maxValue * 0.75))}</span>
              <span>${formatNumber(Math.round(maxValue * 0.625))}</span>
              <span>${formatNumber(Math.round(maxValue * 0.5))}</span>
              <span>${formatNumber(Math.round(maxValue * 0.375))}</span>
              <span>${formatNumber(Math.round(maxValue * 0.25))}</span>
              <span>${formatNumber(Math.round(maxValue * 0.125))}</span>
              <span>$0</span>
            </div>
            
            {/* Líneas de cuadrícula horizontales */}
            <div className="absolute left-20 right-6 top-6 bottom-6 flex flex-col justify-between">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="border-t border-gray-100 dark:border-gray-600"></div>
              ))}
            </div>
            
            {/* Barras mejoradas */}
            <div className="ml-20 mr-6 grid grid-cols-12 gap-2 h-64 items-end">
              {salesData.data.map((month, index) => {
                // Calcular la altura exacta basada en el valor monetario
                const chartHeight = 256; // Altura del contenedor en píxeles (h-64 = 256px)
                const barHeightPx = (month.total / maxValue) * chartHeight;
                

                
                return (
                  <div key={month.mes_num} className="flex flex-col items-center group">
                    <div className="w-full relative">
                      {month.total > 0 && (
                        <div
                          className={`${getBarColor(month.mes_num - 1)} rounded-t-lg transition-all duration-500 hover:scale-105 cursor-pointer shadow-sm hover:shadow-md group-hover:opacity-90`}
                          style={{
                            height: `${barHeightPx}px`,
                            minHeight: '2px'
                          }}
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                            $ {formatNumber(month.total)}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-300 mt-3 text-center font-medium transform -rotate-45 origin-left">
                      {month.mes}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leyenda mejorada */}
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm dark:bg-gray-800 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-red-500 via-blue-500 to-green-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-200 font-medium">Ventas Mensuales</span>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600"></div>
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {salesData.data.filter(m => m.total > 0).length} meses con ventas
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
