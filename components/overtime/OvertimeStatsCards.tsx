"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faUsers, faDollarSign, faChartLine } from "@fortawesome/free-solid-svg-icons";
import { Overtime } from "@/types/overtime";

interface OvertimeStatsCardsProps {
  overtime: Overtime[];
  formatCurrency: (amount: number) => string;
}

export default function OvertimeStatsCards({
  overtime,
  formatCurrency,
}: OvertimeStatsCardsProps) {
  const totalMonto = overtime.reduce((acc, o) => acc + o.total_monto, 0);
  const totalUsuarios = overtime.length;
  const totalHoras = overtime.reduce((acc, o) => acc + o.total_horas, 0);
  const promedioPorHora = overtime.length > 0 
    ? totalMonto / totalHoras 
    : 0;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Horas Extras</CardTitle>
          <FontAwesomeIcon icon={faClock} className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">{totalHoras.toFixed(1)} hrs</div>
          <p className="text-xs text-muted-foreground">
            Horas acumuladas
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Usuarios</CardTitle>
          <FontAwesomeIcon icon={faUsers} className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">{totalUsuarios}</div>
          <p className="text-xs text-muted-foreground">
            Con horas extras
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Total a Pagar</CardTitle>
          <FontAwesomeIcon icon={faDollarSign} className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">{formatCurrency(totalMonto)}</div>
          <p className="text-xs text-muted-foreground">
            Monto total
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Promedio por Hora</CardTitle>
          <FontAwesomeIcon icon={faChartLine} className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">{formatCurrency(promedioPorHora)}</div>
          <p className="text-xs text-muted-foreground">
            Precio promedio
          </p>
        </CardContent>
      </Card>
    </div>
  );
}