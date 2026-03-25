 
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
    staleTime: 60000, // Datos frescos por 1 min
    refetchOnWindowFocus: true,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  if (loading) {
    return (
      <div className='grid gap-6 md:grid-cols-3'>
        {[1, 2, 3].map(i => (
          <Card
            key={i}
            className='animate-pulse transform transition-all duration-300 hover:scale-105 hover:shadow-xl'
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
      <div className='grid gap-6 md:grid-cols-3'>
        {[1, 2, 3].map(i => (
          <Card
            key={i}
            className='border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 transform transition-all duration-300 hover:scale-105 hover:shadow-xl'
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-red-600 dark:text-red-400'>Error</CardTitle>
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

  if (!stats) {
    return null;
  }

  const cards = [
    {
      title: 'Anfitrionas',
      logueadas: stats.anfitrionas.logueadas,
      total: stats.anfitrionas.total,
      porcentaje: stats.anfitrionas.porcentaje,
      usuarios: stats.anfitrionas.usuarios,
      icon: Users,
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700',
      cardColor: 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-700',
      headerColor: 'bg-red-50 dark:bg-red-900/30',
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
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700',
      cardColor: 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700',
      headerColor: 'bg-blue-50 dark:bg-blue-900/30',
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
      badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700',
      cardColor: 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-700',
      headerColor: 'bg-green-50 dark:bg-green-900/30',
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
            className={`
              ${card.cardColor}
              border-2 shadow-xl hover:shadow-2xl
              transform transition-all duration-500 
              hover:-translate-y-2 hover:rotate-1
              group cursor-pointer
              relative overflow-hidden
              before:absolute before:inset-0 before:bg-gradient-to-r 
              before:from-transparent before:via-white/20 before:to-transparent
              before:translate-x-[-100%] hover:before:translate-x-[100%]
              before:transition-transform before:duration-1000
            `}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
          >
            {/* Efecto de profundidad 3D */}
            <div className='absolute inset-0 bg-gradient-to-br from-black/5 to-transparent rounded-lg pointer-events-none'></div>
            
            <CardHeader className={`${card.headerColor} border-b border-gray-200 dark:border-gray-700 py-3 relative z-10`}>
              <div className='flex items-center justify-between'>
                <CardTitle className={`text-base font-semibold ${card.textColor} transform transition-transform duration-300 group-hover:translate-z-4`}>
                  {card.title}
                </CardTitle>
                <div className='transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110'>
                  <IconComponent className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
            </CardHeader>

            <CardContent className='p-4 relative z-10'>
              <div className='flex items-center justify-between mb-3'>
                <div className={`text-2xl font-bold ${card.textColor} transform transition-transform duration-300 group-hover:translate-z-2`}>
                  {card.logueadas}
                </div>
                <Badge className={`${card.badgeColor} font-semibold text-xs transform transition-all duration-300 group-hover:scale-110 group-hover:translate-z-2`}>
                  {card.porcentaje}%
                </Badge>
              </div>
              
              <p className='text-xs text-gray-600 dark:text-gray-400 mb-3 transform transition-transform duration-300 group-hover:translate-z-1'>
                {card.logueadas} de {card.total} logueados hoy
              </p>

              {/* Lista de usuarios logueados */}
              {card.usuarios.length > 0 && (
                <div className='space-y-1'>
                  <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    👥 Usuarios activos ({card.usuarios.length}):
                  </p>
                  <div className='space-y-1 max-h-24 overflow-y-auto'>
                    {card.usuarios.map((user: any, userIndex: number) => (
                      <div
                        key={`${index}-${user.id_usuario}-${userIndex}`}
                        className={`
                          text-xs bg-gray-50 dark:bg-gray-700 
                          border border-gray-200 dark:border-gray-600 
                          px-2 py-1 rounded-md
                          transform transition-all duration-300
                          hover:-translate-y-1 hover:shadow-lg
                          hover:bg-gray-100 dark:hover:bg-gray-600
                          group-hover:translate-z-${userIndex + 1}
                        `}
                        style={{
                          transform: `translateZ(${userIndex * 2}px)`,
                          transitionDelay: `${userIndex * 50}ms`
                        }}
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-1'>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${card.iconColor.replace('text-', 'bg-')}`}></div>
                            <span className='font-medium text-gray-900 dark:text-gray-100'>
                              {user.nick}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {card.usuarios.length === 0 && card.logueadas > 0 && (
                <div className='mt-3'>
                  <div className='text-xs text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-md'>
                    🔴 No hay usuarios activos actualmente
                  </div>
                </div>
              )}
            </CardContent>

            {/* Efecto de brillo en el borde */}
            <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none'></div>
          </Card>
        );
      })}
    </div>
  );
}

