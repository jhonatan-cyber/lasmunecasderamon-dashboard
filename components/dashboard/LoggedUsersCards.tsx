'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserX } from 'lucide-react';

interface UserStats {
  anfitrionas: {
    logueadas: number;
    usuarios: Array<{ id_usuario: number; nick: string }>;
    total: number;
    porcentaje: number;
  };
  garzones: {
    logueadas: number;
    usuarios: Array<{ id_usuario: number; nick: string }>;
    total: number;
    porcentaje: number;
  };
  cajeros: {
    logueadas: number;
    usuarios: Array<{ id_usuario: number; nick: string }>;
    total: number;
    porcentaje: number;
  };
}

export default function LoggedUsersCards() {
  const {
    data: stats,
    isLoading: loading,
    error: queryError
  } = useQuery<UserStats>({
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
      <div className='grid gap-4 md:grid-cols-3'>
        {[1, 2, 3].map(i => (
          <Card
            key={i}
            className='animate-pulse rounded-3xl border border-slate-200/60 dark:border-slate-800/60'
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                <div className='h-4 bg-gray-200 rounded w-24'></div>
              </CardTitle>
              <div className='h-4 w-4 bg-gray-200 rounded'></div>
            </CardHeader>
            <CardContent>
              <div className='h-8 bg-gray-200 rounded w-16 mb-2'></div>
              <div className='h-3 bg-gray-200 rounded w-32'></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='grid gap-4 md:grid-cols-3'>
        {[1, 2, 3].map(i => (
          <Card
            key={i}
            className='rounded-3xl border border-rose-300/70 bg-rose-50/80 dark:bg-rose-900/20 dark:border-rose-800'
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-red-600 dark:text-red-400'>
                Error
              </CardTitle>
              <UserX className='h-4 w-4 text-red-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-red-600 dark:text-red-400'>--</div>
              <p className='text-xs text-red-500 dark:text-red-400'>{error}</p>
            </CardContent>
          </Card>
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
      badgeColor:
        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700',
      cardColor: 'bg-white dark:bg-slate-950/40 border-red-200/70 dark:border-red-800/60',
      headerColor: 'bg-red-50/80 dark:bg-red-900/20',
      textColor: 'text-red-600 dark:text-red-400',
      iconColor: 'text-red-500 dark:text-red-400'
    },
    {
      title: 'Garzones',
      logueadas: stats.garzones.logueadas,
      total: stats.garzones.total,
      porcentaje: stats.garzones.porcentaje,
      usuarios: stats.garzones.usuarios,
      icon: UserCheck,
      badgeColor:
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700',
      cardColor: 'bg-white dark:bg-slate-950/40 border-blue-200/70 dark:border-blue-800/60',
      headerColor: 'bg-blue-50/80 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      iconColor: 'text-blue-500 dark:text-blue-400'
    },
    {
      title: 'Cajeros',
      logueadas: stats.cajeros.logueadas,
      total: stats.cajeros.total,
      porcentaje: stats.cajeros.porcentaje,
      usuarios: stats.cajeros.usuarios,
      icon: UserCheck,
      badgeColor:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700',
      cardColor: 'bg-white dark:bg-slate-950/40 border-green-200/70 dark:border-green-800/60',
      headerColor: 'bg-green-50/80 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      iconColor: 'text-green-500 dark:text-green-400'
    }
  ];

  return (
    <div className='grid gap-4 md:grid-cols-3'>
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card
            key={index}
            className={`${card.cardColor} rounded-3xl border shadow-lg shadow-slate-200/20 dark:shadow-none overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl`}
          >
            <CardHeader
              className={`${card.headerColor} border-b border-slate-200/60 dark:border-slate-800/60 py-3`}
            >
              <div className='flex items-center justify-between'>
                <CardTitle
                  className={`text-sm font-black uppercase tracking-wide ${card.textColor}`}
                >
                  {card.title}
                </CardTitle>
                <IconComponent className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>

            <CardContent className='p-4'>
              <div className='flex items-center justify-between mb-3'>
                <div className={`text-2xl font-black ${card.textColor}`}>{card.logueadas}</div>
                <Badge className={`${card.badgeColor} font-bold text-[10px]`}>
                  {card.porcentaje}%
                </Badge>
              </div>

              <p className='text-xs text-slate-600 dark:text-slate-400 mb-3'>
                {card.logueadas} de {card.total} activos en local
              </p>

              {card.usuarios?.length > 0 && (
                <div className='space-y-1'>
                  <p className='text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400'>
                    Usuarios ({card.usuarios?.length})
                  </p>
                  <div className='space-y-1 max-h-24 overflow-y-auto pr-1'>
                    {card.usuarios?.map((user: any, userIndex: number) => (
                      <div
                        key={`${index}-${user.id_usuario}-${userIndex}`}
                        className='text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60 px-2 py-1 rounded-lg'
                      >
                        <div className='flex items-center gap-1'>
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${card.iconColor.replace('text-', 'bg-')}`}
                          ></div>
                          <span className='font-medium text-slate-900 dark:text-slate-100'>
                            {user.nick}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
