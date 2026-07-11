'use client';

import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import RoleCalendar from '@/components/shared/RoleCalendar';

export function GarzonCalendarPageClient() {
  const { user, loading } = useCurrentUser();

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

  if (user?.role?.toLowerCase() !== 'garzon') {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Acceso Denegado</h1>
          <p className='text-gray-600'>No tienes permisos para acceder a esta pagina.</p>
        </div>
      </div>
    );
  }

  return <RoleCalendar role='garzon' userId={user?.id} backLink='/garzon-dashboard' />;
}
