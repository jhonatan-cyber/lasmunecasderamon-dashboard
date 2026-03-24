import { DollarSign, TrendingUp } from "lucide-react";
import { StatsCard, StatCard } from "@/components/ui/StatsCard";
import { useStats } from "@/hooks/estadisticas/useStats";

interface SalesStats {
  total_ventas: number;
  promedio_venta: number;
}

export function SalesStatsCard() {
  const { data: stats, isLoading, error } = useStats<SalesStats>({
    endpoint: '/api/sales/stats',
    params: { stats: true }
  });

  const statsCards: StatCard[] = [
    {
      title: "Total Ventas Hoy",
      value: Number(stats?.total_ventas) || 0,
      subtitle: "Desde apertura de caja",
      icon: DollarSign,
      formatAsCurrency: true,
    },
    {
      title: "Promedio Venta",
      value: Number(stats?.promedio_venta) || 0,
      subtitle: "Por transacción",
      icon: TrendingUp,
      formatAsCurrency: true,
    },
  ];

  return (
    <StatsCard
      stats={statsCards}
      columns={2}
      error={error}
      isLoading={isLoading}
    />
  );
}
