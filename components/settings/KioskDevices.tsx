'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFechaConHora } from '@/lib/utils/formatters';

export function KioskActivation() {
  const id = useId();
  const [nombre, setNombre] = useState('Entrada del local');
  const [saving, setSaving] = useState(false);
  async function activate(event: React.FormEvent) {
    event.preventDefault();
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
    <form onSubmit={activate} className='flex flex-col gap-3'>
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
      <Button type='submit' disabled={saving || !nombre.trim()}>
        {saving ? 'Activando...' : 'Activar pantalla de asistencia'}
      </Button>
    </form>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pantallas de asistencia</CardTitle>
        <CardDescription>
          Vincula los dispositivos del local sin claves. La autorización se renueva automáticamente
          mientras se utilizan.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        <KioskActivation />
        <div className='flex flex-col gap-3'>
          <h3 className='font-medium'>Dispositivos vinculados</h3>
          {loading ? (
            <p role='status'>Cargando pantallas...</p>
          ) : error ? (
            <div role='alert'>
              <p>{error}</p>
              <Button type='button' variant='outline' onClick={load}>
                Reintentar
              </Button>
            </div>
          ) : !devices.length ? (
            <p className='text-sm text-muted-foreground'>Todavía no hay pantallas vinculadas.</p>
          ) : (
            devices.map(device => (
              <div
                key={device.id}
                className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3'
              >
                <div>
                  <p className='font-medium'>{device.nombre}</p>
                  <p className='text-xs text-muted-foreground'>
                    Último uso: {formatFechaConHora(device.ultimo_uso)}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {device.revocado_en
                      ? 'Desvinculada'
                      : !device.activo
                        ? 'Inactiva: vuelve a activarla en el dispositivo'
                        : 'Vinculada · Renovación automática'}
                  </p>
                </div>
                {!device.revocado_en && (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => revoke(device.id)}
                    disabled={revoking !== null}
                  >
                    {revoking === device.id ? 'Desvinculando...' : 'Desvincular'}
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
    </Card>
  );
}
