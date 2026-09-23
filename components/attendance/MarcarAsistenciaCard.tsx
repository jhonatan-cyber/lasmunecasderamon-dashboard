'use client';

import { useState } from 'react';
import { ShieldCheck, LogIn } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Registra la asistencia con el código del local.
 *
 * Reemplaza al botón "Marcar Entrada" que llamaba a /api/attendance/marcar: ese endpoint
 * marcaba para la persona de la sesión sin ninguna credencial, así que se podía marcar
 * desde la casa con un clic. Ahora hace falta el código de 4 dígitos que se muestra en la
 * pantalla de la entrada y que rota en cada uso, o el QR que emite el kiosko.
 */
export function MarcarAsistenciaCard() {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ultimoMensaje, setUltimoMensaje] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (codigo.length !== 4) {
      toast.error('El código del local tiene 4 dígitos');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: codigo })
      });
      const data = await res.json();

      if (data.success) {
        setUltimoMensaje(data.message || 'Asistencia registrada');
        setCodigo('');
        toast.success(data.message || 'Asistencia registrada');
      } else {
        toast.error(data.message || 'No se pudo registrar la asistencia');
      }
    } catch {
      toast.error('Error de conexión al registrar la asistencia');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className='max-w-sm mx-auto space-y-4'>
      <div className='flex items-center gap-2 px-2'>
        <ShieldCheck className='h-4 w-4 text-indigo-500' />
        <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>
          Registrar asistencia
        </h2>
      </div>

      <div className='relative overflow-hidden rounded-[2.5rem] bg-indigo-600 p-8 text-white shadow-2xl shadow-indigo-200 dark:shadow-none'>
        <div className='absolute -right-10 -top-10 h-60 w-60 rounded-full bg-white/10 blur-3xl' />
        <form onSubmit={handleSubmit} className='relative space-y-6 flex flex-col items-center'>
          <div className='text-center space-y-2'>
            <h3 className='text-2xl font-black tracking-tight'>Código del local</h3>
            <p className='text-[10px] font-black text-indigo-100 uppercase tracking-widest opacity-70'>
              Se muestra en la pantalla de la entrada
            </p>
          </div>

          <input
            value={codigo}
            onChange={event => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode='numeric'
            autoComplete='off'
            aria-label='Código del local'
            placeholder='0000'
            className='w-44 text-center text-4xl font-black font-mono tracking-[0.3em] rounded-2xl bg-white/15 border border-white/30 py-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/60'
          />

          <button
            type='submit'
            disabled={enviando || codigo.length !== 4}
            className='w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/30 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <LogIn className='h-4 w-4' />
            {enviando ? 'Registrando...' : 'Registrar asistencia'}
          </button>

          {ultimoMensaje && <p className='text-xs text-center text-indigo-100'>{ultimoMensaje}</p>}
        </form>
      </div>
    </div>
  );
}
