'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, DollarSign, ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

interface ReportResponse {
  success: boolean;
  data: {
    period: string;
    range: { start: string | null; end: string | null };
         summary: {
       cajas: number;
       apertura_total: number;
       cierre_total: number;
       diferencia_total: number;
       ventas: number;
       servicios: number;
       efectivo: number;
       tarjeta: number;
       transferencia: number;
       propina: number;
       comision: number;
       iva: number;
       devoluciones: number;
     };
    cajas: Array<{
      id_caja: number;
      fecha_apertura: string;
      fecha_cierre: string | null;
      monto_apertura: number;
      monto_cierre: number | null;
      estado: number;
      venta: number;
      servicio: number;
      efectivo: number;
      tarjeta: number;
      transferencia: number;
      propina: number;
      comision: number;
      devoluciones: number;
      turno: 'Día' | 'Noche';
      diferencia: number;
    }>;
    movimientos: {
      ingresos: { total: number; detalle: Array<{ tipo: string; monto: number }> };
      egresos: { total: number; detalle: Array<{ tipo: string; monto: number }> };
    };
    flujoEfectivo: { entradas: number; salidas: number; neto: number };
  };
}

export function CashRegisterReport() {
  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<ReportResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period, startDate, endDate]);

  const fetchData = async () => {
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
      const res = await fetch(`/api/reports/cash-register?${params}`);
      const json: ReportResponse = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error('Error fetching cash register data:', e);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    // TODO: exportar a CSV/PDF si se requiere
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reporte de caja...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-blue-100 border border-blue-300 rounded-lg">
        <p className="text-blue-800">No hay datos disponibles para el reporte de caja</p>
        <p className="text-sm text-blue-600">Estado: {loading ? 'Cargando...' : 'Sin datos'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
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
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  <span className="text-gray-500">a</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">Caja</Badge>
              <Button onClick={exportReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

             {/* Balance de Caja */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Apertura Total</CardTitle>
             <Clock className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.apertura_total)}</div>
             <p className="text-xs text-muted-foreground">{data.summary.cajas} cajas</p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Cierre Total</CardTitle>
             <Clock className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.cierre_total)}</div>
             <p className="text-xs text-muted-foreground">Suma de cierres</p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Diferencia Total</CardTitle>
             <DollarSign className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.diferencia_total)}</div>
             <p className="text-xs text-muted-foreground">Cierre - (Apertura + Ingresos - Devoluciones)</p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
             <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.devoluciones)}</div>
             <p className="text-xs text-muted-foreground">Total devuelto</p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">IVA</CardTitle>
             <DollarSign className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrencyNoDecimals(data.summary.iva)}</div>
             <p className="text-xs text-muted-foreground">Total IVA</p>
           </CardContent>
         </Card>
       </div>

      {/* Movimientos de Caja */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5" /> Movimientos de Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">Ingresos</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrencyNoDecimals(data.movimientos.ingresos.total)}</p>
              <div className="mt-2 text-sm text-green-700">
                {data.movimientos.ingresos.detalle.map((d, i) => (
                  <div key={i} className="flex justify-between"><span className="capitalize">{d.tipo}</span><span>{formatCurrencyNoDecimals(d.monto)}</span></div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">Egresos</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrencyNoDecimals(data.movimientos.egresos.total)}</p>
              <div className="mt-2 text-sm text-red-700">
                {data.movimientos.egresos.detalle.map((d, i) => (
                  <div key={i} className="flex justify-between"><span className="capitalize">{d.tipo}</span><span>{formatCurrencyNoDecimals(d.monto)}</span></div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">Métodos de Pago</p>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <div className="flex justify-between"><span>Efectivo</span><span>{formatCurrencyNoDecimals(data.summary.efectivo)}</span></div>
                <div className="flex justify-between"><span>Tarjeta</span><span>{formatCurrencyNoDecimals(data.summary.tarjeta)}</span></div>
                <div className="flex justify-between"><span>Transferencia</span><span>{formatCurrencyNoDecimals(data.summary.transferencia)}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cierre de Caja por Turno */}
      <Card>
        <CardHeader>
          <CardTitle>Cierre de Caja por Turno</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Caja</th>
                  <th className="px-3 py-2 text-left">Apertura</th>
                  <th className="px-3 py-2 text-left">Cierre</th>
                  <th className="px-3 py-2 text-left">Turno</th>
                  <th className="px-3 py-2 text-right">Apertura</th>
                  <th className="px-3 py-2 text-right">Ingresos</th>
                  <th className="px-3 py-2 text-right">Devoluciones</th>
                  <th className="px-3 py-2 text-right">Cierre</th>
                  <th className="px-3 py-2 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {data.cajas.map((c) => (
                  <tr key={c.id_caja} className="border-b">
                    <td className="px-3 py-2">#{c.id_caja}</td>
                    <td className="px-3 py-2">{new Date(c.fecha_apertura).toLocaleString('es-ES')}</td>
                    <td className="px-3 py-2">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-ES') : '-'}</td>
                    <td className="px-3 py-2">{c.turno}</td>
                    <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals(c.monto_apertura || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals((c.efectivo || 0) + (c.tarjeta || 0) + (c.transferencia || 0))}</td>
                    <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals(c.devoluciones || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals(c.monto_cierre || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrencyNoDecimals(c.diferencia || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Flujo de Efectivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Flujo de Efectivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">Entradas</p>
              <p className="text-2xl font-bold">{formatCurrencyNoDecimals(data.flujoEfectivo.entradas)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">Salidas</p>
              <p className="text-2xl font-bold">{formatCurrencyNoDecimals(data.flujoEfectivo.salidas)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">Neto</p>
              <p className="text-2xl font-bold">{formatCurrencyNoDecimals(data.flujoEfectivo.neto)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


