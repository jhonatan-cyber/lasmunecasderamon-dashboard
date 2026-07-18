'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ArrowLeft, QrCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LazyQRCode } from '@/components/shared/LazyQRCode';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSharedSSE } from '@/hooks/shared';
import { toast } from 'sonner';
import ThemeSwitcher from '@/components/shared/ThemeSwitcher';

interface PublicUser {
  id: string | number;
  name: string;
  nick: string;
  foto: string;
  qr_token: string | null;
  role: string;
}

export default function AsistenciaQrPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [config, setConfig] = useState<{
    asistencia_hora_inicio: number;
    asistencia_hora_fin: number;
    timezone: string;
    systemCode?: string | null;
  }>({
    asistencia_hora_inicio: 21,
    asistencia_hora_fin: 23,
    timezone: 'America/Santiago',
    systemCode: null
  });

  const fetchUsers = useCallback((showLoading = false) => {
    if (showLoading) setLoading(true);
    fetch('/api/public/users')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setUsers(data.data);
        }
        if (data.success && data.config) {
          setConfig(data.config);
        }
      })
      .catch(err => console.error('Error fetching users:', err))
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchUsers(true);
    return () => clearTimeout(exitTimer.current);
  }, [fetchUsers]);

  const router = useRouter();

  const handleExit = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setExiting(true);
    exitTimer.current = setTimeout(() => {
      router.push('/login');
    }, 300);
  }, [router]);

  useSharedSSE('/api/notifications/sse', (payload: any) => {
    if (payload.type === 'attendance_registered') {
      const { qrToken, user } = payload.data || {};
      const matchesQR = selectedUser && selectedUser.qr_token === qrToken;
      const matchesUser = selectedUser && user && String(selectedUser.id) === String(user.id);

      if (matchesQR || matchesUser) {
        setSelectedUser(null);
        toast.success(`Asistencia registrada: ${user?.nombre || selectedUser.name}`, {
          description: '¡Que tengas una excelente jornada!',
          duration: 4000
        });
      }
      fetchUsers();
    } else if (payload.type === 'code_changed') {
      const { codigo } = payload.data || {};
      if (codigo) {
        setConfig(prev => ({ ...prev, systemCode: codigo }));
      }
    } else if (payload.type === 'qr_token_updated' || payload.type === 'profile_updated') {
      fetchUsers();
    }
  });

  const getHourInTimezone = (timezoneStr: string = 'America/Santiago') => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezoneStr,
        hour: 'numeric',
        hour12: false
      });
      return parseInt(formatter.format(new Date()), 10);
    } catch {
      return new Date().getHours();
    }
  };

  const handleUserClick = (user: PublicUser) => {
    const currentHour = getHourInTimezone(config.timezone);
    const start = config.asistencia_hora_inicio;
    const end = config.asistencia_hora_fin;

    if (currentHour < start || currentHour >= end) {
      toast.error('La hora de registro de asistencia ya pasó', {
        description: 'No podés registrar asistencia pero sí podés trabajar.',
        duration: 6000
      });
      return;
    }

    setSelectedUser(user);
  };

  const filteredUsers = users.filter(
    user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nick.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isWithinTimeWindow = () => {
    const currentHour = getHourInTimezone(config.timezone);
    return currentHour >= config.asistencia_hora_inicio && currentHour < config.asistencia_hora_fin;
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans selection:bg-neutral-900 dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-300 ${exiting ? 'animate-out fade-out slide-out-to-bottom-2 duration-300' : 'animate-in fade-in slide-in-from-bottom-2 duration-500'}`}>
      {/* Background decoration */}
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-neutral-200/40 dark:from-neutral-900/40 via-white dark:via-neutral-950 to-white dark:to-neutral-950 pointer-events-none' />

      <div className='relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12 border-b border-neutral-200 dark:border-neutral-850 pb-8'>
          <div>
            <h1 className='text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white'>
              Acceso de Asistencia
            </h1>
            <p className='text-neutral-600 dark:text-neutral-400 text-sm mt-2 max-w-xl'>
              Seleccioná tu perfil para generar y visualizar tu código QR de asistencia. Luego,
              escanealo desde la app móvil para registrar tu jornada.
            </p>
          </div>

          <div className='flex flex-row items-center gap-4 self-start md:self-auto'>
            {config.systemCode && isWithinTimeWindow() && (
              <div className='flex items-center gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 px-4 py-2 rounded-2xl shadow-inner select-none animate-in fade-in zoom-in duration-300'>
                <div className='flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 p-2 rounded-xl text-neutral-900 dark:text-white'>
                  <QrCode className='h-5 w-5' />
                </div>
                <div className='text-left'>
                  <span className='block text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none mb-1'>
                    Código de Entrada
                  </span>
                  <span className='text-2xl font-black font-mono tracking-widest text-neutral-900 dark:text-white leading-none'>
                    {config.systemCode}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleExit}
              className='bg-black text-white rounded-full px-6 py-2 border-2 border-black dark:border-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all duration-200 gap-2 w-fit h-[48px] inline-flex items-center justify-center'
            >
              <ArrowLeft className='h-4 w-4' />
              Volver al Login
            </Button>

            <ThemeSwitcher />
          </div>
        </div>

        {/* Search */}
        <div className='relative max-w-md mb-8'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500' />
          <Input
            type='text'
            placeholder='Buscar por tu nombre o nick...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='pl-12 pr-4 py-6 bg-white dark:bg-neutral-900/60 border-neutral-300 dark:border-neutral-800 focus:border-black dark:focus:border-white focus:ring-black dark:focus:ring-white rounded-full text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 w-full transition-all'
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className='bg-neutral-100 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800/60 rounded-2xl p-6 flex flex-col items-center animate-pulse'
              >
                <div className='w-20 h-20 bg-neutral-200 dark:bg-neutral-800 rounded-full mb-4' />
                <div className='h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 mb-2' />
                <div className='h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2' />
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className='text-center py-16 bg-white dark:bg-neutral-900/20 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl'>
            <QrCode className='h-12 w-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-4' />
            <h3 className='text-lg font-bold text-neutral-800 dark:text-neutral-300'>
              No se encontraron trabajadores
            </h3>
            <p className='text-neutral-500 text-sm mt-1'>Ajustá los términos de tu búsqueda.</p>
          </div>
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
            {filteredUsers.map(user => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user)}
                className='group bg-white dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 hover:border-black/30 dark:hover:border-white/50 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5'
              >
                <div className='relative w-20 h-20 rounded-full mb-4 overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 group-hover:border-black dark:group-hover:border-white transition-colors'>
                  <Image
                    src={user.foto ? `/img/users/${user.foto}` : '/img/users/default.png'}
                    alt={user.name}
                    fill
                    sizes='80px'
                    className='object-cover'
                    unoptimized
                  />
                </div>
                <h3 className='font-bold text-neutral-800 dark:text-neutral-100 text-sm group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-1'>
                  {user.name}
                </h3>
                <span className='text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-1 uppercase tracking-wider line-clamp-1'>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)}>
        <DialogContent className='w-[96vw] max-w-lg sm:max-w-xl max-h-[96vh] overflow-y-auto bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-2xl p-6 sm:p-8 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-800 scrollbar-track-transparent'>
          {selectedUser && (
            <>
              <DialogHeader className='items-center text-center'>
                <DialogTitle className='text-lg font-black uppercase tracking-tight text-neutral-900 dark:text-white'>
                  {selectedUser.name}
                </DialogTitle>
                <DialogDescription className='text-neutral-500 dark:text-neutral-400 text-[10px] font-semibold uppercase tracking-wider'>
                  {selectedUser.role}
                </DialogDescription>
              </DialogHeader>

              <div className='flex flex-col items-center justify-center my-6 select-none w-full max-w-sm sm:max-w-md mx-auto gap-6'>
                {selectedUser.qr_token ? (
                  <>
                    <div className='bg-white p-4 rounded-3xl shadow-lg shadow-black/30 border border-neutral-100 dark:border-transparent'>
                      <div className='w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] relative'>
                        <LazyQRCode
                          value={selectedUser.qr_token}
                          size={400}
                          style={{ width: '100%', height: '100%' }}
                          level='H'
                          includeMargin={false}
                          imageSettings={{
                            src: selectedUser.foto
                              ? `/img/users/${selectedUser.foto}`
                              : '/img/users/default.png',
                            height: 80,
                            width: 80,
                            excavate: true
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='flex flex-col items-center justify-center py-8 text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 w-full'>
                    <QrCode className='h-12 w-12 text-neutral-400 dark:text-neutral-600 animate-pulse mb-3' />
                    <p className='text-neutral-700 dark:text-neutral-300 font-black uppercase text-sm'>
                      Sin Token Configurado
                    </p>
                    <p className='text-neutral-500 text-xs text-center mt-1'>
                      Pedile a un Administrador que genere tu código.
                    </p>
                  </div>
                )}
              </div>

              {selectedUser.qr_token && (
                <p className='text-center text-xs text-neutral-500 dark:text-neutral-400 mt-2 px-2 leading-relaxed'>
                  Presentá este código QR frente a la cámara de la tablet o celular de asistencia
                  para registrar tu ingreso desde la APP.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
