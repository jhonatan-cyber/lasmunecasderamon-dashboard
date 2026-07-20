'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { TrendingUp, DollarSign, ShoppingCart, Users, LucideIcon } from 'lucide-react';

interface SalesData {
  totalVentas: number;
  cantidadVentas: number;
  promedioVenta: number;
  totalPropinas: number;
}

interface PaymentItem {
  label: string;
  value: number;
  color: string;
}

interface SalesReportStatsProps {
  salesData: SalesData | null;
  paymentItems: PaymentItem[];
  paymentTotal: number;
}

function StatCard({
  title,
  value,
  sub,
  Icon,
  grad,
  iconColor
}: {
  title: string;
  value: string | number;
  sub: string;
  Icon: LucideIcon;
  grad: string;
  iconColor: string;
}) {
  return (
    <Card className='relative border-0 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden group hover:scale-[1.02] transition-all duration-300'>
      <div className={`absolute inset-0 bg-linear-to-br ${grad} opacity-50`} />
      <CardHeader className='relative flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
          {title}
        </CardTitle>
        <div className='w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center group-hover:rotate-12 transition-transform'>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className='relative'>
        <div className='text-3xl font-black text-gray-900 dark:text-white tracking-tight'>
          {value}
        </div>
        <p className='text-xs font-medium text-gray-500 mt-1'>{sub}</p>
      </CardContent>
    </Card>
  );
}

export function SalesReportStats({ salesData, paymentItems, paymentTotal }: SalesReportStatsProps) {
  return (
    <>
      {/* KPI Cards */}
      <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <StatCard
          title='Total Ventas'
          value={salesData ? formatCurrencyNoDecimals(salesData.totalVentas) : '$0'}
          sub={`${salesData?.cantidadVentas || 0} transacciones`}
          Icon={DollarSign}
          grad='from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'
          iconColor='text-blue-600 dark:text-blue-400'
        />
        <StatCard
          title='Promedio Venta'
          value={salesData ? formatCurrencyNoDecimals(salesData.promedioVenta) : '$0'}
          sub='Valor medio por ticket'
          Icon={TrendingUp}
          grad='from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20'
          iconColor='text-emerald-600 dark:text-emerald-400'
        />
        <StatCard
          title='Total Propinas'
          value={salesData ? formatCurrencyNoDecimals(salesData.totalPropinas) : '$0'}
          sub='Recaudado para staff'
          Icon={Users}
          grad='from-purple-50 to-fuchsia-50 dark:from-purple-950/20 dark:to-fuchsia-950/20'
          iconColor='text-purple-600 dark:text-purple-400'
        />
        <StatCard
          title='Volumen'
          value={salesData?.cantidadVentas || 0}
          sub='Cantidad de ventas'
          Icon={ShoppingCart}
          grad='from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20'
          iconColor='text-amber-600 dark:text-amber-400'
        />
      </div>

      {/* Payment Items */}
      {paymentItems.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {paymentItems.map((item, index) => (
            <div
              key={index}
              className='bg-white dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-xs flex items-center justify-between hover:shadow-md transition-all'
            >
              <div className='flex items-center gap-3'>
                <div className='w-1.5 h-10 rounded-full' style={{ backgroundColor: item.color }} />
                <div>
                  <p className='text-[10px] text-gray-400 font-black uppercase tracking-widest'>
                    {item.label}
                  </p>
                  <p className='text-xl font-black text-gray-900 dark:text-gray-100'>
                    {formatCurrencyNoDecimals(item.value)}
                  </p>
                </div>
              </div>
              <div className='text-right'>
                <span className='text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg'>
                  {paymentTotal > 0 ? ((item.value / paymentTotal) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
