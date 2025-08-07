import {
  DollarSign,
  TrendingUp,
  Calendar,
  Activity,
  CreditCard,
  ArrowUpDown,
  TrendingDown
} from 'lucide-react';
import { StatsCard, StatCard } from '@/components/ui/StatsCard';
import { useCashRegister } from '@/hooks/useCashRegister';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

export function CashRegisterDetailedStats() {
  const { resumen: stats, loading: isLoading, error } = useCashRegister();

  const detailedStatsCards: StatCard[] = [
    {
      title: 'Total Ventas',
      value: formatCurrencyNoDecimals(stats?.total_ventas || 0),
      subtitle: `${stats?.cantidad_ventas || 0} ventas realizadas`,
      icon: TrendingUp,
      formatAsCurrency: false // No usar el formateo automático
    },
    {
      title: 'Total Efectivo',
      value: formatCurrencyNoDecimals(stats?.total_efectivo || 0),
      subtitle: 'Ingresos en efectivo',
      icon: DollarSign,
      formatAsCurrency: false // No usar el formateo automático
    },
    {
      title: 'Total Tarjeta',
      value: formatCurrencyNoDecimals(stats?.total_tarjeta || 0),
      subtitle: 'Pagos con tarjeta',
      icon: CreditCard,
      formatAsCurrency: false // No usar el formateo automático
    },
    {
      title: 'Total Transferencias',
      value: formatCurrencyNoDecimals(stats?.total_transferencia || 0),
      subtitle: 'Transferencias bancarias',
      icon: ArrowUpDown,
      formatAsCurrency: false // No usar el formateo automático
    },
    {
      title: 'Promedio Venta',
      value: formatCurrencyNoDecimals(stats?.promedio_venta || 0),
      subtitle: 'Por transacción',
      icon: TrendingUp,
      formatAsCurrency: false // No usar el formateo automático
    },
    {
      title: 'Total Servicios',
      value: formatCurrencyNoDecimals(stats?.total_servicios || 0),
      subtitle: `${stats?.cantidad_servicios || 0} servicios realizados`,
      icon: Activity,
      formatAsCurrency: false // No usar el formateo automático
    },
    {
      title: 'Promedio Servicio',
      value: formatCurrencyNoDecimals(stats?.promedio_servicio || 0),
      subtitle: 'Por servicio',
      icon: Calendar,
      formatAsCurrency: false // No usar el formateo automático
    },
    {
      title: 'Total Devoluciones',
      value: formatCurrencyNoDecimals(stats?.total_devoluciones || 0),
      subtitle: 'Devoluciones realizadas',
      icon: TrendingDown,
      formatAsCurrency: false // No usar el formateo automático
    }
  ];

  return <StatsCard stats={detailedStatsCards} columns={2} error={error} isLoading={isLoading} />;
}
