'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { MarcarAsistenciaCard } from '@/components/attendance/MarcarAsistenciaCard';
import { Medal, TrendingUp, BarChart3, Activity, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/utils';

import CriticalMetrics from '@/components/dashboard/CriticalMetrics';
import LocalAndPending from '@/components/dashboard/LocalAndPending';
import RecentActivityCompact from '@/components/dashboard/RecentActivityCompact';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import TopPerformers from '@/components/dashboard/TopPerformers';
import ForecastInsights from '@/components/dashboard/ForecastInsights';
import LoggedUsersCards from '@/components/dashboard/LoggedUsersCards';

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
  return <GeneralDashboard />;
}

function GeneralDashboard() {
  const { user, loading, refetch } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role?.toLowerCase() === 'anfitriona') {
        router.replace('/anfitriona-dashboard');
        return;
      }
      if (user.role?.toLowerCase() === 'garzon') {
        router.replace('/garzon-dashboard');
        return;
      }
    }
  }, [user, loading, router]);

  const isCajero = user?.role?.toLowerCase() === 'cajero';
  const shouldShowSkeleton =
    loading || user?.role?.toLowerCase() === 'anfitriona' || user?.role?.toLowerCase() === 'garzon';

  return (
    <div className='p-4 md:p-8 space-y-10 bg-slate-50/50 dark:bg-transparent min-h-screen pb-20'>
      {}
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
          {}
          <section className='space-y-6'>
            <div className='flex items-center gap-2 px-2'>
              <ShieldCheck className='h-4 w-4 text-emerald-500' />
              <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>
                Personal en Local (Login Activo)
              </h2>
            </div>
            <LoggedUsersCards />
          </section>

          {}
          <section className='space-y-6'>
            <div className='flex items-center gap-2 px-2'>
              <BarChart3 className='h-4 w-4 text-emerald-500' />
              <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>
                Tendencias de Venta Diaria
              </h2>
            </div>
            <MiniSalesChart />
          </section>

          {}
          <section className='space-y-6'>
            <div className='flex items-center gap-2 px-2'>
              <TrendingUp className='h-4 w-4 text-emerald-500' />
              <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>
                Métricas Críticas de Operación
              </h2>
            </div>
            <CriticalMetrics />
          </section>

          {}
          <section className='space-y-6'>
            <div className='flex items-center gap-2 px-2'>
              <Medal className='h-4 w-4 text-amber-400' />
              <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>
                Performance y Forecast
              </h2>
            </div>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-10'>
              <CollapsibleSection title='Top Performers' icon={Medal} defaultOpen={true}>
                <TopPerformers />
              </CollapsibleSection>

              <CollapsibleSection title='Proyección Forecast' icon={TrendingUp} defaultOpen={true}>
                <ForecastInsights />
              </CollapsibleSection>
            </div>
          </section>

          {}
          <section className='space-y-6'>
            <div className='flex items-center gap-2 px-2'>
              <Activity className='h-4 w-4 text-indigo-500' />
              <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>
                Operación en Tiempo Real
              </h2>
            </div>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-10 items-start'>
              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-3 px-1'>
                  <div className='p-2 rounded-xl bg-emerald-500/10 text-emerald-500'>
                    <Activity className='h-4 w-4' />
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white'>
                      Estado Operativo
                    </span>
                    <span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter'>
                      Monitoreo Local
                    </span>
                  </div>
                </div>
                <div className='rounded-3xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-950/40 p-6 shadow-xl shadow-slate-200/20 dark:shadow-none min-h-[300px]'>
                  <LocalAndPending />
                </div>
              </div>

              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-3 px-1'>
                  <div className='p-2 rounded-xl bg-slate-500/10 text-slate-500'>
                    <Clock className='h-4 w-4' />
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white'>
                      Flujo de Actividad
                    </span>
                    <span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter'>
                      Logs de Turno
                    </span>
                  </div>
                </div>
                <div className='rounded-3xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-950/40 p-6 shadow-xl shadow-slate-200/20 dark:shadow-none min-h-[300px]'>
                  <RecentActivityCompact />
                </div>
              </div>
            </div>
          </section>

          {}
          <section className='grid grid-cols-1 lg:grid-cols-3 gap-10 items-start'>
            {isCajero && (
              <div className='lg:col-span-2'>
                <div className='flex items-center gap-2 px-2 mb-6'>
                  <BarChart3 className='h-4 w-4 text-emerald-500' />
                  <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>
                    Reportes del Cajero
                  </h2>
                </div>
                <DashboardStatsCards />
              </div>
            )}

            <div className={cn('space-y-6', !isCajero && 'lg:col-start-2')}>
              <MarcarAsistenciaCard />
            </div>
          </section>
        </div>
      </BoneyardSkeleton>
    </div>
  );
}
