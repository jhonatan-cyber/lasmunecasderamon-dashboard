'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
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
import logger from '@/lib/utils/logger';

interface QrCodeDialogProps {
  selectedUser: {
    id: string | number;
    name?: string;
    nick?: string;
    role?: string;
    foto?: string | null;
    qr_token?: string | null;
  } | null;
  onClose: () => void;
}

export function QrCodeDialog({ selectedUser, onClose }: QrCodeDialogProps) {
  const [codigoAsistencia, setCodigoAsistencia] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayUser, setDisplayUser] = useState(selectedUser);

  useEffect(() => {
    if (selectedUser) setDisplayUser(selectedUser);
    setCodigoAsistencia('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  useEffect(() => {
    if (!selectedUser) return;

    fetch('/api/codigo/actual')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCodigoAsistencia(data.codigo);
      })
      .catch(() => {});

    const es = new EventSource('/api/notifications/sse');
    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'code_changed' && payload.data?.codigo) {
          setCodigoAsistencia(payload.data.codigo);
        }
        if (payload.type === 'qr_token_updated' && payload.data?.userId === selectedUser.id) {
          fetch(`/api/users/${selectedUser.id}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.user) setDisplayUser(data.user);
            })
            .catch(e => logger.captureException(e, { context: 'QrCodeDialog:sseQRUpdate' }));
        }
      } catch {}
    };

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  useEffect(() => {
    if (!selectedUser) return;

    const checkQR = async () => {
      try {
        const res = await fetch(`/api/users/${selectedUser.id}`);
        const data = await res.json();
        if (data.success && data.user && data.user.qr_token !== displayUser?.qr_token) {
          setDisplayUser(data.user);
        }
      } catch (e) {
        logger.captureException(e, { context: 'QrCodeDialog:checkQR' });
      }
    };

    window.addEventListener('focus', checkQR);
    return () => window.removeEventListener('focus', checkQR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id, displayUser?.qr_token]);

  const handleGenerateQR = async (userId: string | number) => {
    try {
      setIsGenerating(true);
      const response = await fetch('/api/users/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Token QR generado con éxito');
        setDisplayUser(prev =>
          prev && prev.id === userId ? { ...prev, qr_token: result.qr_token } : prev
        );
      } else {
        toast.error(result.message || 'Error al generar el token');
      }
    } catch {
      toast.error('Ocurrió un error inesperado');
    } finally {
      setIsGenerating(false);
    }
  };

  const user = displayUser ?? selectedUser;
  if (!user) return null;

  return (
    <Dialog open={!!selectedUser} onOpenChange={open => !open && onClose()}>
      <DialogContent className='w-[92vw] max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-white'>
        <DialogHeader>
          <DialogTitle className='text-lg sm:text-xl font-black uppercase tracking-tight text-white'>
            Código QR de Asistencia
          </DialogTitle>
          <DialogDescription className='text-slate-400 text-xs sm:text-sm'>
            Muestra este código a la app móvil para registrar la asistencia de {user?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className='p-3 bg-white rounded-2xl'>
          {user?.qr_token ? (
            <LazyQRCode
              value={user.qr_token}
              size={220}
              style={{ width: '100%', height: 'auto' }}
              level='H'
              includeMargin={true}
              fgColor={
                user.role?.toLowerCase().includes('anfitriona')
                  ? '#E11D48'
                  : user.role?.toLowerCase().includes('garzon')
                    ? '#F97316'
                    : '#4F46E5'
              }
              imageSettings={
                user.foto
                  ? {
                      src: `/img/users/${user.foto}`,
                      x: undefined,
                      y: undefined,
                      height: 44,
                      width: 44,
                      excavate: true
                    }
                  : undefined
              }
            />
          ) : (
            <div className='flex flex-col items-center gap-3 py-6'>
              <div className='w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300'>
                <UserPlus className='h-8 w-8 text-slate-400' />
              </div>
              <div className='text-center'>
                <p className='text-slate-900 font-black uppercase tracking-tight text-sm'>
                  Sin Token Asignado
                </p>
                <p className='text-slate-500 text-xs mt-1'>
                  Este usuario aún no tiene un código QR configurado.
                </p>
              </div>
              <Button
                onClick={() => handleGenerateQR(user.id)}
                disabled={isGenerating}
                className='bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95'
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Generar QR
              </Button>
            </div>
          )}
        </div>

        {codigoAsistencia && (
          <div className='flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10'>
            <span className='text-slate-400 text-xs font-semibold'>Código:</span>
            <span className='text-indigo-400 text-2xl font-black tracking-[0.3em] font-mono'>
              {codigoAsistencia}
            </span>
          </div>
        )}

        <p className='text-center text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]'>
          El código se actualizará automáticamente tras el escaneo
        </p>
      </DialogContent>
    </Dialog>
  );
}
