'use client';

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Users, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  totalAsistencias: number;
  totalComisiones: number;
  totalServicios: number;
  totalAnticipos: number;
  totalACobrar: number;
  comisionesPendientes: number;
  anticiposPendientes: number;
  serviciosCompletados: number;
}

export default function AnfitrionaDashboard() {
  const { user, loading } = useCurrentUser();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalAsistencias: 0,
    totalComisiones: 0,
    totalServicios: 0,
    totalAnticipos: 0,
    totalACobrar: 0,
    comisionesPendientes: 0,
    anticiposPendientes: 0,
    serviciosCompletados: 0
  });
  const [loadingData, setLoadingData] = useState(false);

  // Fetch datos del dashboard desde todos los endpoints
  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      // Fetch asistencias
      const asistenciasRes = await fetch("/api/asistencias/user");
      const asistenciasData = await asistenciasRes.json();
      
      // Fetch comisiones
      const comisionesRes = await fetch("/api/commissions/user");
      const comisionesData = await comisionesRes.json();
      
      // Fetch servicios
      const serviciosRes = await fetch("/api/servicios/user");
      const serviciosData = await serviciosRes.json();
      
      // Fetch anticipos
      const anticiposRes = await fetch("/api/anticipos/user");
      const anticiposData = await anticiposRes.json();

      // Calcular totales
      const asistencias = asistenciasData.success ? asistenciasData.data || [] : [];
      const comisiones = comisionesData.success ? comisionesData.data || [] : [];
      const servicios = serviciosData.success ? serviciosData.data || [] : [];
      const anticipos = anticiposData.success ? anticiposData.data || [] : [];

      // Calcular totales de asistencias
      const totalSalary = asistencias.reduce((sum: number, asistencia: any) => sum + (asistencia.sueldo || 0), 0);
      const totalContribution = asistencias.reduce((sum: number, asistencia: any) => sum + (asistencia.aporte || 0), 0);
      const totalACobrarAsistencias = totalSalary - totalContribution;

      // Calcular totales de comisiones
      const totalComisionesAmount = comisiones.reduce((sum: number, comision: any) => sum + (comision.comision || 0), 0);
      const comisionesPendientes = comisiones.filter((comision: any) => comision.estado === 1).length;
      const totalComisionesPendientes = comisiones.filter((comision: any) => comision.estado === 1).reduce((sum: number, comision: any) => sum + (comision.comision || 0), 0);

      // Calcular totales de servicios
      const totalServiciosAmount = servicios.reduce((sum: number, servicio: any) => sum + (servicio.precio_servicio || 0), 0);
      const serviciosCompletados = servicios.filter((servicio: any) => servicio.estado === 1).length;
      const totalGanadoServicios = servicios.filter((servicio: any) => servicio.estado === 1).reduce((sum: number, servicio: any) => sum + (servicio.precio_servicio || 0), 0);

      // Calcular totales de anticipos
      const totalAnticiposAmount = anticipos.reduce((sum: number, anticipo: any) => sum + (anticipo.monto || 0), 0);
      const anticiposPendientes = anticipos.filter((anticipo: any) => anticipo.estado === 1).length;
      const totalAnticiposPendientes = anticipos.filter((anticipo: any) => anticipo.estado === 1).reduce((sum: number, anticipo: any) => sum + (anticipo.monto || 0), 0);

      // Total a cobrar (asistencias + comisiones pendientes + servicios ganados - anticipos pendientes)
      const totalACobrar = totalACobrarAsistencias + totalComisionesPendientes + totalGanadoServicios - totalAnticiposPendientes;

      setDashboardData({
        totalAsistencias: asistencias.length,
        totalComisiones: comisiones.length,
        totalServicios: servicios.length,
        totalAnticipos: anticipos.length,
        totalACobrar: totalACobrar,
        comisionesPendientes: comisionesPendientes,
        anticiposPendientes: anticiposPendientes,
        serviciosCompletados: serviciosCompletados
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      fetchDashboardData();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Verificar que el usuario sea anfitriona
  if (user?.role?.toLowerCase() !== 'anfitriona') {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  const dashboardItems = [
    {
      title: "Asistencia",
      description: "Se visualiza la asistencia del usuario",
      icon: Calendar,
      href: "/anfitriona-asistencias",
      color: "text-blue-600",
      count: dashboardData.totalAsistencias
    },
    {
      title: "Comisiones",
      description: "Se visualiza la comisiones del usuario",
      icon: DollarSign,
      href: "/anfitriona-comisiones",
      color: "text-green-600",
      count: dashboardData.totalComisiones
    },
    {
      title: "Servicios",
      description: "Se visualiza la lista de servicios realizados por el usuario",
      icon: Users,
      href: "/anfitriona-servicios",
      color: "text-purple-600",
      count: dashboardData.totalServicios
    },
    {
      title: "Anticipos",
      description: "Se visualiza la lista de anticipos obtenidos del usuario",
      icon: ArrowLeftRight,
      href: "/anfitriona-anticipos",
      color: "text-orange-600",
      count: dashboardData.totalAnticipos
    },
    {
      title: "Calendario",
      description: "Calendario con asistencias, comisiones, servicios y anticipos",
      icon: Calendar,
      href: "/anfitriona-calendar",
      color: "text-indigo-600",
      count: 0
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.name} {user?.lastName} - Anfitriona
          </h1>
          <p className="text-gray-600">Panel de control para anfitrionas</p>
        </div>
        
        {/* Total a Cobrar centrado debajo del nombre */}
        <div className="text-center">
          <p className="text-sm text-gray-500">TOTAL A COBRAR</p>
          <div className="text-2xl font-bold text-gray-900">
            {loadingData ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            ) : (
              `$ ${dashboardData.totalACobrar.toLocaleString()}`
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dashboardItems.map((item) => (
          <Link key={item.title} href={item.href}>
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-dotted border-2 border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                  <span className="text-2xl font-bold text-gray-900">{item.count}</span>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                  {item.title}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {item.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
