'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users,
  CalendarDays,
  PieChart
} from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

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

export function SalesReport() {
  const [period, setPeriod] = useState('today');
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
        // Asegurar que el backend reciba period=custom además de las fechas
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

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Hoy';
      case 'yesterday': return 'Ayer';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      case 'custom': return 'Personalizado';
      default: return 'Hoy';
    }
  };

  const exportReport = () => {
    // Implementar exportación a PDF/Excel
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
              <Select value={period} onValueChange={setPeriod}>
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
                {getPeriodLabel()}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Propinas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cantidad Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
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

      {/* Métodos de Pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Ventas por Método de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">Efectivo</p>
                <p className="text-2xl font-bold text-green-900">
                  {salesData ? formatCurrencyNoDecimals(salesData.ventasPorMetodo.efectivo) : '$0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">Tarjeta</p>
                <p className="text-2xl font-bold text-blue-900">
                  {salesData ? formatCurrencyNoDecimals(salesData.ventasPorMetodo.tarjeta) : '$0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-800">Transferencia</p>
                <p className="text-2xl font-bold text-purple-900">
                  {salesData ? formatCurrencyNoDecimals(salesData.ventasPorMetodo.transferencia) : '$0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

             {/* Ventas por Día */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <CalendarDays className="h-5 w-5" />
             Ventas por Día
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-3">
             {salesData?.ventasPorDia.map((dia, index) => {
               const fecha = new Date(dia.fecha);
               const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                 weekday: 'long',
                 year: 'numeric',
                 month: 'long',
                 day: 'numeric'
               });
               
               return (
                 <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                       <span className="text-sm font-bold text-blue-600">
                         {fecha.getDate().toString().padStart(2, '0')}
                       </span>
                     </div>
                     <div>
                       <p className="font-medium capitalize">{fechaFormateada}</p>
                       <div className="flex items-center gap-4 text-sm text-gray-600">
                         <span>{dia.cantidad} ventas</span>
                         <span>•</span>
                         <span>Propinas: {formatCurrencyNoDecimals(dia.propinas)}</span>
                       </div>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-lg font-bold text-blue-600">{formatCurrencyNoDecimals(dia.ventas)}</p>
                     <p className="text-xs text-gray-500">Total del día</p>
                   </div>
                 </div>
               );
             })}
           </div>
         </CardContent>
       </Card>
    </div>
  );
}
