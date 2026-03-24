/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Users, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrencyCLP } from "@/lib/formatters";

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
      // Fetch asistencias (detalle y resumen para descuento)
      const [asistenciasRes, asistenciasSummaryRes, comisionesRes, serviciosRes, anticiposRes] = await Promise.all([
        fetch("/api/asistencias/user?tipo=detalle"),
        fetch("/api/asistencias/user"),
        fetch("/api/commissions/user"),
        fetch("/api/servicios/user"),
        fetch("/api/anticipos/user"),
      ]);

      const asistenciasData = await asistenciasRes.json();
      const asistenciasSummary = await asistenciasSummaryRes.json();
      const comisionesData = await comisionesRes.json();
      const serviciosData = await serviciosRes.json();
      const anticiposData = await anticiposRes.json();

      // Calcular totales
      const asistencias = asistenciasData.success ? (asistenciasData.data || []) : [];
      const comisiones = comisionesData.success ? (comisionesData.data || []) : [];
      const servicios = serviciosData.success ? (serviciosData.data || []) : [];
      const anticipos = anticiposData.success ? (anticiposData.data || []) : [];

      // Descuento habitación semanal desde resumen
      let housingDiscountTotal = 0;
      if (asistenciasSummary.success && Array.isArray(asistenciasSummary.data) && asistenciasSummary.data.length > 0) {
        const row = asistenciasSummary.data[0];
        housingDiscountTotal = Number(row.descuento_total || 0);
      }

      // Calcular totales de asistencias (estado 1)
      const asistenciasEstado1 = asistencias.filter((a: any) => a.estado === 1);
      const totalSalary = asistenciasEstado1.reduce((sum: number, a: any) => sum + (a.sueldo || 0), 0);
      const totalContribution = asistenciasEstado1.reduce((sum: number, a: any) => sum + (a.aporte || 0), 0);
      const totalACobrarAsistencias = Math.max(0, (totalSalary - totalContribution) - (housingDiscountTotal || 0));

      // Calcular totales de comisiones de ventas (solo pendientes estado = 1)
      const comisionesVentas = comisiones.filter((c: any) => c.tipo === 'venta' && c.estado === 1);
      const comisionesVentasCount = comisionesVentas.length;
      const totalComisionesVentas = comisionesVentas.reduce((sum: number, c: any) => sum + (c.comision || 0), 0);

      // Calcular totales de servicios (sumar comisiones de servicios estado = 0 y 1)
      const serviciosCompletadosArr = servicios.filter((s: any) => s.estado === 0 || s.estado === 1);
      const serviciosCompletados = serviciosCompletadosArr.length;
      
      // Obtener comisiones de servicios específicamente
      const comisionesServicios = comisiones.filter((c: any) => c.tipo === 'servicio' && c.estado === 1);
      const totalGanadoServicios = comisionesServicios.reduce((sum: number, c: any) => sum + (c.comision || 0), 0);

      // Calcular totales de anticipos (solo pendientes estado = 1)
      const anticiposPendientesArr = anticipos.filter((a: any) => a.estado === 1);
      const anticiposPendientes = anticiposPendientesArr.length;
      const totalAnticiposPendientes = anticiposPendientesArr.reduce((sum: number, a: any) => sum + (a.monto || 0), 0);

      // Total a cobrar (asistencias - desc. habitación ya aplicado arriba + comisiones ventas + comisiones servicios - anticipos pendientes)
      const totalACobrar = totalACobrarAsistencias + totalComisionesVentas + totalGanadoServicios - totalAnticiposPendientes;

      setDashboardData({
        totalAsistencias: asistencias.length,
        totalComisiones: comisiones.length,
        totalServicios: servicios.length,
        totalAnticipos: anticipos.length,
        totalACobrar: totalACobrar,
        comisionesPendientes: comisionesVentasCount,
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

  // Polling para actualización del QR en tiempo real sin parpadeo
  const { refetch } = useCurrentUser();
  useEffect(() => {
    if (!user?.qr_token) return;
    
    const checkToken = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}`);
        const data = await res.json();
        if (data.success && data.user && data.user.qr_token !== user.qr_token) {
           refetch(true);
        }
      } catch (e) {
        console.error("Error polling user status:", e);
      }
    };

    const interval = setInterval(checkToken, 60000); // Polling cada 60 segundos
    
    // También verificar cuando el usuario vuelve a la pestaña
    window.addEventListener('focus', checkToken);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkToken);
    };
  }, [user?.id, user?.qr_token, refetch]);

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
              formatCurrencyCLP(dashboardData.totalACobrar)
            )}
          </div>
        </div>
      </div>

      {/* QR de Asistencia - New Section */}
      {user?.qr_token && (
        <Card className="max-w-md mx-auto border-2 border-blue-100 bg-blue-50/30 overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Mi Registro de Asistencia</CardTitle>
            <CardDescription>Escanea este código con tu celular para marcar entrada</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100">
                <QRCodeSVG 
                  value={user.qr_token} 
                  size={160} 
                  level="H" 
                  includeMargin={true}
                  fgColor="#E11D48"
                  imageSettings={user.foto ? {
                    src: `/img/users/${user.foto}`,
                    height: 35,
                    width: 35,
                    excavate: true,
                  } : undefined}
                />
            </div>
            <p className="text-[10px] mt-2 text-blue-400 font-mono select-all uppercase">ID: {user.qr_token}</p>
          </CardContent>
        </Card>
      )}

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

