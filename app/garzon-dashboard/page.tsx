'use client';

import { RoleDashboard } from '@/components/shared/RoleDashboard';
import { Calendar, DollarSign, Clock, ArrowLeftRight, ShoppingCart } from 'lucide-react';

export default function GarzonDashboard() {
  return (
    <RoleDashboard
      role='garzon'
      roleLabel='Garzón'
      subtitle='Panel de control para garzones'
      skeletonName='garzon-dashboard-main'
      items={[
        {
          title: 'Asistencia',
          description: 'Consulta tus asistencias y pagos',
          icon: Calendar,
          href: '/garzon-asistencias',
          color: 'text-blue-600',
          countKey: 'totalAsistencias'
        },
        {
          title: 'Anticipos',
          description: 'Consulta tus anticipos',
          icon: ArrowLeftRight,
          href: '/garzon-anticipos',
          color: 'text-orange-600',
          countKey: 'totalAnticipos'
        },
        {
          title: 'Propinas',
          description: 'Consulta tus propinas y pagos',
          icon: DollarSign,
          href: '/garzon-propinas',
          color: 'text-green-600',
          countKey: 'totalPropinas'
        },
        {
          title: 'Horas extras',
          description: 'Consulta tus horas extras y pagos',
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
