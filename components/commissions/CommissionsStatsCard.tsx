import { DollarSign, TrendingUp, Percent, ArrowRight } from "lucide-react";
import useCommissionStats from "@/hooks/useCommissionStats";
import { StatsCard, StatCard } from "@/components/ui/StatsCard";

export function CommissionsStatsCard() {
  const { data: stats, isLoading, error } = useCommissionStats();

  const statsCards: StatCard[] = [
    {
      title: "Total Comisiones",
      value: stats?.total_comisiones || 0,
      subtitle: "Total acumulado",
      icon: DollarSign,
      formatAsCurrency: true,
    },
    {
      title: "Comisiones por Ventas",
      value: stats?.comision_ventas || 0,
      subtitle: `${stats?.porcentaje_ventas || 0}% del total`,
      icon: TrendingUp,
      formatAsCurrency: true,
    },
    {
      title: "Comisiones por Servicios",
      value: stats?.comision_servicios || 0,
      subtitle: `${stats?.porcentaje_servicios || 0}% del total`,
      icon: ArrowRight,
      formatAsCurrency: true,
    },
    {
      title: "Promedio Comisión",
      value: stats?.promedio_comision || 0,
      subtitle: `${stats?.cantidad_comisiones || 0} comisiones`,
      icon: Percent,
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
