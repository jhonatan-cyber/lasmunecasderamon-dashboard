'use client';

import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, Clock, ArrowLeftRight, ShoppingCart, LogIn } from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { LazyQRCode } from '@/components/shared/LazyQRCode';
import { toast } from 'sonner';

import { useDashboardSummary } from '@/hooks/stats/useDashboardSummary';

export default function GarzonDashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    data: dashboardData,
    isLoading: loadingSummary,
    error: summaryError,
    refetch: refreshDashboard
  } = useDashboardSummary();

  const { refetch: refetchUser } = useCurrentUser();
  useEffect(() => {
    if (!user?.qr_token) return;

    const checkToken = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}`);
        const data = await res.json();
        if (data.success && data.user && data.user.qr_token !== user.qr_token) {
          refetchUser(true);
        }
      } catch (e) {
        console.error('Error polling user status:', e);
      }
    };

    const interval = setInterval(checkToken, 60000);
    window.addEventListener('focus', checkToken);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkToken);
    };
  }, [user?.id, user?.qr_token, refetchUser]);

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

  if (userLoading || (loadingSummary && !dashboardData)) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Cargando Dashboard...</p>
        </div>
      </div>
    );
  }

  if (user?.role?.toLowerCase() !== 'garzon') {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Acceso Denegado</h1>
          <p className='text-gray-600'>No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (summaryError || !dashboardData) {
    return (
      <div className='p-6'>
        <Card className='border-red-200 bg-red-50'>
          <CardContent className='p-8 text-center text-red-600'>
            <h2 className='text-xl font-bold mb-2'>Error al cargar el dashboard</h2>
            <p className='mb-4'>
              No pudimos conectar con el servidor para obtener tus estadísticas.
            </p>
            <Button onClick={() => refreshDashboard()} variant='destructive'>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboardItems = [
    {
      title: 'Asistencia',
      description: 'Se visualiza la asistencia del usuario',
      icon: Calendar,
      href: '/garzon-asistencias',
      color: 'text-blue-600',
      count: dashboardData.totalAsistencias
    },
    {
      title: 'Anticipos',
      description: 'Se visualiza la lista de anticipos obtenidos del usuario',
      icon: ArrowLeftRight,
      href: '/garzon-anticipos',
      color: 'text-orange-600',
      count: dashboardData.totalAnticipos
    },
    {
      title: 'Propinas',
      description: 'Se visualiza la lista de propinas obtenidos del usuario',
      icon: DollarSign,
      href: '/garzon-propinas',
      color: 'text-green-600',
      count: dashboardData.totalPropinas
    },
    {
      title: 'Horas extras',
      description: 'Se visualiza la lista de horas extras obtenidos del usuario',
      icon: Clock,
      href: '/garzon-horas-extras',
      color: 'text-purple-600',
      count: dashboardData.totalHorasExtras
    },
    {
      title: 'Calendario',
      description: 'Vista de calendario con todas las actividades',
      icon: Calendar,
      href: '/garzon-calendar',
      color: 'text-indigo-600',
      count: 0
    },
    {
      title: 'Pedidos',
      description: 'Se realizan los pedidos',
      icon: ShoppingCart,
      href: '/orders',
      color: 'text-red-600',
      count: dashboardData.totalPedidos
    }
  ];

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='space-y-4'>
        <div className='text-left'>
          <h1 className='text-2xl font-bold text-gray-900'>
            {user?.name} {user?.lastName} - Garzon
          </h1>
          <p className='text-gray-600'>Panel de control para garzones</p>
        </div>

        {/* Total a Cobrar centrado debajo del nombre */}
        <div className='text-center'>
          <p className='text-sm text-gray-500'>TOTAL A COBRAR</p>
          <div className='text-2xl font-bold text-gray-900'>
            {loadingSummary ? (
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto'></div>
            ) : (
              formatCurrencyCLP(dashboardData.totalACobrar)
            )}
          </div>
        </div>
      </div>

      {/* QR de Asistencia - New Section */}
      {user?.qr_token && (
        <Card className='max-w-md mx-auto border-2 border-orange-100 bg-orange-50/30 overflow-hidden'>
          <CardHeader className='text-center pb-2'>
            <CardTitle className='text-lg'>Mi Registro de Asistencia</CardTitle>
            <CardDescription>
              Escanea el código o presiona el botón para marcar entrada
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col items-center gap-4'>
            <div className='bg-white p-3 rounded-xl shadow-sm border border-orange-100'>
              <LazyQRCode
                value={user.qr_token}
                size={160}
                level='H'
                includeMargin={true}
                fgColor='#F97316'
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
            <p className='text-[10px] text-orange-400 font-mono select-all uppercase'>
              ID: {user.qr_token}
            </p>
            <Button
              onClick={handleMarcarEntrada}
              disabled={marcandoEntrada}
              className='w-full gap-2'
              variant='default'
            >
              <LogIn className='h-4 w-4' />
              {marcandoEntrada ? 'Registrando...' : 'Marcar Entrada'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Cards */}
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {dashboardItems.map(item => (
          <Link key={item.title} href={item.href}>
            <Card className='hover:shadow-lg transition-shadow duration-200 cursor-pointer border-dotted border-2 border-gray-200'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                  <span className='text-2xl font-bold text-gray-900'>{item.count}</span>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className='text-xl font-bold text-gray-900 mb-2'>{item.title}</CardTitle>
                <CardDescription className='text-sm text-gray-600'>
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
