'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { DashboardSkeleton, StatsCardSkeleton, ChartSkeleton } from '@/components/shared/Skeletons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LazyQRCode } from '@/components/shared/LazyQRCode';

const LoggedUsersCards = dynamic(() => import('@/components/dashboard/LoggedUsersCards'), {
  loading: () => <StatsCardSkeleton />
});

const DashboardStatsCards = dynamic(() => import('@/components/dashboard/DashboardStatsCards'), {
  loading: () => (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
      {[...Array(4)].map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  )
});

const SalesChart = dynamic(
  () => import('@/components/sales-chart').then(mod => ({ default: mod.SalesChart })),
  { loading: () => <ChartSkeleton /> }
);

const WeeklySalesChart = dynamic(
  () => import('@/components/weekly-sales-chart').then(mod => ({ default: mod.WeeklySalesChart })),
  { loading: () => <ChartSkeleton /> }
);

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

    const checkToken = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}`);
        const data = await res.json();
        if (data.success && data.user && data.user.qr_token !== user.qr_token) {
          refetch(true);
        }
      } catch (e) {
        console.error('Error polling user status:', e);
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

    // Escuchar cambios en tiempo real via SSE (sin polling)
    const es = new EventSource('/api/notifications/sse');
    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'code_changed' && payload.data?.codigo) {
          setCodigoAsistencia(payload.data.codigo);
        }
      } catch {}
    };

    return () => {
      es.close();
    };
  }, [user?.qr_token, user?.role]);

  const isCajero = user?.role?.toLowerCase() === 'cajero';
  const shouldShowSkeleton =
    loading || user?.role?.toLowerCase() === 'anfitriona' || user?.role?.toLowerCase() === 'garzon';

  return (
    <div className='p-6 space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>Dashboard</h1>
        <p className='text-gray-600 dark:text-gray-400'>Bienvenido al panel de administración</p>
      </div>

      {shouldShowSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
          {user?.qr_token && (
            <Card className='max-w-md border-2 border-indigo-100 bg-indigo-50/30 overflow-hidden'>
              <CardHeader className='text-center pb-2'>
                <CardTitle className='text-lg'>Mi Registro de Asistencia</CardTitle>
                <CardDescription>
                  Escanea este código con tu celular para marcar entrada
                </CardDescription>
              </CardHeader>
              <CardContent className='flex flex-col items-center'>
                <div className='bg-white p-3 rounded-xl shadow-sm border border-indigo-100'>
                  <LazyQRCode
                    value={user.qr_token}
                    size={160}
                    level='H'
                    includeMargin={true}
                    fgColor='#4F46E5'
                    imageSettings={
                      user.foto
                        ? {
                            src: `/img/users/${user.foto}`,
                            height: 35,
                            width: 35,
                            excavate: true
                          }
                        : undefined
                    }
                  />
                </div>
                <p className='text-[10px] mt-2 text-indigo-400 font-mono select-all uppercase'>
                  ID: {user.qr_token}
                </p>
                {codigoAsistencia && (
                  <div className='mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2'>
                    <span className='text-xs font-semibold text-indigo-400 uppercase tracking-widest'>
                      Código:
                    </span>
                    <span className='text-2xl font-black font-mono tracking-widest text-indigo-700'>
                      {codigoAsistencia}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <LoggedUsersCards />

          {/* Cards de estadísticas del dashboard */}
          <DashboardStatsCards />

          {/* Solo mostrar charts si NO es cajero */}
          {!isCajero && (
            <div className='grid gap-6 md:grid-cols-1 lg:grid-cols-2'>
              <div>
                <SalesChart />
              </div>
              <div>
                <WeeklySalesChart />
              </div>
            </div>
          )}

          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'></div>
        </>
      )}
    </div>
  );
}
