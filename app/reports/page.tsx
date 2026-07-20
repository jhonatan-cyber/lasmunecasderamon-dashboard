'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Skeleton as BoneyardSkeleton } from '@/components/shared/Skeleton';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';

const SalesReport = dynamic(
  () => import('@/components/reports/SalesReport').then(mod => ({ default: mod.SalesReport })),
  {
    loading: () => <BoneyardSkeleton name='report-sales-content' loading={true} />,
    ssr: false
  }
);

const CommissionsReport = dynamic(
  () =>
    import('@/components/reports/CommissionsReport').then(mod => ({
      default: mod.CommissionsReport
    })),
  {
    loading: () => <BoneyardSkeleton name='report-commissions-content' loading={true} />,
    ssr: false
  }
);

const CashRegisterReport = dynamic(
  () =>
    import('@/components/reports/CashRegisterReport').then(mod => ({
      default: mod.CashRegisterReport
    })),
  {
    loading: () => <BoneyardSkeleton name='report-cash-content' loading={true} />,
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
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <BoneyardSkeleton name='reports-main' loading={true} />;
  }

  return (
    <PermissionGuard module='reports' action='view'>
      <BoneyardSkeleton name='reports-main' loading={false}>
        <div className='p-6 space-y-6'>
          {}
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>Reportes</h1>
              <p className='text-gray-600 mt-2'>Análisis detallado y estadísticas del negocio</p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleRefresh}
                className='h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors'
                title='Refrescar datos'
              >
                <RefreshCw className='h-4 w-4' />
              </Button>
              <div className='hidden sm:flex h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1'></div>
              <span className='text-sm text-gray-500'>{formatLongDateEs(new Date())}</span>
            </div>
          </div>

          {}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {reportTypes.map(report => {
              const IconComponent = report.icon;
              const isActive = activeReport === report.id;
              return (
                <Card
                  key={report.id}
                  className={`group cursor-pointer transition-all duration-300 border-2 ${
                    isActive
                      ? 'border-blue-500 shadow-lg shadow-blue-500/10 scale-[1.02] bg-blue-50/30 dark:bg-blue-900/10'
                      : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md'
                  }`}
                  onClick={() => setActiveReport(report.id)}
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${
                          isActive ? report.color : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        } text-white`}
                      >
                        <IconComponent className='h-5 w-5' />
                      </div>
                      <div className='flex-1'>
                        <CardTitle
                          className={`text-lg transition-colors ${isActive ? 'text-blue-700 dark:text-blue-400' : ''}`}
                        >
                          {report.title}
                        </CardTitle>
                        <p className='text-xs text-gray-500 mt-0.5'>{report.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {}
          <div className='mt-8'>
            {activeReport === 'sales' && (
              <div className='space-y-6 animate-in fade-in duration-500'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                    <BarChart3 className='h-6 w-6 text-blue-600 dark:text-blue-400' />
                  </div>
                  <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    Reporte de Ventas
                  </h2>
                </div>
                <SalesReport key={`sales-${refreshKey}`} />
              </div>
            )}

            {activeReport === 'commissions' && (
              <div className='space-y-6 animate-in fade-in duration-500'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 rounded-lg bg-green-100 dark:bg-green-900/30'>
                    <Users className='h-6 w-6 text-green-600 dark:text-green-400' />
                  </div>
                  <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    Reporte de Comisiones
                  </h2>
                </div>
                <CommissionsReport key={`commissions-${refreshKey}`} />
              </div>
            )}

            {activeReport === 'cash-register' && (
              <div className='space-y-6 animate-in fade-in duration-500'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30'>
                    <DollarSign className='h-6 w-6 text-yellow-600 dark:text-yellow-400' />
                  </div>
                  <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    Reporte de Caja
                  </h2>
                </div>
                <CashRegisterReport key={`cash-${refreshKey}`} />
              </div>
            )}
          </div>
        </div>
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}
