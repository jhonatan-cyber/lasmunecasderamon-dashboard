import { DollarSign, TrendingUp, Activity, CreditCard, ArrowUpDown } from "lucide-react";
import { StatsCard, StatCard } from "@/components/ui/StatsCard";
import { useCashRegister } from "@/hooks/useCashRegister";
import { formatCurrencyNoDecimals } from "@/lib/formatters";

interface CashRegisterStatsCardProps {
  isCajero?: boolean;
}

export function CashRegisterStatsCard({ isCajero = false }: CashRegisterStatsCardProps) {
  const { resumen: stats, loading: isLoading, error } = useCashRegister();

  const statsCards: StatCard[] = [
    {
      title: "Total Ventas",
      value: formatCurrencyNoDecimals(stats?.total_ventas || 0),
      subtitle: `${stats?.cantidad_ventas || 0} ventas realizadas`,
      icon: TrendingUp,
      formatAsCurrency: false, // No usar el formateo automático
    },
    {
      title: "Total Servicios",
      value: formatCurrencyNoDecimals(stats?.total_servicios || 0),
      subtitle: `${stats?.cantidad_servicios || 0} servicios realizados`,
      icon: Activity,
      formatAsCurrency: false, // No usar el formateo automático
    },
    {
      title: "Total Efectivo",
      value: formatCurrencyNoDecimals(stats?.total_efectivo || 0),
      subtitle: isCajero ? "Efectivo en tu caja" : "Ingresos en efectivo",
      icon: DollarSign,
      formatAsCurrency: false, // No usar el formateo automático
    },
    {
      title: "Total Tarjeta",
      value: formatCurrencyNoDecimals(stats?.total_tarjeta || 0),
      subtitle: isCajero ? "Pagos con tarjeta en tu caja" : "Pagos con tarjeta",
      icon: CreditCard,
      formatAsCurrency: false, // No usar el formateo automático
    },
    {
      title: "Total Transferencias",
      value: formatCurrencyNoDecimals(stats?.total_transferencia || 0),
      subtitle: isCajero ? "Transferencias en tu caja" : "Transferencias bancarias",
      icon: ArrowUpDown,
      formatAsCurrency: false, // No usar el formateo automático
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Primera fila: Total Ventas y Total Servicios */}
      <div className="w-full">
        <StatsCard
          stats={statsCards.slice(0, 2)} // Solo los primeros 2 cards
          columns={2}
          error={error}
          isLoading={isLoading}
        />
      </div>
      
      {/* Segunda fila: Total Efectivo, Total Tarjeta, Total Transferencias */}
      <div className="w-full">
        <StatsCard
          stats={statsCards.slice(2, 5)} // Los últimos 3 cards
          columns={3}
          error={error}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
} 