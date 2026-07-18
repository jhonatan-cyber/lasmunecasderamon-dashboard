'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CajaRow {
  id_caja: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_apertura: number;
  monto_cierre: number | null;
  turno: 'Día' | 'Noche';
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  devoluciones: number;
  diferencia: number;
}

interface CajaBarItem {
  name: string;
  turno: string;
  Apertura: number;
  Cierre: number;
  Diferencia: number;
}

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
};

interface GenericTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: { fill?: string } }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: GenericTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-3 shadow-2xl">
        {label && <p className="text-white font-semibold text-sm mb-2">{label}</p>}
        <div className="space-y-1.5">
          {payload.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.payload?.fill }} />
              <span className="text-gray-300 text-xs">{item.name}:</span>
              <span className="text-white font-bold text-sm ml-auto">
                {formatCompact(Number(item.value))}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface CashRegisterTableProps {
  cajas: CajaRow[];
  cajasBarData: CajaBarItem[];
}

export function CashRegisterTable({ cajas, cajasBarData }: CashRegisterTableProps) {
  return (
    <Card className="border-0 shadow-2xl shadow-gray-200/50 dark:shadow-black/40 rounded-3xl overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-md mb-8">
      <CardHeader className="border-b border-gray-50 dark:border-gray-700/50 pb-4">
        <CardTitle className="text-lg font-black flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          Desempeño de Cajas por Turno
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 px-0 sm:px-6">
        {/* Bar chart */}
        {cajasBarData.length > 0 && (
          <div className="mb-8 h-[260px] sm:h-[350px] w-full px-4 sm:px-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cajasBarData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="cajasApertura" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="cajasCierre" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.6} />
                  </linearGradient>
                  <filter id="cajasShadow" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity={0.1} />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatCompact} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-400 dark:text-gray-500" tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                <Legend
                  wrapperStyle={{ paddingTop: '16px' }}
                  formatter={(value: string) => (
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{value}</span>
                  )}
                />
                <Bar dataKey="Apertura" fill="url(#cajasApertura)" radius={[6, 6, 0, 0]} animationDuration={1200} style={{ filter: 'url(#cajasShadow)' }} />
                <Bar dataKey="Cierre" fill="url(#cajasCierre)" radius={[6, 6, 0, 0]} animationDuration={1200} style={{ filter: 'url(#cajasShadow)' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Data table */}
        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Caja</th>
                <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Apertura</th>
                <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Cierre</th>
                <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Turno</th>
                <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">M. Apertura</th>
                <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Ingresos</th>
                <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Dev.</th>
                <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">M. Cierre</th>
                <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {cajas.map((c) => (
                <tr key={c.id_caja} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">#{c.id_caja}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatLongDateEs(c.fecha_apertura)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.fecha_cierre ? formatLongDateEs(c.fecha_cierre) : '-'}</td>
                  <td className="px-4 py-3">
                    <Badge className={c.turno === 'Día' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 shadow-xs border-0' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-xs border-0'}>
                      {c.turno}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrencyNoDecimals(c.monto_apertura || 0)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrencyNoDecimals((c.efectivo || 0) + (c.tarjeta || 0) + (c.transferencia || 0))}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrencyNoDecimals(c.devoluciones || 0)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrencyNoDecimals(c.monto_cierre || 0)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-md font-bold text-xs ${parseFloat(String(c.diferencia)) >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {formatCurrencyNoDecimals(c.diferencia || 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
