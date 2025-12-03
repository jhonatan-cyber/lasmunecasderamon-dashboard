'use client';

import LoggedUsersCards from '@/components/dashboard/LoggedUsersCards';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards';
import { SalesChart } from '@/components/sales-chart';
import { WeeklySalesChart } from '@/components/weekly-sales-chart';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Si el usuario es anfitriona, redirigir a la vista específica
      if (user.role?.toLowerCase() === 'anfitriona') {
        router.push('/anfitriona-dashboard');
        return;
      }
      // Si el usuario es garzon, redirigir a la vista específica
      if (user.role?.toLowerCase() === 'garzon') {
        router.push('/garzon-dashboard');
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

  // Verificar si el usuario es cajero
  const isCajero = user?.role?.toLowerCase() === 'cajero';
  return (
    <div className='p-6 space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>Dashboard</h1>
        <p className='text-gray-600 dark:text-gray-400'>Bienvenido al panel de administración</p>
      </div>



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
    </div>
  );
}
