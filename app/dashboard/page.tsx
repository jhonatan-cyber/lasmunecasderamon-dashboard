'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type CurrentUser, useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { Medal, TrendingUp, BarChart3, Activity, Clock, ShieldCheck } from 'lucide-react';

import CriticalMetrics from '@/components/dashboard/CriticalMetrics';
import LocalAndPending from '@/components/dashboard/LocalAndPending';
import RecentActivityCompact from '@/components/dashboard/RecentActivityCompact';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import TopPerformers from '@/components/dashboard/TopPerformers';
import ForecastInsights from '@/components/dashboard/ForecastInsights';
import LoggedUsersCards from '@/components/dashboard/LoggedUsersCards';
import { PanelHeading, SectionHeading } from '@/components/dashboard/DashboardHeading';
import { ReplenishmentNotice } from '@/components/purchases/ReplenishmentNotice';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

const DashboardStatsCards = dynamic(() => import('@/components/dashboard/DashboardStatsCards'), {
  loading: () => <div className='h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse' />
});

const MiniSalesChart = dynamic(() => import('@/components/dashboard/MiniSalesChart'), {
  loading: () => (
    <div className='h-[500px] bg-slate-100 dark:bg-slate-800 rounded-[3rem] animate-pulse' />
  )
});

const BarmanDashboard = dynamic(() => import('@/components/bar/BarmanDashboard'));

export default function Dashboard() {
  const { user, loading } = useCurrentUser();
  if (loading || !user)
    return (
      <p role='status' className='p-6 text-muted-foreground'>
        Cargando dashboard…
      </p>
    );
  if (user.role?.toLowerCase() === 'barman')
    return <BarmanDashboard name={user.name || 'Barman'} />;
  return <GeneralDashboard user={user} />;
}

function GeneralDashboard({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const role = user.role?.toLowerCase();

  useEffect(() => {
    if (role === 'anfitriona') {
      router.replace('/hostess-dashboard');
      return;
    }
    if (role === 'garzon') {
      router.replace('/waiter-dashboard');
    }
  }, [role, router]);

  const isCajero = role === 'cajero';
  const shouldShowSkeleton = role === 'anfitriona' || role === 'garzon';

  return (
    <div className='p-4 md:p-8 space-y-10 bg-slate-50/50 dark:bg-transparent min-h-screen pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-3xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase'>
            Dashboard
          </h1>
          <div className='flex items-center gap-2'>
            <div className='h-1.5 w-16 bg-emerald-500 rounded-full' />
            <p className='text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest'>
              Business Intelligence & Control
            </p>
          </div>
        </div>
      </div>

      <BoneyardSkeleton name='dashboard-main' loading={shouldShowSkeleton}>
        <div className='space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000'>
          <PermissionGuard module='products' action='view' fallback={null}>
            <ReplenishmentNotice showProducts />
          </PermissionGuard>
          <section className='space-y-6'>
            <SectionHeading icon={ShieldCheck} title='Personal en Local (Login Activo)' />
            <LoggedUsersCards />
          </section>

          <section className='space-y-6'>
            <SectionHeading icon={BarChart3} title='Tendencias de Venta Diaria' />
            <MiniSalesChart />
          </section>

          <section className='space-y-6'>
            <SectionHeading icon={TrendingUp} title='Métricas Críticas de Operación' />
            <CriticalMetrics />
          </section>

          <section className='space-y-6'>
            <SectionHeading icon={Medal} title='Performance y Forecast' tone='amber' />
            <div className='grid grid-cols-1 gap-10'>
              <CollapsibleSection title='Top Performers' icon={Medal} defaultOpen={true}>
                <TopPerformers />
              </CollapsibleSection>

              <CollapsibleSection title='Proyección Forecast' icon={TrendingUp} defaultOpen={true}>
                <ForecastInsights />
              </CollapsibleSection>
            </div>
          </section>

          <section className='space-y-6'>
            <SectionHeading icon={Activity} title='Operación en Tiempo Real' tone='indigo' />
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-10 items-start'>
              <div className='flex flex-col gap-4'>
                <PanelHeading
                  icon={Activity}
                  title='Estado Operativo'
                  description='Monitoreo Local'
                />
                <div className='min-w-0'>
                  <LocalAndPending />
                </div>
              </div>

              <div className='flex flex-col gap-4'>
                <PanelHeading
                  icon={Clock}
                  title='Flujo de Actividad'
                  description='Logs de Turno'
                  tone='slate'
                />
                <div className='rounded-3xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-950/40 p-6 shadow-xl shadow-slate-200/20 dark:shadow-none min-h-[300px]'>
                  <RecentActivityCompact />
                </div>
              </div>
            </div>
          </section>

          {isCajero && (
            <section className='grid grid-cols-1 lg:grid-cols-3 gap-10 items-start'>
              <div className='lg:col-span-2'>
                <SectionHeading icon={BarChart3} title='Reportes del Cajero' className='mb-6' />
                <DashboardStatsCards />
              </div>
            </section>
          )}
        </div>
      </BoneyardSkeleton>
    </div>
  );
}
