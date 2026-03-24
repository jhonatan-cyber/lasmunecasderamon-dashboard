/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Clock, ArrowLeftRight, ShoppingCart, CalendarDays } from "lucide-react";
import Link from "next/link";
import { formatCurrencyCLP } from '@/lib/formatters';

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

export default function DashboardStatsCards() {
  const { user, loading: userLoading } = useCurrentUser();
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

        // Calcular totales de asistencias
        const totalSalary = asistencias.reduce((sum: number, asistencia: any) => sum + (asistencia.sueldo || 0), 0);
        const totalContribution = asistencias.reduce((sum: number, asistencia: any) => sum + (asistencia.aporte || 0), 0);
        const totalACobrarAsistencias = totalSalary - totalContribution;
        
        // Para cajero: usar el total de asistencias directamente (no sueldo - aporte)
        const totalAsistenciasCajero = asistencias.length > 0 ? asistencias[0].total_final || 0 : 0;

        // Calcular totales de anticipos
        const totalAnticiposAmount = anticipos.reduce((sum: number, anticipo: any) => sum + (anticipo.monto || 0), 0);
        const anticiposPendientes = anticipos.filter((anticipo: any) => anticipo.estado === 1).length;
        const totalAnticiposPendientes = anticipos.filter((anticipo: any) => anticipo.estado === 1).reduce((sum: number, anticipo: any) => sum + (anticipo.monto || 0), 0);

        // Calcular totales de propinas
        const totalPropinasAmount = propinas.reduce((sum: number, propina: any) => sum + (propina.monto || 0), 0);
        const propinasPendientes = propinas.filter((propina: any) => propina.estado === 1).length;
        const totalPropinasPendientes = propinas.filter((propina: any) => propina.estado === 1).reduce((sum: number, propina: any) => sum + (propina.monto || 0), 0);

               // Calcular totales de horas extras
       const totalHorasExtrasAmount = horasExtras.reduce((sum: number, horaExtra: any) => sum + (horaExtra.total || 0), 0);
       const horasExtrasPendientes = horasExtras.filter((horaExtra: any) => horaExtra.estado === 1).length;
       const totalHorasExtrasPendientes = horasExtras.filter((horaExtra: any) => horaExtra.estado === 1).reduce((sum: number, horaExtra: any) => sum + (horaExtra.total || 0), 0);

        // Total a cobrar para cajero: asistencias - anticipos + propinas + horas extras
        const totalACobrar = totalAsistenciasCajero - totalAnticiposPendientes + totalPropinasPendientes + totalHorasExtrasPendientes;

        setDashboardData({
          totalAsistencias: asistencias.length,
          totalAnticipos: anticipos.length,
          totalPropinas: propinas.length,
          totalHorasExtras: horasExtras.length,
          totalPedidos: pedidos.length,
          totalACobrar: totalACobrar,
          anticiposPendientes: anticiposPendientes,
          propinasPendientes: propinasPendientes,
          horasExtrasPendientes: horasExtrasPendientes
        });
           } catch (error) {
       console.error('Error fetching dashboard data:', error);
     } finally {
       setLoadingData(false);
     }
   };

   useEffect(() => {
     if (user && !userLoading) {
       fetchDashboardData();
     }
   }, [user, userLoading]);

     // Solo mostrar para el rol cajero
   if (userLoading || !user || user?.role?.toLowerCase() !== 'cajero') {
     return null;
   }

   if (loadingData) {
     return (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
         {Array.from({ length: 5 }).map((_, i) => (
           <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
         ))}
       </div>
     );
   }

             const dashboardItems = [
    {
      title: "Asistencia",
      description: "Se visualiza la asistencia del usuario",
      icon: Calendar,
      href: "/cajero-asistencias",
      color: "text-blue-600",
      count: dashboardData.totalAsistencias
    },
    {
      title: "Anticipos",
      description: "Se visualiza la lista de anticipos obtenidos del usuario",
      icon: ArrowLeftRight,
      href: "/cajero-anticipos",
      color: "text-orange-600",
      count: dashboardData.totalAnticipos
    },
    {
      title: "Propinas",
      description: "Se visualiza la lista de propinas obtenidos del usuario",
      icon: DollarSign,
      href: "/cajero-propinas",
      color: "text-green-600",
      count: dashboardData.totalPropinas
    },
    {
      title: "Horas extras",
      description: "Se visualiza la lista de horas extras obtenidos del usuario",
      icon: Clock,
      href: "/cajero-horas-extras",
      color: "text-purple-600",
      count: dashboardData.totalHorasExtras
    },
    {
      title: "Calendario",
      description: "Vista de calendario con todas las actividades",
      icon: CalendarDays,
      href: "/cajero-calendar",
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
             {user?.name} {user?.lastName} - Cajero
           </h1>
           <p className="text-gray-600">Panel de control para cajeros</p>
         </div>
         
         {/* Total a Cobrar centrado debajo del nombre */}
         <div className="text-center">
           <p className="text-sm text-gray-500">TOTAL A COBRAR</p>
           <div className="text-2xl font-bold text-gray-900">
             {loadingData ? (
               <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
             ) : (
               formatCurrencyCLP(dashboardData.totalACobrar)
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

