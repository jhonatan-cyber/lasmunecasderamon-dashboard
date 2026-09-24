'use client';

import { RoleDashboard } from '@/components/shared/RoleDashboard';
import { Calendar, DollarSign, Users, ArrowLeftRight } from 'lucide-react';

export default function AnfitrionaDashboard() {
  return (
    <RoleDashboard
      role='anfitriona'
      roleLabel='Anfitriona'
      subtitle='Panel de control para anfitrionas'
      skeletonName='anfitriona-dashboard-main'
      wideLastItem
      items={[
        {
          title: 'Asistencia',
          description: 'Se visualiza la asistencia del usuario',
          icon: Calendar,
          href: '/anfitriona-asistencias',
          color: 'text-blue-600',
          countKey: 'totalAsistencias'
        },
        {
          title: 'Comisiones',
          description: 'Se visualiza la comisiones del usuario',
          icon: DollarSign,
          href: '/anfitriona-comisiones',
          color: 'text-green-600',
          countKey: 'totalComisiones'
        },
        {
          title: 'Servicios',
          description: 'Se visualiza la lista de servicios realizados por el usuario',
          icon: Users,
          href: '/anfitriona-servicios',
          color: 'text-purple-600',
          countKey: 'totalServicios'
        },
        {
          title: 'Anticipos',
          description: 'Se visualiza la lista de anticipos obtenidos del usuario',
          icon: ArrowLeftRight,
          href: '/anfitriona-anticipos',
          color: 'text-orange-600',
          countKey: 'totalAnticipos'
        },
        {
          title: 'Calendario',
          description: 'Calendario con asistencias, comisiones, servicios y anticipos',
          icon: Calendar,
          href: '/anfitriona-calendar',
          color: 'text-indigo-600',
          staticCount: 0
        }
      ]}
    />
  );
}
