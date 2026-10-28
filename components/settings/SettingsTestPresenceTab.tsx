'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, LogIn, LogOut, RefreshCw, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import logger from '@/lib/utils/logger';

interface PersonalPresencia {
  id_usuario: string;
  nombre: string;
  apellido: string;
  nick: string;
  foto: string | null;
  rol: string;
  en_local: boolean;
}

const etiquetaRol = (rol: string) =>
  rol ? rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase() : 'Personal';

const iniciales = (persona: PersonalPresencia) =>
  `${persona.nombre?.[0] ?? ''}${persona.apellido?.[0] ?? ''}`.toUpperCase() || '?';

/**
 * Tab de pruebas: loguea (o saca) al personal del local forzando el mismo flag
 * `logins.en_local` que habilita ventas, servicios y pedidos que exigen
 * anfitrionas, garzones y otros conectados. No registra asistencia.
 */
export function SettingsTestPresenceTab() {
  const [personal, setPersonal] = useState<PersonalPresencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/presence');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudo cargar el personal');
      }
      setPersonal(result.data || []);
    } catch (err) {
      logger.captureException(err, { context: 'SettingsTestPresenceTab:fetch' });
      setError(err instanceof Error ? err.message : 'Error al cargar el personal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarPresencia = useCallback(async (persona: PersonalPresencia, presente: boolean) => {
    setPending(prev => new Set(prev).add(persona.id_usuario));
    try {
      const response = await fetch('/api/settings/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: persona.id_usuario, presente })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudo cambiar la presencia');
      }
      setPersonal(prev =>
        prev.map(p => (p.id_usuario === persona.id_usuario ? { ...p, en_local: presente } : p))
      );
      toast.success(`${persona.nombre} ${presente ? 'quedó en el local' : 'salió del local'}`);
    } catch (err) {
      logger.captureException(err, { context: 'SettingsTestPresenceTab:toggle' });
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar la presencia');
    } finally {
      setPending(prev => {
        const siguiente = new Set(prev);
        siguiente.delete(persona.id_usuario);
        return siguiente;
      });
    }
  }, []);

  const cambiarTodos = useCallback(async (presente: boolean) => {
    setBulk(true);
    try {
      const response = await fetch('/api/settings/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos: true, presente })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudo actualizar el personal');
      }
      setPersonal(prev => prev.map(p => ({ ...p, en_local: presente })));
      toast.success(
        presente
          ? 'Todo el personal quedó logueado en el local'
          : 'Se sacó a todo el personal del local'
      );
    } catch (err) {
      logger.captureException(err, { context: 'SettingsTestPresenceTab:bulk' });
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el personal');
    } finally {
      setBulk(false);
    }
  }, []);

  const enLocal = useMemo(() => personal.filter(p => p.en_local).length, [personal]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold'>
          <UserCheck className='h-5 w-5 text-muted-foreground' />
          Loguear personal en el local
        </CardTitle>
        <CardDescription>
          Herramienta de pruebas: marca al personal como «en el local» para poder registrar ventas,
          servicios y pedidos que exigen anfitrionas, garzones y otros conectados. Es el mismo
          estado que deja un login real; no reemplaza la asistencia.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {loading ? (
          <div className='flex flex-col gap-2' role='status' aria-label='Cargando personal'>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className='h-14 w-full rounded-xl' />
            ))}
            <span className='sr-only'>Cargando personal...</span>
          </div>
        ) : error ? (
          <ErrorState size='sm' message={error} onRetry={cargar} />
        ) : (
          <>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4'>
              <p className='text-sm text-muted-foreground'>
                <span className='font-bold text-foreground'>{enLocal}</span> de {personal.length} en
                el local
              </p>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={cargar}
                  disabled={bulk}
                  className='rounded-full gap-2'
                >
                  <RefreshCw className='h-4 w-4' />
                  Actualizar
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => cambiarTodos(false)}
                  disabled={bulk || enLocal === 0}
                  className='rounded-full gap-2'
                >
                  {bulk ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <LogOut className='h-4 w-4' />
                  )}
                  Sacar a todos
                </Button>
                <Button
                  size='sm'
                  onClick={() => cambiarTodos(true)}
                  disabled={bulk || enLocal === personal.length}
                  className='rounded-full gap-2'
                >
                  {bulk ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <LogIn className='h-4 w-4' />
                  )}
                  Loguear a todos
                </Button>
              </div>
            </div>

            {personal.length === 0 ? (
              <p className='py-6 text-center text-sm text-muted-foreground'>
                No hay personal activo para loguear.
              </p>
            ) : (
              <ul className='divide-y divide-border'>
                {personal.map(persona => {
                  const ocupado = pending.has(persona.id_usuario);
                  return (
                    <li
                      key={persona.id_usuario}
                      className='flex items-center justify-between gap-4 py-3'
                    >
                      <div className='flex min-w-0 items-center gap-3'>
                        <Avatar className='h-9 w-9'>
                          <AvatarImage
                            src={
                              persona.foto && persona.foto !== ''
                                ? `/img/users/${persona.foto}`
                                : '/img/users/default.png'
                            }
                            alt={persona.nombre}
                          />
                          <AvatarFallback className='text-xs font-bold'>
                            {iniciales(persona)}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-bold'>
                            {persona.nombre} {persona.apellido}
                          </p>
                          <p className='truncate text-xs text-muted-foreground'>
                            {etiquetaRol(persona.rol)}
                            {persona.nick ? ` · ${persona.nick}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className='flex shrink-0 items-center gap-3'>
                        <Badge variant={persona.en_local ? 'success' : 'secondary'}>
                          {persona.en_local ? 'En el local' : 'Fuera'}
                        </Badge>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => cambiarPresencia(persona, !persona.en_local)}
                          disabled={ocupado}
                          className='rounded-full gap-2'
                        >
                          {ocupado ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : persona.en_local ? (
                            <LogOut className='h-4 w-4' />
                          ) : (
                            <LogIn className='h-4 w-4' />
                          )}
                          {persona.en_local ? 'Sacar' : 'Loguear'}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
