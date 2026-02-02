"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Clock, DollarSign, Users } from "lucide-react";
import { ServicioWithDetails } from "@/types/servicio";
import { calculateServiceStats, calculateRoomStats } from "@/lib/serviceUtils";

interface ServiceStatsProps {
  servicios: ServicioWithDetails[];
  habitaciones: any[];
}

export default function ServiceStats({ servicios, habitaciones }: ServiceStatsProps) {
  // Calcular estadísticas usando utilidades
  const serviceStats = calculateServiceStats(servicios);
  const roomStats = calculateRoomStats(habitaciones);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Total Servicios */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Servicios</CardTitle>
          <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">{serviceStats.totalServicios}</div>
          <p className="text-xs text-muted-foreground">
            Servicios registrados
          </p>
        </CardContent>
      </Card>

      {/* Servicios Activos */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Servicios Activos</CardTitle>
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">{serviceStats.serviciosActivos}</div>
          <p className="text-xs text-muted-foreground">
            En proceso actualmente
          </p>
        </CardContent>
      </Card>

      {/* Ingresos Totales */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Ingresos Completados</CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">
            ${serviceStats.ingresosTotales.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            De servicios terminados
          </p>
        </CardContent>
      </Card>

      {/* Promedio Tiempo */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Tiempo Promedio</CardTitle>
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">{serviceStats.promedioTiempo}m</div>
          <p className="text-xs text-muted-foreground">
            Servicios activos
          </p>
        </CardContent>
      </Card>

      {/* Habitaciones Disponibles */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Habitaciones Disponibles</CardTitle>
          <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{roomStats.habitacionesDisponibles}</div>
          <p className="text-xs text-muted-foreground">
            Listas para usar
          </p>
        </CardContent>
      </Card>

      {/* Habitaciones Ocupadas */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Habitaciones Ocupadas</CardTitle>
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">{roomStats.habitacionesOcupadas}</div>
          <p className="text-xs text-muted-foreground">
            En uso actualmente
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 