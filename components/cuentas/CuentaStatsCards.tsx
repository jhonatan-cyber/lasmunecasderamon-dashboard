"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CuentaWithDetails } from "@/types/cuenta";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReceipt, faDollarSign, faUsers, faBuilding } from "@fortawesome/free-solid-svg-icons";

interface CuentaStatsCardsProps {
  cuentas: CuentaWithDetails[];
  formatCurrency: (value: number) => string;
}

export default function CuentaStatsCards({ cuentas, formatCurrency }: CuentaStatsCardsProps) {
  // Calcular estadísticas
  const totalCuentas = cuentas.length;
  const cuentasActivas = cuentas.filter(c => c.estado === 1).length;
  const cuentasCerradas = cuentas.filter(c => c.estado === 0).length;
  const totalIngresos = cuentas.reduce((sum, cuenta) => sum + cuenta.total, 0);
  const totalComisiones = cuentas.reduce((sum, cuenta) => sum + cuenta.total_comision, 0);

  const stats = [
    {
      title: "Total Cuentas",
      value: totalCuentas.toString(),
      icon: faReceipt,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Cuentas registradas"
    },
    {
      title: "Cuentas Activas",
      value: cuentasActivas.toString(),
      icon: faUsers,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Cuentas abiertas"
    },
    {
      title: "Total Ingresos",
      value: formatCurrency(totalIngresos),
      icon: faDollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Ingresos totales"
    },
    {
      title: "Total Comisiones",
      value: formatCurrency(totalComisiones),
      icon: faBuilding,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Comisiones generadas"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <FontAwesomeIcon
                icon={stat.icon}
                className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`}
              />
            </div>
          </CardHeader>
          <CardContent className='p-4 sm:p-6 pt-0'>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              {stat.value}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 