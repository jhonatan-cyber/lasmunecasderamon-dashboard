'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, MonitorSmartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { formatFechaConHora } from '@/lib/utils/formatters';

export function KioskActivation() {
  const id = useId();
  const [nombre, setNombre] = useState('Entrada del local');
  const [saving, setSaving] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function activar() {
    setSaving(true);
    try {
      const response = await fetch('/api/kiosk/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() })
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo activar la pantalla.');
      localStorage.removeItem('auth_role_hint');
      localStorage.removeItem('userRole');
      window.location.replace('/asistencia-qr');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo activar la pantalla.');
      setSaving(false);
    }
  }

  return (
    <>
      <form
        onSubmit={event => {
          event.preventDefault();
          if (!saving) setConfirmar(true);
        }}
        className='flex flex-col gap-3'
      >
        <Label htmlFor={id}>Nombre de esta pantalla</Label>
        <Input
          id={id}
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          maxLength={100}
          required
          disabled={saving}
        />
        <p className='text-sm text-muted-foreground'>
          Activa esta opción en el dispositivo que quedará en el local. Se cerrará tu sesión de
          administrador en este navegador y se abrirá la pantalla de asistencia.
        </p>
        <div>
          <Button className='rounded-full' type='submit' disabled={saving || !nombre.trim()}>
            {saving ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <MonitorSmartphone className='h-4 w-4' />
            )}
            {saving ? 'Activando...' : 'Activar pantalla de asistencia'}
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activar esta pantalla como kiosko</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará tu sesión de administrador en este navegador y la pantalla quedará
              mostrando la asistencia en <strong>{nombre.trim()}</strong>. Para volver al panel vas
              a tener que iniciar sesión de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='rounded-full'>Cancelar</AlertDialogCancel>
            <AlertDialogAction className='rounded-full' onClick={() => void activar()}>
              {saving ? 'Activando...' : 'Sí, activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface Device {
  id: string;
  nombre: string;
  ultimo_uso: string;
  expira_en: string;
  revocado_en: string | null;
  activo: boolean;
}

export function KioskDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Device | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/kiosk/devices', { cache: 'no-store' });
      if (response.status === 401 || response.status === 403) {
        setAllowed(false);
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('No se pudieron cargar las pantallas.');
      setDevices(result.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    setRevoking(id);
    try {
      const response = await fetch(`/api/kiosk/devices/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo desvincular.');
      toast.success('Pantalla desvinculada.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión.');
    } finally {
      setRevoking(null);
    }
  }

  if (!allowed) return null;

  const vinculadas = devices.filter(d => !d.revocado_en);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <MonitorSmartphone className='h-5 w-5' /> Pantallas de asistencia
        </CardTitle>
        <CardDescription>
          Vincula los dispositivos del local sin claves. La autorización se renueva automáticamente
          mientras se utilizan.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        <KioskActivation />

        <div className='flex flex-col gap-3'>
          <h3 className='font-medium'>
            Dispositivos vinculados
            {!loading && !error && devices.length > 0 && (
              <span className='ml-2 text-xs font-normal text-muted-foreground'>
                {vinculadas.length} de {devices.length}
              </span>
            )}
          </h3>

          {loading ? (
            <div className='flex flex-col gap-2' role='status'>
              <Skeleton className='h-20 w-full' />
              <Skeleton className='h-20 w-full' />
              <span className='sr-only'>Cargando pantallas...</span>
            </div>
          ) : error ? (
            <div
              role='alert'
              className='flex flex-col items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10'
            >
              <p className='text-sm text-amber-800 dark:text-amber-300'>{error}</p>
              <Button
                className='rounded-full'
                type='button'
                variant='outline'
                size='sm'
                onClick={load}
              >
                Reintentar
              </Button>
            </div>
          ) : !devices.length ? (
            <p className='rounded-2xl border border-dashed p-4 text-sm text-muted-foreground'>
              Todavía no hay pantallas vinculadas. Activá esta pantalla como kiosko para usarla en
              la entrada.
            </p>
          ) : (
            devices.map(device => (
              <div
                key={device.id}
                className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3'
              >
                <div className='min-w-0'>
                  <p className='font-medium'>{device.nombre}</p>
                  <p className='text-xs text-muted-foreground'>
                    Último uso: {formatFechaConHora(device.ultimo_uso)}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {device.revocado_en
                      ? `Desvinculada el ${formatFechaConHora(device.revocado_en)}`
                      : !device.activo
                        ? 'Inactiva: vuelve a activarla en el dispositivo'
                        : 'Vinculada · Renovación automática'}
                  </p>
                </div>
                {!device.revocado_en && (
                  <Button
                    className='rounded-full'
                    type='button'
                    variant='outline'
                    onClick={() => setRevokeTarget(device)}
                    disabled={revoking !== null}
                  >
                    Desvincular
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <p className='text-xs text-muted-foreground'>
          Si borras las cookies o la pantalla permanece sin uso durante 30 días, vuelve a activarla
          con una sesión de administrador.
        </p>
      </CardContent>

      <DeleteConfirmModal
        open={revokeTarget !== null}
        onOpenChange={open => {
          if (!open) setRevokeTarget(null);
        }}
        onConfirm={() => {
          if (revokeTarget) void revoke(revokeTarget.id);
        }}
        entityLabel='vínculo con la pantalla'
        entityValue={revokeTarget ? revokeTarget.nombre : '---'}
        fieldName='Pantalla'
        isLoading={revokeTarget !== null && revoking === revokeTarget.id}
      />
    </Card>
  );
}
