'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, X, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Solicitud {
  id: string;
  cliente_id: string;
  monto: number;
  motivo: string;
  estado: string;
  fecha_crea: string;
  nombre: string;
  apellido: string;
  run: string;
  telefono: string;
  saldo_actual: number;
  solicitado_por_nick: string;
}

export function DevolucionSolicitudesButton() {
  const [open, setOpen] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendientes, setPendientes] = useState(0);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients/devolucion/solicitudes');
      const data = await res.json();
      if (data.success) {
        setSolicitudes(data.data || []);
        setPendientes((data.data || []).filter((s: Solicitud) => s.estado === 'pendiente').length);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
    const id = setInterval(fetchSolicitudes, 15000);
    return () => clearInterval(id);
  }, []);

  const handleAccion = async (id: string, accion: 'aprobar' | 'rechazar') => {
    try {
      const res = await fetch('/api/clients/devolucion/aprobar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitud_id: id, accion })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(accion === 'aprobar' ? 'Devolucion aprobada' : 'Solicitud rechazada');
        fetchSolicitudes();
      } else {
        toast.error(data.message || 'Error');
      }
    } catch {
      toast.error('Error al procesar');
    }
  };

  return (
    <>
      <Button
        variant='outline'
        size='sm'
        onClick={() => setOpen(true)}
        className='group relative whitespace-nowrap inline-flex items-center bg-black text-white h-11 rounded-full px-6 hover:bg-white hover:text-black dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto border-2'
      >
        <Bell className='w-4 h-4 mr-2' />
        Solicitudes
        {pendientes > 0 && (
          <Badge
            variant='outline'
            className='ml-2 h-5 min-w-5 justify-center rounded-full border-0 bg-zinc-50 text-red-600 shadow-sm transition-colors group-hover:bg-red-500 group-hover:text-white'
          >
            {pendientes}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-6 pb-2 border-b'>
            <DialogTitle className='flex items-center gap-2'>
              <Wallet className='w-5 h-5 text-amber-600' /> Solicitudes de Devolucion
            </DialogTitle>
            <DialogDescription className='sr-only'>
              Lista de solicitudes de devolucion de saldo
            </DialogDescription>
          </DialogHeader>
          <div className='flex-1 overflow-y-auto p-6 space-y-3'>
            {loading ? (
              <div className='flex justify-center py-8'>
                <Loader2 className='w-6 h-6 animate-spin' />
              </div>
            ) : solicitudes.length === 0 ? (
              <p className='text-center text-sm text-gray-500 py-8'>No hay solicitudes</p>
            ) : (
              solicitudes.map(s => (
                <div
                  key={s.id}
                  className={`p-4 rounded-xl border ${s.estado === 'pendiente' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10' : 'bg-gray-50 border-gray-200 dark:bg-slate-800'}`}
                >
                  <div className='flex justify-between items-start gap-4'>
                    <div>
                      <p className='font-bold text-sm'>
                        {s.nombre} {s.apellido}{' '}
                        <span className='font-normal text-xs text-gray-500'>
                          ({s.run || 'sin RUN'})
                        </span>
                      </p>
                      <p className='text-xs text-gray-600'>
                        Tel: {s.telefono || '—'} • Saldo: $
                        {Number(s.saldo_actual || 0).toLocaleString('es-CL')}
                      </p>
                      <p className='text-sm font-mono font-bold text-red-600 mt-1'>
                        ${Number(s.monto).toLocaleString('es-CL')}{' '}
                        <span className='text-xs font-normal text-gray-500'>via transferencia</span>
                      </p>
                      {s.motivo && (
                        <p className='text-xs text-gray-500 mt-1 italic'>“{s.motivo}”</p>
                      )}
                      <p className='text-[10px] text-gray-400 mt-1'>
                        Solicitado por {s.solicitado_por_nick || 'cajero'} •{' '}
                        {new Date(s.fecha_crea).toLocaleString('es-CL')}
                      </p>
                    </div>
                    <div className='flex flex-col gap-1 items-end'>
                      <Badge
                        className={
                          s.estado === 'pendiente'
                            ? 'bg-amber-100 text-amber-700'
                            : s.estado === 'aprobada'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                        }
                      >
                        {s.estado}
                      </Badge>
                      {s.estado === 'pendiente' && (
                        <div className='flex gap-2 mt-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleAccion(s.id, 'rechazar')}
                            className='rounded-full h-7 px-3'
                          >
                            <X className='w-3 h-3 mr-1' />
                            Rechazar
                          </Button>
                          <Button
                            size='sm'
                            onClick={() => handleAccion(s.id, 'aprobar')}
                            className='rounded-full h-7 px-3 bg-green-600 hover:bg-green-700'
                          >
                            <Check className='w-3 h-3 mr-1' />
                            Aprobar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className='border-t p-4 flex justify-center bg-gray-50 dark:bg-slate-900/50'>
            <Button variant='outline' onClick={() => setOpen(false)} className='rounded-full px-8'>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
