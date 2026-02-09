'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Calendar
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ReportSkeleton } from '@/components/ui/skeletons';

// Lazy loading de reportes pesados
const SalesReport = dynamic(
  () => import('@/components/reports/SalesReport').then(mod => ({ default: mod.SalesReport })),
  { 
    loading: () => <ReportSkeleton />,
    ssr: false 
  }
);

const CommissionsReport = dynamic(
  () => import('@/components/reports/CommissionsReport').then(mod => ({ default: mod.CommissionsReport })),
  { 
    loading: () => <ReportSkeleton />,
    ssr: false 
  }
);

const CashRegisterReport = dynamic(
  () => import('@/components/reports/CashRegisterReport').then(mod => ({ default: mod.CashRegisterReport })),
  { 
    loading: () => <ReportSkeleton />,
    ssr: false 
  }
);



const reportTypes = [
  {
    id: 'sales',
    title: 'Reporte de Ventas',
    description: 'Análisis detallado de ventas por período',
    icon: BarChart3,
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    id: 'commissions',
    title: 'Comisiones por Anfitriona',
    description: 'Rendimiento y comisiones del personal',
    icon: Users,
    color: 'bg-green-500',
    gradient: 'from-green-500 to-green-600'
  },
  {
    id: 'cash-register',
    title: 'Reporte de Caja',
    description: 'Balance y movimientos de caja',
    icon: DollarSign,
    color: 'bg-yellow-500',
    gradient: 'from-yellow-500 to-yellow-600'
  }
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('sales');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  


  if (!mounted) {
    return null;
  }
  
  return (
    <PermissionGuard module="reportes" action="listar">

    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
            <p className="text-gray-600 mt-2">
              Análisis detallado y estadísticas del negocio
            </p>
        </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
                      </div>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((report) => {
            const IconComponent = report.icon;
            return (
              <Card 
                key={report.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                  activeReport === report.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setActiveReport(report.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${report.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <p className="text-sm text-gray-600">{report.description}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Report Content */}
        <div className="mt-8">
          {activeReport === 'sales' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">Reporte de Ventas</h2>
              </div>
              <SalesReport />
            </div>
          )}
          
          {activeReport === 'commissions' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-green-500" />
                <h2 className="text-2xl font-bold text-gray-900">Reporte de Comisiones por Anfitriona</h2>
              </div>
              <CommissionsReport />
            </div>
          )}
          
          {activeReport === 'cash-register' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-yellow-500" />
                <h2 className="text-2xl font-bold text-gray-900">Reporte de Caja</h2>
              </div>

              <CashRegisterReport />
            </div>
          )}
              </div>
    </div>
    </PermissionGuard>
  );
}
