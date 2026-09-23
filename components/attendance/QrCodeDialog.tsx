'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LazyQRCode } from '@/components/shared/LazyQRCode';
import { toast } from 'sonner';

interface QrCodeDialogProps {
  selectedUser: {
    id: string | number;
    name?: string;
    nick?: string;
    role?: string;
    foto?: string | null;
  } | null;
  onClose: () => void;
}

/**
 * Código de asistencia de una persona, para mostrarlo en el mostrador.
 *
 * Antes mostraba `usuarios.qr_token`: una credencial estática que el sistema publicaba en
 * /api/public/users y que cualquiera podía usar desde cualquier lado. Ahora pide un desafío
 * al servidor (`POST /api/attendance/qr`): un token de un solo uso y 120 segundos, y quien
 * lo emite queda registrado, así que puede canjearlo por el empleado.
 */
export function QrCodeDialog({ selectedUser, onClose }: QrCodeDialogProps) {
  const [codigoAsistencia, setCodigoAsistencia] = useState<string>('');
  const [challenge, setChallenge] = useState<{ token: string; ttlSegundos: number } | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [generando, setGenerando] = useState(false);

  const generarDesafio = async (userId: string | number) => {
    setGenerando(true);
    setChallenge(null);
    try {
      const res = await fetch('/api/attendance/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: String(userId) })
      });
      const data = await res.json();
      if (data.success) {
        setChallenge({ token: data.data.token, ttlSegundos: data.data.ttlSegundos });
      } else {
        toast.error(data.message || 'No se pudo generar el código');
      }
    } catch {
      toast.error('Error de conexión al generar el código');
    } finally {
      setGenerando(false);
    }
  };

  useEffect(() => {
    if (!selectedUser) return;

    fetch('/api/codigo/actual')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCodigoAsistencia(data.codigo);
      })
      .catch(() => {});

    generarDesafio(selectedUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  useEffect(() => {
    if (!challenge) return;
    setSegundosRestantes(challenge.ttlSegundos);
    const intervalo = setInterval(() => {
      setSegundosRestantes(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [challenge]);

  const user = selectedUser;
  if (!user) return null;

  return (
    <Dialog open={!!selectedUser} onOpenChange={open => !open && onClose()}>
      <DialogContent className='w-[92vw] max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-white'>
        <DialogHeader>
          <DialogTitle className='text-lg sm:text-xl font-black uppercase tracking-tight text-white'>
            Código QR de Asistencia
          </DialogTitle>
          <DialogDescription className='text-slate-400 text-xs sm:text-sm'>
            Mostrá este código para registrar la asistencia de {user.name}. Es de un solo uso y
            vence en dos minutos.
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
                onClick={() => generarDesafio(user.id)}
                className='bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl uppercase tracking-widest text-xs'
              >
                <RefreshCw className='h-4 w-4 mr-2' /> Generar otro
              </Button>
            </div>
          )}
        </div>

        {challenge && segundosRestantes > 0 && (
          <div className='flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-300'>
            Vence en {segundosRestantes}s · un solo uso
          </div>
        )}

        {codigoAsistencia && (
          <div className='flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10'>
            <span className='text-slate-400 text-xs font-semibold'>Código:</span>
            <span className='text-indigo-400 text-2xl font-black tracking-[0.3em] font-mono'>
              {codigoAsistencia}
            </span>
          </div>
        )}

        <p className='text-center text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]'>
          El código se renueva en cada uso
        </p>
      </DialogContent>
    </Dialog>
  );
}
