'use client';

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Clock, ArrowLeftRight, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  totalAsistencias: number;
  totalAnticipos: number;
  totalPropinas: number;
  totalHorasExtras: number;
  totalPedidos: number;
  totalACobrar: number;
  anticiposPendientes: number;
  propinasPendientes: number;
  horasExtrasPendientes: number;
}

export default function GarzonDashboard() {
  const { user, loading } = useCurrentUser();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalAsistencias: 0,
    totalAnticipos: 0,
    totalPropinas: 0,
    totalHorasExtras: 0,
    totalPedidos: 0,
    totalACobrar: 0,
    anticiposPendientes: 0,
    propinasPendientes: 0,
    horasExtrasPendientes: 0
  });
  const [loadingData, setLoadingData] = useState(false);

  // Fetch datos del dashboard desde todos los endpoints
  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      // Fetch asistencias
      const asistenciasRes = await fetch("/api/asistencias/user");
      const asistenciasData = await asistenciasRes.json();
      
      // Fetch anticipos
      const anticiposRes = await fetch("/api/anticipos/user");
      const anticiposData = await anticiposRes.json();
      
      // Fetch propinas
      const propinasRes = await fetch("/api/tips/user");
      const propinasData = await propinasRes.json();
      
      // Fetch horas extras
      const horasExtrasRes = await fetch("/api/overtime/user");
      const horasExtrasData = await horasExtrasRes.json();
      
      // Fetch pedidos (orders)
      const pedidosRes = await fetch("/api/orders/user");
      const pedidosData = await pedidosRes.json();

      // Calcular totales
      const asistencias = asistenciasData.success ? asistenciasData.data || [] : [];
      const anticipos = anticiposData.success ? anticiposData.data || [] : [];
      const propinas = propinasData.success ? propinasData.data || [] : [];
      const horasExtras = horasExtrasData.success ? horasExtrasData.data || [] : [];
      const pedidos = pedidosData.success ? pedidosData.data || [] : [];

      // Calcular totales de asistencias (solo estado 1)
      const asistenciasPendientes = asistencias.filter((asistencia: any) => asistencia.estado === 1);
      const totalACobrarAsistencias = asistenciasPendientes.reduce((sum: number, asistencia: any) => {
        const sueldo = asistencia.sueldo || 0;
        const aporte = asistencia.aporte || 0;
        const descuento = asistencia.descuento || 0;
        return sum + (sueldo + aporte - descuento);
      }, 0);

      // Calcular totales de anticipos (solo estado 1)
      const anticiposPendientes = anticipos.filter((anticipo: any) => anticipo.estado === 1);
      const totalAnticiposPendientes = anticiposPendientes.reduce((sum: number, anticipo: any) => sum + (anticipo.monto || 0), 0);

      // Calcular totales de propinas (solo estado 1)
      const propinasPendientes = propinas.filter((propina: any) => propina.estado === 1);
      const totalPropinasPendientes = propinasPendientes.reduce((sum: number, propina: any) => sum + (propina.monto || 0), 0);

      // Calcular totales de horas extras (solo estado 1)
      const horasExtrasPendientes = horasExtras.filter((horaExtra: any) => horaExtra.estado === 1);
      const totalHorasExtrasPendientes = horasExtrasPendientes.reduce((sum: number, horaExtra: any) => sum + (horaExtra.total || 0), 0);

      // Total a cobrar (asistencias estado 1 + propinas estado 1 + horas extras estado 1 - anticipos estado 1)
      const totalACobrar = totalACobrarAsistencias + totalPropinasPendientes + totalHorasExtrasPendientes - totalAnticiposPendientes;

      setDashboardData({
        totalAsistencias: asistencias.length,
        totalAnticipos: anticipos.length,
        totalPropinas: propinas.length,
        totalHorasExtras: horasExtras.length,
        totalPedidos: pedidos.length,
        totalACobrar: totalACobrar,
        anticiposPendientes: anticiposPendientes.length,
        propinasPendientes: propinasPendientes.length,
        horasExtrasPendientes: horasExtrasPendientes.length
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

  // Verificar que el usuario sea garzon
  if (user?.role?.toLowerCase() !== 'garzon') {
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
      href: "/garzon-asistencias",
      color: "text-blue-600",
      count: dashboardData.totalAsistencias
    },
    {
      title: "Anticipos",
      description: "Se visualiza la lista de anticipos obtenidos del usuario",
      icon: ArrowLeftRight,
      href: "/garzon-anticipos",
      color: "text-orange-600",
      count: dashboardData.totalAnticipos
    },
    {
      title: "Propinas",
      description: "Se visualiza la lista de propinas obtenidos del usuario",
      icon: DollarSign,
      href: "/garzon-propinas",
      color: "text-green-600",
      count: dashboardData.totalPropinas
    },
    {
      title: "Horas extras",
      description: "Se visualiza la lista de horas extras obtenidos del usuario",
      icon: Clock,
      href: "/garzon-horas-extras",
      color: "text-purple-600",
      count: dashboardData.totalHorasExtras
    },
    {
      title: "Calendario",
      description: "Vista de calendario con todas las actividades",
      icon: Calendar,
      href: "/garzon-calendar",
      color: "text-indigo-600",
      count: 0
    },
    {
      title: "Pedidos",
      description: "Se realizan los pedidos",
      icon: ShoppingCart,
      href: "/orders",
      color: "text-red-600",
      count: dashboardData.totalPedidos
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.name} {user?.lastName} - Garzon
          </h1>
          <p className="text-gray-600">Panel de control para garzones</p>
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
