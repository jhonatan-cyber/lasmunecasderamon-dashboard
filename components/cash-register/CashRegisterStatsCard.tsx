import { DollarSign, TrendingUp, Activity, CreditCard, ArrowUpDown } from "lucide-react";
import { StatsCard, StatCard } from "@/components/ui/StatsCard";
import { useCashRegister } from "@/hooks/useCashRegister";
import { formatCurrencyAbbreviated, formatCurrencyNoDecimals } from "@/lib/formatters";

export function CashRegisterStatsCard() {
  const { resumen: stats, loading: isLoading, error } = useCashRegister();

  // Formatear el balance total con formato abreviado para números muy grandes
  const formattedBalanceTotal = formatCurrencyAbbreviated(stats?.balance_total || 0);

  const statsCards: StatCard[] = [
    {
      title: "Balance Total",
      value: formattedBalanceTotal,
      subtitle: "En todas las cajas abiertas",
      icon: DollarSign,
      formatAsCurrency: false, // No usar el formateo automático
    },
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
      subtitle: "Ingresos en efectivo",
      icon: DollarSign,
      formatAsCurrency: false, // No usar el formateo automático
    },
    {
      title: "Total Tarjeta",
      value: formatCurrencyNoDecimals(stats?.total_tarjeta || 0),
      subtitle: "Pagos con tarjeta",
      icon: CreditCard,
      formatAsCurrency: false, // No usar el formateo automático
    },
    {
      title: "Total Transferencias",
      value: formatCurrencyNoDecimals(stats?.total_transferencia || 0),
      subtitle: "Transferencias bancarias",
      icon: ArrowUpDown,
      formatAsCurrency: false, // No usar el formateo automático
    },
  ];

  return (
    <StatsCard
      stats={statsCards}
      columns={2} // Cambiar a 2 columnas para mejor responsive
      error={error}
      isLoading={isLoading}
    />
  );
} 