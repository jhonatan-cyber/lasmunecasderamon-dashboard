'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Fingerprint, Loader2, RefreshCw, ScanFace, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { formatFechaConHora } from '@/lib/utils/formatters';

interface EnrollBiometricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  nombre: string;
  codigo: string;
  onSaved?: () => void;
}

interface EstadoEnrolamiento {
  codigo: string | null;
  huella: number;
  facial: number;
  ultima_verificacion: string | null;
  ultimo_resultado: string | null;
}

interface DispositivoItem {
  id: string;
  nombre: string;
  marca: string;
  serial: string;
  activo: boolean;
  revocado_en: string | null;
  ip: string | null;
  usuario_equipo: string | null;
}

interface DetallesSync {
  cara: 'sincronizada' | 'no_soportada' | 'sin_datos' | 'error';
  huella: 'sincronizada' | 'no_soportada' | 'sin_datos' | 'error';
}

interface ResultadoSync {
  ok: boolean;
  mensaje: string;
  detalles?: DetallesSync;
}

const ETIQUETA_DETALLE: Record<DetallesSync['cara'], string> = {
  sincronizada: 'sincronizada',
  no_soportada: 'no soportada por el equipo',
  sin_datos: 'sin datos nuevos',
  error: 'con error'
};

/**
 * Enrolamiento gestionado de una persona.
 *
 * La captura es la persona frente al lector; el SISTEMA se conecta al equipo por
 * IP (Dahua, CGI), baja la plantilla y la guarda en nuestra DB como maestra.
 * Desde acá también se puede restaurar la DB al equipo (terminal nuevo o
 * formateado) y quitar a la persona del equipo.
 */
export function EnrollBiometricDialog({
  open,
  onOpenChange,
  userId,
  nombre,
  codigo,
  onSaved
}: EnrollBiometricDialogProps) {
  const [cara, setCara] = useState(false);
  const [huella, setHuella] = useState(false);
  const [estado, setEstado] = useState<EstadoEnrolamiento | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [dispositivos, setDispositivos] = useState<DispositivoItem[]>([]);
  const [dispositivoId, setDispositivoId] = useState('');
  const [sincronizando, setSincronizando] = useState<'sync' | 'restore' | null>(null);
  const [resultadoSync, setResultadoSync] = useState<ResultadoSync | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/biometric`, {
        cache: 'no-store'
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setEstado(result.data);
        setCara(Number(result.data.facial) === 1);
        setHuella(Number(result.data.huella) === 1);
      }
    } catch {
      // El dialogo funciona igual: los checkboxes se guardan igual.
    } finally {
      setCargando(false);
    }
  }, [userId]);

  const cargarDispositivos = useCallback(async () => {
    try {
      const res = await fetch('/api/biometric/devices', { cache: 'no-store' });
      if (!res.ok) return; // sin permiso de administrador: la parte manual sigue usable
      const result = await res.json();
      if (res.ok && result.success) {
        const activos: DispositivoItem[] = (result.data || []).filter(
          (d: DispositivoItem) => !d.revocado_en
        );
        setDispositivos(activos);
        setDispositivoId(prev => {
          if (prev && activos.some((d: DispositivoItem) => d.id === prev)) return prev;
          const conCredenciales = activos.find((d: DispositivoItem) => d.ip && d.usuario_equipo);
          return conCredenciales?.id || activos[0]?.id || '';
        });
      }
    } catch {
      // Sin lista de equipos el diálogo sigue funcionando en modo manual.
    }
  }, []);

  useEffect(() => {
    if (open) {
      void cargar();
      void cargarDispositivos();
      setResultadoSync(null);
    }
  }, [open, cargar, cargarDispositivos]);

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success('Código copiado.');
    } catch {
      toast.error('No se pudo copiar el código.');
    }
  }

  async function sincronizar(accion: 'sync' | 'restore') {
    if (!dispositivoId) {
      toast.error('Primero vinculá un equipo y cargale sus credenciales.');
      return;
    }
    setSincronizando(accion);
    setResultadoSync(null);
    try {
      const url =
        accion === 'sync'
          ? `/api/users/${encodeURIComponent(userId)}/biometric/sync`
          : `/api/users/${encodeURIComponent(userId)}/biometric/sync`;
      const opciones =
        accion === 'sync'
          ? {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId: dispositivoId })
            }
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId: dispositivoId })
            };
      const res = await fetch(url, opciones);
      const result = await res.json();
      setResultadoSync({
        ok: Boolean(result.success),
        mensaje: result.message || (result.success ? 'Listo.' : 'No se pudo sincronizar.'),
        detalles: result.data?.detalles
      });
      if (result.success) {
        toast.success(result.message);
        // Lo que el equipo confirmó queda reflejado en la ficha.
        if (accion === 'sync' && result.data?.detalles) {
          if (result.data.detalles.cara === 'sincronizada') setCara(true);
          if (result.data.detalles.huella === 'sincronizada') setHuella(true);
        }
        await cargar();
      } else {
        toast.error(result.message || 'No se pudo sincronizar.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setSincronizando(null);
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/biometric`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facial: cara ? 1 : 0, huella: huella ? 1 : 0 })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'No se pudo guardar.');
      toast.success('Enrolamiento guardado.');
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  const hayEquipos = dispositivos.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Enrolar a {nombre} en el lector</DialogTitle>
          <DialogDescription>
            La persona se pone frente al lector y el sistema baja su cara/huella al equipo por IP.
            La plantilla queda guardada en nuestra base (maestra) con una copia en el lector.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3'>
            <div>
              <p className='text-xs text-muted-foreground'>Código en el equipo</p>
              <p className='text-2xl font-semibold tabular-nums'>{codigo || '—'}</p>
            </div>
            <Button type='button' variant='outline' size='sm' onClick={copiarCodigo}>
              <Copy className='h-4 w-4 mr-1' /> Copiar
            </Button>
          </div>

          {hayEquipos ? (
            <div className='space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3'>
              <label className='text-xs text-muted-foreground' htmlFor='sync-device'>
                Equipo
              </label>
              <select
                id='sync-device'
                value={dispositivoId}
                onChange={e => setDispositivoId(e.target.value)}
                disabled={sincronizando !== null}
                className='flex h-9 w-full rounded-lg border border-input bg-gray-100 px-3 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
              >
                {dispositivos.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                    {d.ip ? ` · ${d.ip}` : ' · sin credenciales'}
                  </option>
                ))}
              </select>
              <p className='text-xs text-muted-foreground'>
                Pasos: 1) la persona se verifica frente al lector, 2) sincronizar acá. El sistema
                trae la plantilla y la guarda en la base.
              </p>
              <div className='flex flex-wrap gap-2 pt-1'>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => sincronizar('sync')}
                  disabled={sincronizando !== null}
                >
                  {sincronizando === 'sync' ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-1' />
                  ) : (
                    <RefreshCw className='h-4 w-4 mr-1' />
                  )}
                  Sincronizar desde el lector
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => sincronizar('restore')}
                  disabled={sincronizando !== null}
                >
                  {sincronizando === 'restore' ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-1' />
                  ) : (
                    <Undo2 className='h-4 w-4 mr-1' />
                  )}
                  Restaurar al lector
                </Button>
              </div>
              {resultadoSync && (
                <div
                  role='status'
                  className={
                    resultadoSync.ok
                      ? 'text-xs text-green-700 dark:text-green-400'
                      : 'text-xs text-amber-700 dark:text-amber-400'
                  }
                >
                  <p>{resultadoSync.mensaje}</p>
                  {resultadoSync.detalles && (
                    <p>
                      Cara: {ETIQUETA_DETALLE[resultadoSync.detalles.cara]} · Huella:{' '}
                      {ETIQUETA_DETALLE[resultadoSync.detalles.huella]}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className='rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-xs text-muted-foreground'>
              No hay equipos vinculados. Vinculá el lector en Configuraciones → Asistencia y cargale
              IP/credenciales para sincronizar desde acá.
            </p>
          )}

          <div className='flex flex-wrap gap-6'>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                className='h-4 w-4 rounded border-input'
                checked={cara}
                onChange={e => setCara(e.target.checked)}
              />
              <ScanFace className='h-4 w-4' /> Cara cargada en el equipo
            </label>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                className='h-4 w-4 rounded border-input'
                checked={huella}
                onChange={e => setHuella(e.target.checked)}
              />
              <Fingerprint className='h-4 w-4' /> Huella cargada en el equipo
            </label>
          </div>

          <p className='text-xs text-muted-foreground'>
            {cargando
              ? 'Consultando el lector...'
              : estado?.ultima_verificacion
                ? `Última verificación recibida: ${formatFechaConHora(
                    estado.ultima_verificacion
                  )} (${estado.ultimo_resultado}).`
                : 'Todavía no llegó ninguna verificación con este código.'}
          </p>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type='button' onClick={guardar} disabled={guardando}>
            {guardando && <Loader2 className='h-4 w-4 animate-spin mr-2' />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
