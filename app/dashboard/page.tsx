'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSkeleton, StatsCardSkeleton, ChartSkeleton } from '@/components/ui/skeletons';
import { SupervisorMap } from '@/components/dashboard/SupervisorMap';

// Lazy load de componentes pesados
const LoggedUsersCards = dynamic(
  () => import('@/components/dashboard/LoggedUsersCards'),
  { loading: () => <StatsCardSkeleton /> }
);

const DashboardStatsCards = dynamic(
  () => import('@/components/dashboard/DashboardStatsCards'),
  { loading: () => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}</div> }
);

const SalesChart = dynamic(
  () => import('@/components/sales-chart').then(mod => ({ default: mod.SalesChart })),
  { loading: () => <ChartSkeleton /> }
);

const WeeklySalesChart = dynamic(
  () => import('@/components/weekly-sales-chart').then(mod => ({ default: mod.WeeklySalesChart })),
  { loading: () => <ChartSkeleton /> }
);

export default function Dashboard() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      console.log('Dashboard - Usuario detectado:', user.role); // Debug

      // Si el usuario es anfitriona, redirigir a la vista específica
      if (user.role?.toLowerCase() === 'anfitriona') {
        console.log('Redirigiendo a anfitriona-dashboard'); // Debug
        router.replace('/anfitriona-dashboard');
        return;
      }
      // Si el usuario es garzon, redirigir a la vista específica
      if (user.role?.toLowerCase() === 'garzon') {
        console.log('Redirigiendo a garzon-dashboard'); // Debug
        router.replace('/garzon-dashboard');
        return;
      }
    }
  }, [user, loading, router]);

  // Si está cargando, mostrar loading
  if (loading) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Cargando...</p>
        </div>
      </div>
    );
  }

  // Si es anfitriona o garzon, no renderizar nada (ya se está redirigiendo)
  if (user?.role?.toLowerCase() === 'anfitriona' || user?.role?.toLowerCase() === 'garzon') {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>
            Redirigiendo a {user.role.toLowerCase()}-dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Verificar si el usuario es cajero
  const isCajero = user?.role?.toLowerCase() === 'cajero';
  return (
    <div className='p-6 space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>Dashboard</h1>
        <p className='text-gray-600 dark:text-gray-400'>Bienvenido al panel de administración</p>
      </div>

      <LoggedUsersCards />

      {/* Mapa de Habitaciones (Nuevo) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <SupervisorMap />
      </div>

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
    </div>
  );
}
