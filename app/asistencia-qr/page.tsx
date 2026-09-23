'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, ArrowLeft, QrCode, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';
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

interface KioskUser {
  id: string;
  nombre: string;
  apellido: string;
  nick: string;
  foto: string;
  rol: string;
  marcada: string | null;
}

interface KioskConfig {
  asistencia_hora_inicio: number;
  asistencia_hora_fin: number;
  timezone: string;
}

interface Challenge {
  token: string;
  expiraEn: string;
  ttlSegundos: number;
}

type Estado = 'cargando' | 'sin-configurar' | 'provisionar' | 'activo';

/**
 * Pantalla de asistencia de la entrada.
 *
 * Ya no es pública: se provisiona una vez con el secreto del local (`KIOSK_DEVICE_SECRET`)
 * y desde entonces es un dispositivo del local. Su razón de ser es emitir el desafío de
 * asistencia de la persona que se acerca — un token de un solo uso y 120 segundos, que el
 * servidor guarda hasheado — y mostrar el código del local vigente.
 *
 * Antes esta pantalla leía un endpoint público que devolvía el `qr_token` de todo el
 * personal: esa credencial estática, pública y reutilizable era la que permitía marcar
 * asistencia ajena desde cualquier lado.
 */
export default function AsistenciaQrPage() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [secreto, setSecreto] = useState('');
  const [provisionando, setProvisionando] = useState(false);

  const [users, setUsers] = useState<KioskUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [codigo, setCodigo] = useState<string | null>(null);
  const [config, setConfig] = useState<KioskConfig>({
    asistencia_hora_inicio: 21,
    asistencia_hora_fin: 23,
    timezone: 'America/Santiago'
  });

  const [selectedUser, setSelectedUser] = useState<KioskUser | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [generando, setGenerando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  const cargarTablero = useCallback(async (silencioso = false) => {
    try {
      const res = await fetch('/api/kiosk/board', { credentials: 'include' });
      if (res.status === 401) {
        setEstado('provisionar');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.usuarios);
        setCodigo(data.data.codigo);
        setConfig(data.data.config);
        setEstado('activo');
      }
    } catch {
      if (!silencioso) toast.error('No se pudo cargar el tablero');
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    const iniciar = async () => {
      try {
        const res = await fetch('/api/kiosk/session', { credentials: 'include' });
        const data = await res.json();
        if (cancelado) return;

        if (!data.configurado) {
          setEstado('sin-configurar');
          return;
        }
        if (!data.vinculado) {
          setEstado('provisionar');
          return;
        }
        await cargarTablero();
      } catch {
        if (!cancelado) setEstado('sin-configurar');
      }
    };

    iniciar();
    return () => {
      cancelado = true;
      clearTimeout(exitTimer.current);
    };
  }, [cargarTablero]);

  // Red de seguridad: el canal SSE avisa al instante, pero un refresco lento evita que la
  // pantalla quede desactualizada si la conexión se cayó sin que nadie lo note.
  useEffect(() => {
    if (estado !== 'activo') return;
    const intervalo = setInterval(() => cargarTablero(true), 60_000);
    return () => clearInterval(intervalo);
  }, [estado, cargarTablero]);

  useEffect(() => {
    if (!challenge) return;
    setSegundosRestantes(challenge.ttlSegundos);
    const intervalo = setInterval(() => {
      setSegundosRestantes(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [challenge]);

  useSharedSSE(estado === 'activo' ? '/api/notifications/kiosk' : null, (payload: any) => {
    if (payload.type === 'attendance_registered') {
      const registrado = payload.data?.user;
      const esElSeleccionado =
        selectedUser && registrado && String(selectedUser.id) === String(registrado.id);

      if (esElSeleccionado) {
        setSelectedUser(null);
        setChallenge(null);
        toast.success(`Asistencia registrada: ${registrado?.nombre || selectedUser.nombre}`, {
          description: '¡Que tengas una excelente jornada!',
          duration: 4000
        });
      }
      cargarTablero(true);
    } else if (payload.type === 'code_changed') {
      if (payload.data?.codigo) setCodigo(payload.data.codigo);
    } else if (payload.type === 'profile_updated') {
      cargarTablero(true);
    }
  });

  const handleExit = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setExiting(true);
      exitTimer.current = setTimeout(() => router.push('/login'), 300);
    },
    [router]
  );

  const handleProvisionar = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionando(true);
    try {
      const res = await fetch('/api/kiosk/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secreto.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSecreto('');
        toast.success('Pantalla vinculada al local');
        await cargarTablero();
      } else {
        toast.error(data.message || 'No se pudo vincular la pantalla');
      }
    } catch {
      toast.error('Error de conexión al vincular la pantalla');
    } finally {
      setProvisionando(false);
    }
  };

  const handleUserClick = async (user: KioskUser) => {
    if (!isWithinTimeWindow()) {
      toast.error('La hora de registro de asistencia ya pasó', {
        description: 'No podés registrar asistencia pero sí podés trabajar.',
        duration: 6000
      });
      return;
    }

    setSelectedUser(user);
    setChallenge(null);
    setGenerando(true);
    try {
      const res = await fetch('/api/kiosk/attendance/challenge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setChallenge(data.data);
      } else {
        toast.error(data.message || 'No se pudo generar el código');
        setSelectedUser(null);
      }
    } catch {
      toast.error('Error de conexión al generar el código');
      setSelectedUser(null);
    } finally {
      setGenerando(false);
    }
  };

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

  const isWithinTimeWindow = () => {
    const hora = getHourInTimezone(config.timezone);
    return hora >= config.asistencia_hora_inicio && hora < config.asistencia_hora_fin;
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        user =>
          user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.nick?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.rol.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  if (estado === 'cargando') {
    return (
      <div className='min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center'>
        <RefreshCw className='h-8 w-8 animate-spin text-slate-400' />
      </div>
    );
  }

  if (estado === 'sin-configurar' || estado === 'provisionar') {
    return (
      <div className='min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center px-4'>
        <div className='w-full max-w-md space-y-6'>
          <div className='flex items-center gap-3'>
            <ShieldCheck className='h-6 w-6 text-indigo-500' />
            <h1 className='text-2xl font-extrabold uppercase tracking-tight'>
              Pantalla de asistencia
            </h1>
          </div>

          {estado === 'sin-configurar' ? (
            <div className='rounded-3xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6 space-y-2'>
              <p className='font-bold text-sm'>El kiosko no está configurado en el servidor</p>
              <p className='text-sm text-neutral-600 dark:text-neutral-400'>
                Falta <code className='font-mono text-xs'>KIOSK_DEVICE_SECRET</code>. Definilo en el
                servidor (mínimo 16 caracteres) y volvé a cargar esta pantalla.
              </p>
            </div>
          ) : (
            <form onSubmit={handleProvisionar} className='space-y-4'>
              <p className='text-sm text-neutral-600 dark:text-neutral-400'>
                Esta pantalla es un dispositivo del local: se vincula una sola vez con el secreto
                del kiosko. Desde entonces puede emitir los códigos de asistencia. No es una sesión
                de personal y no da acceso a ninguna otra parte del sistema.
              </p>
              <div className='space-y-2'>
                <label
                  htmlFor='kiosk-secret'
                  className='text-xs font-bold uppercase tracking-widest text-slate-500'
                >
                  Secreto del dispositivo
                </label>
                <Input
                  id='kiosk-secret'
                  type='password'
                  value={secreto}
                  onChange={e => setSecreto(e.target.value)}
                  autoComplete='off'
                  className='h-12 font-mono'
                />
              </div>
              <Button
                type='submit'
                disabled={provisionando || secreto.trim().length < 16}
                className='w-full h-12 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-bold'
              >
                <KeyRound className='h-4 w-4 mr-2' />
                {provisionando ? 'Vinculando...' : 'Vincular esta pantalla'}
              </Button>
            </form>
          )}

          <Button
            onClick={handleExit}
            variant='ghost'
            className='w-full rounded-full border border-neutral-200 dark:border-neutral-800'
          >
            <ArrowLeft className='h-4 w-4 mr-2' /> Volver al Login
          </Button>
        </div>
      </div>
    );
  }

  const dentroDeVentana = isWithinTimeWindow();

  return (
    <div
      className={`min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans transition-colors duration-300 ${exiting ? 'animate-out fade-out slide-out-to-bottom-2 duration-300' : 'animate-in fade-in slide-in-from-bottom-2 duration-500'}`}
    >
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-neutral-200/40 dark:from-neutral-900/40 via-white dark:via-neutral-950 to-white dark:to-neutral-950 pointer-events-none' />

      <div className='relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12 border-b border-neutral-200 dark:border-neutral-850 pb-8'>
          <div>
            <h1 className='text-3xl md:text-4xl font-extrabold uppercase tracking-tight'>
              Acceso de Asistencia
            </h1>
            <p className='text-neutral-600 dark:text-neutral-400 text-sm mt-2 max-w-xl'>
              Elegí tu perfil para generar un código de un solo uso y escanealo desde la app móvil.
              El código vence en dos minutos.
            </p>
          </div>

          <div className='flex flex-row items-center gap-4 self-start md:self-auto'>
            {codigo && dentroDeVentana && (
              <div className='flex items-center gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 px-4 py-2 rounded-2xl shadow-inner select-none'>
                <div className='flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 p-2 rounded-xl'>
                  <QrCode className='h-5 w-5' />
                </div>
                <div className='text-left'>
                  <span className='block text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none mb-1'>
                    Código de Entrada
                  </span>
                  <span className='text-2xl font-black font-mono tracking-widest leading-none'>
                    {codigo}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleExit}
              className='bg-black text-white rounded-full px-6 py-2 border-2 border-black dark:border-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all gap-2 w-fit h-[48px] inline-flex items-center justify-center'
            >
              <ArrowLeft className='h-4 w-4' /> Volver al Login
            </Button>

            <ThemeSwitcher />
          </div>
        </div>

        <div className='relative max-w-md mb-8'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500' />
          <Input
            type='text'
            placeholder='Buscar por tu nombre o nick...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='pl-12 pr-4 py-6 bg-white dark:bg-neutral-900/60 border-neutral-300 dark:border-neutral-800 rounded-full w-full'
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className='text-center py-16 bg-white dark:bg-neutral-900/20 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl'>
            <QrCode className='h-12 w-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-4' />
            <h3 className='text-lg font-bold'>No se encontraron trabajadores</h3>
            <p className='text-neutral-500 text-sm mt-1'>Ajustá los términos de tu búsqueda.</p>
          </div>
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
            {filteredUsers.map(user => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user)}
                className='group bg-white dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg'
              >
                {user.foto && user.foto !== 'default.png' ? (
                  <Image
                    src={`/img/users/${user.foto}`}
                    alt={user.nombre}
                    width={80}
                    height={80}
                    className='w-20 h-20 rounded-full object-cover mb-4'
                  />
                ) : (
                  <div className='w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 mb-4 flex items-center justify-center'>
                    <ShieldCheck className='h-8 w-8 text-neutral-400' />
                  </div>
                )}
                <span className='font-bold text-sm leading-tight'>
                  {user.nombre} {user.apellido}
                </span>
                <span className='text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-1'>
                  {user.rol}
                </span>
                {user.marcada && (
                  <span className='mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400'>
                    Presente {user.marcada.substring(0, 5)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)}>
        <DialogContent className='w-[92vw] max-w-sm sm:max-w-md bg-slate-950 border-slate-800 text-white'>
          <DialogHeader>
            <DialogTitle className='text-lg font-black uppercase tracking-tight'>
              Código de asistencia
            </DialogTitle>
            <DialogDescription className='text-slate-400 text-xs sm:text-sm'>
              Escaneá este código con la app móvil para registrar la asistencia de{' '}
              {selectedUser?.nombre} {selectedUser?.apellido}.
            </DialogDescription>
          </DialogHeader>

          <div className='p-3 bg-white rounded-2xl flex items-center justify-center min-h-[240px]'>
            {generando ? (
              <RefreshCw className='h-8 w-8 animate-spin text-slate-400' />
            ) : challenge && segundosRestantes > 0 ? (
              <LazyQRCode value={challenge.token} size={220} level='H' includeMargin={true} />
            ) : (
              <div className='text-center space-y-3 py-8'>
                <p className='text-slate-900 font-black uppercase tracking-tight text-sm'>
                  Código vencido
                </p>
                <Button
                  onClick={() => selectedUser && handleUserClick(selectedUser)}
                  className='bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl uppercase tracking-widest text-xs'
                >
                  <RefreshCw className='h-4 w-4 mr-2' /> Generar otro
                </Button>
              </div>
            )}
          </div>

          {challenge && segundosRestantes > 0 && (
            <p className='text-center text-[11px] font-bold uppercase tracking-widest text-indigo-300'>
              Vence en {segundosRestantes}s · un solo uso
            </p>
          )}

          {codigo && (
            <div className='flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10'>
              <span className='text-slate-400 text-xs font-semibold'>Código:</span>
              <span className='text-indigo-400 text-2xl font-black tracking-[0.3em] font-mono'>
                {codigo}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
