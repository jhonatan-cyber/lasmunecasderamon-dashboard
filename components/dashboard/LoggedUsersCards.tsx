'use client';

import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '@/components/shared/MetricCard';
import { Users, UserCheck, UserX, Martini } from 'lucide-react';
import type { LoggedUsersStatsResponse } from '@/hooks/statistics/useLoggedUsersStats';

export default function LoggedUsersCards() {
  const {
    data: stats,
    isLoading: loading,
    error: queryError
  } = useQuery<LoggedUsersStatsResponse>({
    queryKey: ['logged-users-stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats/logged-users');
      if (!response.ok) throw new Error('Error al obtener estadísticas');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Error en la respuesta');
      return data.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: true
  });

  const error = queryError instanceof Error ? queryError.message : null;

  if (loading) {
    return (
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {[1, 2, 3, 4].map(i => (
          <MetricCard key={i} icon={<Users />} label='Cargando' value='' isLoading />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {[1, 2, 3, 4].map(i => (
          <MetricCard
            key={i}
            icon={<UserX />}
            label='Error al cargar estadísticas'
            value='--'
            footer={<p className='pt-1 text-xs font-medium opacity-70'>{error}</p>}
            tone='rose'
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Anfitrionas',
      logueadas: stats.anfitrionas.logueadas,
      total: stats.anfitrionas.total,
      porcentaje: stats.anfitrionas.porcentaje,
      usuarios: stats.anfitrionas.usuarios,
      icon: Users,
      tone: 'rose' as const
    },
    {
      title: 'Garzones',
      logueadas: stats.garzones.logueadas,
      total: stats.garzones.total,
      porcentaje: stats.garzones.porcentaje,
      usuarios: stats.garzones.usuarios,
      icon: UserCheck,
      tone: 'blue' as const
    },
    {
      title: 'Cajeros',
      logueadas: stats.cajeros.logueadas,
      total: stats.cajeros.total,
      porcentaje: stats.cajeros.porcentaje,
      usuarios: stats.cajeros.usuarios,
      icon: UserCheck,
      tone: 'emerald' as const
    },
    {
      title: 'Barman',
      ...stats.barman,
      icon: Martini,
      tone: 'amber' as const
    }
  ];

  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <MetricCard
            key={index}
            icon={<IconComponent />}
            badge={`${card.porcentaje}%`}
            label={card.title}
            value={card.logueadas}
            tone={card.tone}
            footer={
              <div className='space-y-2 pt-1'>
                <p className='text-xs font-medium opacity-70'>
                  {card.logueadas} de {card.total} activos en local
                </p>
                {!!card.usuarios?.length && (
                  <div className='space-y-1'>
                    <p className='text-[10px] font-black uppercase tracking-wider opacity-60'>
                      Usuarios ({card.usuarios.length})
                    </p>
                    <div className='flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1'>
                      {card.usuarios.map((user: any, userIndex: number) => (
                        <span
                          key={`${index}-${user.id_usuario}-${userIndex}`}
                          className='inline-flex max-w-full items-center rounded-lg border border-current/15 bg-current/5 px-2 py-1 text-xs font-medium'
                          title={user.nick}
                        >
                          <span className='truncate'>{user.nick}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            }
          />
        );
      })}
    </div>
  );
}
