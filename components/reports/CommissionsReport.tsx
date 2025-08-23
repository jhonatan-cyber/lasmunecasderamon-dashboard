'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Award, 
  CalendarDays,
  BarChart3,
  UserCheck,
  Target
} from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";

interface CommissionData {
  id_usuario: number;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  total_ventas: number;
  total_servicios: number;
  total_ventas_monto: number;
  total_servicios_monto: number;
  total_comisiones: number;
  promedio_por_venta: number;
  promedio_por_servicio: number;
  dias_trabajados: number;
  promedio_diario: number;
}

interface Statistics {
  total_anfitrionas: number;
  total_ventas_general: number;
  total_servicios_general: number;
  total_comisiones_general: number;
  promedio_venta_general: number;
  promedio_servicio_general: number;
  promedio_comision_por_anfitriona: number;
  total_ventas_count: number;
  total_servicios_count: number;
}

interface TopPerformer {
  id_usuario: number;
  nombre_completo: string;
  total_comisiones: number;
  total_ventas: number;
  total_servicios: number;
  total_ventas_count: number;
  total_servicios_count: number;
  promedio_por_venta: number;
  promedio_por_servicio: number;
}

interface DailyCommission {
  dia_semana: string;
  dia_espanol: string;
  total_ventas: number;
  total_servicios: number;
  total_ventas_monto: number;
  total_servicios_monto: number;
  total_comisiones: number;
  promedio_comision: number;
}

interface CommissionResponse {
  period: string;
  startDate: string | null;
  endDate: string | null;
  commissions: CommissionData[];
  statistics: Statistics;
  topPerformers: TopPerformer[];
  dailyCommissions: DailyCommission[];
}

export function CommissionsReport() {
  const [data, setData] = useState<CommissionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('current_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/reports/commissions?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Error al obtener datos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, startDate, endDate]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const formatNumber = (amount: number) => {
    // Validar que el número sea válido y no sea demasiado grande
    if (!amount || isNaN(amount) || amount === Infinity || amount === -Infinity) {
      return '0';
    }
    
    // Si el número es muy grande, redondearlo
    if (amount > 999999999) {
      return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getPerformanceBadge = (comisiones: number, promedio: number) => {
    if (comisiones >= promedio * 1.5) return 'bg-green-100 text-green-800';
    if (comisiones >= promedio) return 'bg-blue-100 text-blue-800';
    if (comisiones >= promedio * 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPerformanceText = (comisiones: number, promedio: number) => {
    if (comisiones >= promedio * 1.5) return 'Excelente';
    if (comisiones >= promedio) return 'Bueno';
    if (comisiones >= promedio * 0.5) return 'Regular';
    return 'Necesita mejorar';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando reporte de comisiones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p className="text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-600">
        <p className="text-sm">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Filtros del Reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Mes Actual</SelectItem>
                  <SelectItem value="last_month">Mes Anterior</SelectItem>
                  <SelectItem value="current_year">Año Actual</SelectItem>
                  <SelectItem value="last_year">Año Anterior</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Inicio
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Fin
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full">
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Anfitrionas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.statistics.total_anfitrionas}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900">
                  $ {formatNumber(data.statistics.total_ventas_general)}
                </p>
                <p className="text-xs text-gray-500">
                  {data.statistics.total_ventas_count} transacciones
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Servicios</p>
                <p className="text-2xl font-bold text-gray-900">
                  $ {formatNumber(data.statistics.total_servicios_general)}
                </p>
                <p className="text-xs text-gray-500">
                  {data.statistics.total_servicios_count} servicios
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Comisiones</p>
                <p className="text-2xl font-bold text-gray-900">
                  $ {formatNumber(data.statistics.total_comisiones_general)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Promedio por Anfitriona</p>
                <p className="text-2xl font-bold text-gray-900">
                  $ {formatNumber(Math.round(data.statistics.promedio_comision_por_anfitriona || 0))}
                </p>
                <p className="text-xs text-gray-500">
                  {data.statistics.total_anfitrionas} anfitrionas
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top 5 Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topPerformers.map((performer, index) => (
              <div key={performer.id_usuario} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                                     <div>
                     <h3 className="font-medium text-gray-900">{performer.nombre_completo}</h3>
                     <p className="text-sm text-gray-600">
                       {performer.total_ventas_count} ventas • {performer.total_servicios_count} servicios
                     </p>
                     <p className="text-xs text-gray-500">
                       ${formatNumber(performer.promedio_por_venta)} venta prom. • ${formatNumber(performer.promedio_por_servicio)} servicio prom.
                     </p>
                   </div>
                </div>
                                 <div className="text-right">
                   <p className="text-lg font-bold text-green-600">
                     $ {formatNumber(performer.total_comisiones)}
                   </p>
                   <p className="text-sm text-gray-600">
                     ${formatNumber(performer.total_ventas)} ventas • ${formatNumber(performer.total_servicios)} servicios
                   </p>
                 </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Comisiones por Anfitriona */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Comisiones por Anfitriona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Anfitriona</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Ventas</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Servicios</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Ventas</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Servicios</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Comisiones</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Promedio/Venta</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Promedio/Servicio</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Días Trabajados</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Promedio/Día</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Rendimiento</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((commission) => (
                  <tr key={commission.id_usuario} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{commission.nombre_completo}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{commission.total_ventas}</td>
                    <td className="py-3 px-4 text-gray-900">{commission.total_servicios}</td>
                    <td className="py-3 px-4 text-gray-900">$ {formatNumber(commission.total_ventas_monto)}</td>
                    <td className="py-3 px-4 text-gray-900">$ {formatNumber(commission.total_servicios_monto)}</td>
                    <td className="py-3 px-4 text-gray-900">$ {formatNumber(commission.total_comisiones)}</td>
                    <td className="py-3 px-4 text-gray-900">$ {formatNumber(commission.promedio_por_venta)}</td>
                    <td className="py-3 px-4 text-gray-900">$ {formatNumber(commission.promedio_por_servicio)}</td>
                    <td className="py-3 px-4 text-gray-900">{commission.dias_trabajados}</td>
                    <td className="py-3 px-4 text-gray-900">$ {formatNumber(commission.promedio_diario)}</td>
                    <td className="py-3 px-4">
                      <Badge className={getPerformanceBadge(commission.total_comisiones, data.statistics.promedio_comision_por_anfitriona)}>
                        {getPerformanceText(commission.total_comisiones, data.statistics.promedio_comision_por_anfitriona)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Comisiones por Día de la Semana */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comisiones por Día de la Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.dailyCommissions.map((daily) => (
              <div key={daily.dia_semana} className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">{daily.dia_espanol}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  $ {formatNumber(daily.total_comisiones)}
                </p>
                                 <p className="text-sm text-gray-600">
                   {daily.total_ventas} ventas • {daily.total_servicios} servicios
                 </p>
                 <p className="text-xs text-gray-500">
                   ${formatNumber(daily.promedio_comision)} promedio
                 </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
