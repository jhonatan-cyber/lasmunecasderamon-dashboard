'use client';

import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Calendar,
  DollarSign,
  Clock,
  ArrowLeftRight,
  ShoppingCart,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { MarcarAsistenciaCard } from '@/components/attendance/MarcarAsistenciaCard';

import { useDashboardSummary } from '@/hooks/stats/useDashboardSummary';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';

export default function GarzonDashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    data: dashboardData,
    isLoading: loadingSummary,
    error: summaryError,
    refetch: refreshDashboard
  } = useDashboardSummary();

  const { refetch: refetchUser } = useCurrentUser();

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
    <BoneyardSkeleton
      name='garzon-dashboard-main'
      loading={userLoading || (loadingSummary && !dashboardData)}
    >
      <div className='p-6 space-y-6'>
        {}
        <div className='space-y-4'>
          <div className='text-left'>
            <h1 className='text-2xl font-bold text-gray-900'>
              {user?.name} {user?.lastName} - Garzon
            </h1>
            <p className='text-gray-600'>Panel de control para garzones</p>
          </div>

          {}
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

        {}
        <MarcarAsistenciaCard />

        {}
        <div className='grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3'>
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
                  <CardTitle className='text-xl font-bold text-gray-900 mb-2'>
                    {item.title}
                  </CardTitle>
                  <CardDescription className='text-sm text-gray-600'>
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </BoneyardSkeleton>
  );
}
