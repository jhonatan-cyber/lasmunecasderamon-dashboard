'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTimeLabel } from '@/lib/utils/calendarUtils';

interface Notification {
  id: string;
  titulo: string;
  mensaje: string;
  leida: number | boolean;
  fecha_crea: string;
}

function notificationDate(value: string) {
  const { date, time } = formatDateTimeLabel(value);
  return `${date}, ${time}`;
}

export default function Notifications() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const client = useQueryClient();
  const history = useQuery<Notification[]>({
    queryKey: ['notifications', 'history'],
    queryFn: async () => {
      const response = await fetch('/api/notifications?type=history');
      if (!response.ok) throw Error('No se pudieron cargar las notificaciones');
      const result = await response.json();
      return result.data;
    }
  });
  const markRead = useMutation({
    mutationFn: async (id?: string) => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {})
      });
      if (!response.ok) throw Error('No se pudo marcar la notificación como leída');
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
    onError: error => toast.error(error.message)
  });
  const notifications = history.data ?? [];
  const unread = notifications.filter(notification => !notification.leida);
  const visible = unreadOnly ? unread : notifications;

  return (
    <div className='space-y-6 p-4 sm:p-6'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Notificaciones</h1>
          <p className='text-muted-foreground'>Historial reciente de avisos del sistema</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => history.refetch()} disabled={history.isFetching}>
            <RefreshCw className='mr-2 h-4 w-4' />
            Actualizar
          </Button>
          <Button
            variant='outline'
            onClick={() => markRead.mutate(undefined)}
            disabled={!unread.length || markRead.isPending}
          >
            <Check className='mr-2 h-4 w-4' />
            Marcar todas como leídas
          </Button>
        </div>
      </div>
      <div className='flex flex-wrap gap-2' aria-label='Filtrar notificaciones'>
        <Button variant={unreadOnly ? 'outline' : 'default'} onClick={() => setUnreadOnly(false)}>
          Todas ({notifications.length})
        </Button>
        <Button variant={unreadOnly ? 'default' : 'outline'} onClick={() => setUnreadOnly(true)}>
          Sin leer ({unread.length})
        </Button>
      </div>
      {history.isPending ? (
        <p role='status'>Cargando notificaciones...</p>
      ) : history.isError ? (
        <p role='alert'>{history.error.message}. Pulsa Actualizar para reintentar.</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-12'>
            <Bell className='h-10 w-10 text-muted-foreground' />
            <p>{unreadOnly ? 'No tienes notificaciones sin leer' : 'No hay notificaciones'}</p>
          </CardContent>
        </Card>
      ) : (
        visible.map(notification => (
          <Card
            key={notification.id}
            className={notification.leida ? '' : 'border-l-4 border-l-blue-500'}
          >
            <CardContent className='flex items-start gap-3 p-4'>
              <div className='min-w-0 flex-1 break-words'>
                <h2 className='font-semibold'>{notification.titulo}</h2>
                <p className='mt-1 text-sm text-muted-foreground'>{notification.mensaje}</p>
                <time className='mt-2 block text-xs text-muted-foreground'>
                  {notificationDate(notification.fecha_crea)}
                </time>
              </div>
              {!notification.leida && (
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Marcar como leída: ${notification.titulo}`}
                  disabled={markRead.isPending}
                  onClick={() => markRead.mutate(notification.id)}
                >
                  <Check className='h-4 w-4' />
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
