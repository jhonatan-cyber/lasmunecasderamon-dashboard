'use client';

import { useState, type KeyboardEvent } from 'react';
import { QrCode, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AttendanceCodeModal() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (code.length !== 4) return;

    setLoading(true);
    try {
      const res = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: code })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || data.message || 'Error al registrar asistencia', {
          icon: <XCircle className='h-4 w-4 text-red-500' />
        });
        return;
      }

      if (!data.success) {
        if (data.message?.toLowerCase().includes('horario')) {
          toast.error('Horario cerrado (después de las 23:00)', {
            icon: <Clock className='h-4 w-4 text-amber-500' />
          });
        } else {
          toast.error(data.message || 'No se pudo registrar la asistencia', {
            icon: <XCircle className='h-4 w-4 text-red-500' />
          });
        }
        return;
      }

      if (data.alreadyRegistered) {
        toast.success('Ya tenías asistencia hoy. Ubicación actualizada.', {
          icon: <CheckCircle2 className='h-4 w-4 text-amber-500' />
        });
      } else {
        toast.success('Asistencia registrada correctamente', {
          icon: <CheckCircle2 className='h-4 w-4 text-green-500' />
        });
      }

      setCode('');
      setOpen(false);
    } catch {
      toast.error('Error de conexión al registrar asistencia');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && code.length === 4) {
      handleSubmit();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setCode('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative'
          title='Ingresar código de asistencia'
        >
          <QrCode className='h-5 w-5' />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Registrar asistencia</DialogTitle>
          <DialogDescription>
            Ingresá el código de 4 dígitos que está visible en la pantalla del administrador o
            cajero.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col items-center gap-6 py-4'>
          <input
            type='text'
            inputMode='numeric'
            pattern='[0-9]*'
            maxLength={4}
            value={code}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setCode(val);
            }}
            onKeyDown={handleKeyDown}
            placeholder='0000'
            className='w-32 text-center text-4xl font-mono tracking-[0.5em] border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent px-2 py-3'
            autoFocus
            disabled={loading}
          />

          <Button
            onClick={handleSubmit}
            disabled={code.length !== 4 || loading}
            className='w-full gap-2'
            size='lg'
          >
            {loading ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                Registrando...
              </>
            ) : (
              <>
                <QrCode className='h-4 w-4' />
                Registrar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
