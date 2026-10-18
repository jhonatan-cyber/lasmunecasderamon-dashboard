'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  Martini,
  Wine
} from 'lucide-react';
import type { SalesData } from './hooks/useSalesReport';

interface PaymentItem {
  label: string;
  value: number;
}

interface SalesReportStatsProps {
  salesData: SalesData | null;
  paymentItems: PaymentItem[];
  paymentTotal: number;
  cargoTarjeta?: number;
}
export function SalesReportStats({
  salesData,
  paymentItems,
  paymentTotal,
  cargoTarjeta = 0
}: SalesReportStatsProps) {
  // Un shot cobrado a anfitriona vale distinto que uno a cliente: se muestran aparte.
  const shotsCliente = Number(salesData?.shots?.cliente.monto || 0);
  const shotsClienteCantidad = Number(salesData?.shots?.cliente.cantidad || 0);
  const shotsAnfitriona = Number(salesData?.shots?.anfitriona.monto || 0);
  const shotsAnfitrionaCantidad = Number(salesData?.shots?.anfitriona.cantidad || 0);
  return (
    <>
      {/* KPI Cards */}
      <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <MetricCard
          icon={<DollarSign />}
          badge='Ventas'
          label='Total Ventas'
          value={salesData ? formatCurrencyNoDecimals(salesData.totalVentas) : '$0'}
          footer={
            <p className='pt-1 text-xs font-medium opacity-70'>
              {salesData?.cantidadVentas || 0} transacciones
            </p>
          }
          tone='blue'
        />
        <MetricCard
          icon={<TrendingUp />}
          badge='Promedio'
          label='Promedio Venta'
          value={salesData ? formatCurrencyNoDecimals(salesData.promedioVenta) : '$0'}
          footer={<p className='pt-1 text-xs font-medium opacity-70'>Valor medio por ticket</p>}
          tone='emerald'
        />
        <MetricCard
          icon={<Users />}
          badge='Personal'
          label='Total Propinas'
          value={salesData ? formatCurrencyNoDecimals(salesData.totalPropinas) : '$0'}
          footer={<p className='pt-1 text-xs font-medium opacity-70'>Recaudado para staff</p>}
          tone='purple'
        />
        <MetricCard
          icon={<ShoppingCart />}
          badge='Cantidad'
          label='Volumen'
          value={salesData?.cantidadVentas || 0}
          footer={<p className='pt-1 text-xs font-medium opacity-70'>Cantidad de ventas</p>}
          tone='amber'
        />
        {shotsCliente > 0 && (
          <MetricCard
            icon={<Martini />}
            badge='Cliente'
            label='Cortos Cliente'
            value={formatCurrencyNoDecimals(shotsCliente)}
            footer={
              <p className='pt-1 text-xs font-medium opacity-70'>
                {shotsClienteCantidad} cortos a precio de cliente
              </p>
            }
            tone='emerald'
          />
        )}
        {shotsAnfitriona > 0 && (
          <MetricCard
            icon={<Wine />}
            badge='Anfitriona'
            label='Cortos Anfitriona'
            value={formatCurrencyNoDecimals(shotsAnfitriona)}
            footer={
              <p className='pt-1 text-xs font-medium opacity-70'>
                {shotsAnfitrionaCantidad} cortos a precio de anfitriona
              </p>
            }
            tone='pink'
          />
        )}
        {cargoTarjeta > 0 && (
          <MetricCard
            icon={<CreditCard />}
            badge='Tarjeta'
            label='Cargo tarjeta'
            value={formatCurrencyNoDecimals(cargoTarjeta)}
            footer={
              <p className='pt-1 text-xs font-medium opacity-70'>Recargo por pagos con tarjeta</p>
            }
            tone='cyan'
          />
        )}
      </div>

      {/* Payment Items */}
      {paymentItems.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {paymentItems.map((item, index) => {
            const tones = ['blue', 'emerald', 'purple', 'amber', 'cyan'] as const;
            return (
              <MetricCard
                key={item.label}
                icon={<DollarSign />}
                badge={`${paymentTotal > 0 ? ((item.value / paymentTotal) * 100).toFixed(0) : 0}%`}
                label={item.label}
                value={formatCurrencyNoDecimals(item.value)}
                tone={tones[index % tones.length]}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
