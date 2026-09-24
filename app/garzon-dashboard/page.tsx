'use client';

import { RoleDashboard } from '@/components/shared/RoleDashboard';
import { Calendar, DollarSign, Clock, ArrowLeftRight, ShoppingCart } from 'lucide-react';

export default function GarzonDashboard() {
  return (
    <RoleDashboard
      role='garzon'
      roleLabel='Garzon'
      subtitle='Panel de control para garzones'
      skeletonName='garzon-dashboard-main'
      items={[
        {
          title: 'Asistencia',
          description: 'Se visualiza la asistencia del usuario',
          icon: Calendar,
          href: '/garzon-asistencias',
          color: 'text-blue-600',
          countKey: 'totalAsistencias'
        },
        {
          title: 'Anticipos',
          description: 'Se visualiza la lista de anticipos obtenidos del usuario',
          icon: ArrowLeftRight,
          href: '/garzon-anticipos',
          color: 'text-orange-600',
          countKey: 'totalAnticipos'
        },
        {
          title: 'Propinas',
          description: 'Se visualiza la lista de propinas obtenidos del usuario',
          icon: DollarSign,
          href: '/garzon-propinas',
          color: 'text-green-600',
          countKey: 'totalPropinas'
        },
        {
          title: 'Horas extras',
          description: 'Se visualiza la lista de horas extras obtenidos del usuario',
          icon: Clock,
          href: '/garzon-horas-extras',
          color: 'text-purple-600',
          countKey: 'totalHorasExtras'
        },
        {
          title: 'Calendario',
          description: 'Vista de calendario con todas las actividades',
          icon: Calendar,
          href: '/garzon-calendar',
          color: 'text-indigo-600',
          staticCount: 0
        },
        {
          title: 'Pedidos',
          description: 'Se realizan los pedidos',
          icon: ShoppingCart,
          href: '/orders',
          color: 'text-red-600',
          countKey: 'totalPedidos'
        }
      ]}
    />
  );
}
