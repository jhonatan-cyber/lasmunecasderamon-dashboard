'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { DashboardSkeleton, ChartSkeleton } from '@/components/shared/Skeletons';
import { LazyQRCode } from '@/components/shared/LazyQRCode';
import { Medal, TrendingUp, BarChart3, Activity, Clock, ShieldCheck, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/utils';

import CriticalMetrics from '@/components/dashboard/CriticalMetrics';
import LocalAndPending from '@/components/dashboard/LocalAndPending';
import RecentActivityCompact from '@/components/dashboard/RecentActivityCompact';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import MiniSalesChart from '@/components/dashboard/MiniSalesChart';
import TopPerformers from '@/components/dashboard/TopPerformers';
import ForecastInsights from '@/components/dashboard/ForecastInsights';
import LoggedUsersCards from '@/components/dashboard/LoggedUsersCards';

const DashboardStatsCards = dynamic(() => import('@/components/dashboard/DashboardStatsCards'), {
  loading: () => <ChartSkeleton />
});

export default function Dashboard() {
  const { user, loading, refetch } = useCurrentUser();
  const router = useRouter();
  const [codigoAsistencia, setCodigoAsistencia] = useState<string>('');

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

  useEffect(() => {
    if (!user?.qr_token) return;

    const fetchCodigo = async () => {
      try {
        const res = await fetch('/api/codigo/actual', {
          headers: { 'x-user-role': user.role || '' }
        });
        const data = await res.json();
        if (data.success) setCodigoAsistencia(data.codigo);
      } catch {}
    };
    fetchCodigo();

    const es = new EventSource('/api/notifications/sse');
    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'code_changed' && payload.data?.codigo) {
          setCodigoAsistencia(payload.data.codigo);
        }
        if (payload.type === 'qr_token_updated' && payload.data?.userId === user.id) {
          refetch(true);
        }
      } catch {}
    };

    return () => es.close();
  }, [user?.qr_token, user?.role, user?.id, refetch]);

  const [marcandoEntrada, setMarcandoEntrada] = useState(false);

  const handleMarcarEntrada = async () => {
    setMarcandoEntrada(true);
    try {
      const res = await fetch('/api/attendance/marcar', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Error al marcar entrada');
      }
    } catch {
      toast.error('Error de conexión al marcar entrada');
    } finally {
      setMarcandoEntrada(false);
    }
  };

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

      {shouldShowSkeleton ? (
        <DashboardSkeleton />
      ) : (
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

            {user?.qr_token && (
              <div className={cn('space-y-6', !isCajero && 'lg:col-start-2')}>
                <div className='flex items-center gap-2 px-2'>
                  <ShieldCheck className='h-4 w-4 text-indigo-500' />
                  <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>
                    Asistencia Biométrica
                  </h2>
                </div>
                <div className='relative overflow-hidden rounded-[2.5rem] bg-indigo-600 p-10 text-white shadow-2xl shadow-indigo-200 dark:shadow-none group'>
                  <div className='absolute -right-10 -top-10 h-60 w-60 rounded-full bg-white/10 blur-3xl transition-all group-hover:scale-125' />
                  <div className='relative space-y-8 flex flex-col items-center'>
                    <div className='text-center space-y-2'>
                      <h3 className='text-3xl font-black tracking-tight'>Control</h3>
                      <p className='text-[10px] font-black text-indigo-100 uppercase tracking-widest opacity-70'>
                        Escanear para marcar
                      </p>
                    </div>
                    <div className='bg-white p-6 rounded-[2rem] shadow-2xl scale-110'>
                      <LazyQRCode
                        value={user.qr_token}
                        size={160}
                        level='H'
                        fgColor='#4F46E5'
                        imageSettings={
                          user.foto
                            ? {
                                src: `/img/users/${user.foto}`,
                                height: 40,
                                width: 40,
                                excavate: true
                              }
                            : undefined
                        }
                      />
                    </div>
                    {codigoAsistencia && (
                      <div className='w-full bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center'>
                        <span className='text-4xl font-black font-mono tracking-[0.3em] ml-[0.3em]'>
                          {codigoAsistencia}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={handleMarcarEntrada}
                      disabled={marcandoEntrada}
                      className='w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm'
                    >
                      <LogIn className='h-4 w-4' />
                      {marcandoEntrada ? 'Registrando...' : 'Marcar Entrada'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
