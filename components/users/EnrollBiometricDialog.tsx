'use client';

import { useEffect, useState } from 'react';
import { Camera, Loader2, ScanFace, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useBiometricPreview } from '@/hooks/useBiometricPreview';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  nombre: string;
  codigo: string;
  onSaved?: () => void;
}
interface Device {
  id: string;
  nombre: string;
  revocado_en: string | null;
  ip: string | null;
  usuario_equipo: string | null;
}

export function EnrollBiometricDialog({ open, onOpenChange, userId, nombre, onSaved }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'capture' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const { src, failed } = useBiometricPreview(deviceId, open, live);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setPhoto(null);
    setDevices([]);
    setDeviceId('');
    setError(null);
    setVerification(null);
    setLive(true);
    async function load() {
      try {
        const [statusResponse, devicesResponse] = await Promise.all([
          fetch(`/api/users/${encodeURIComponent(userId)}/biometric`, {
            signal: controller.signal,
            cache: 'no-store'
          }),
          fetch('/api/biometric/devices', { signal: controller.signal, cache: 'no-store' })
        ]);
        const status = await statusResponse.json();
        if (!statusResponse.ok || !status.success)
          throw new Error(status.message || 'No se pudo cargar el enrolamiento.');
        if (controller.signal.aborted) return;
        setPhoto(status.data.cara_base64 ?? null);
        const list = await devicesResponse.json();
        if (!devicesResponse.ok || !list.success)
          throw new Error(list.message || 'No se pudieron cargar las cámaras.');
        if (controller.signal.aborted) return;
        const available: Device[] = list.data.filter(
          (d: Device) => !d.revocado_en && d.ip && d.usuario_equipo
        );
        setDevices(available);
        setDeviceId(available[0]?.id ?? '');
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'No se pudo cargar.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [open, userId]);

  async function execute(action: 'capture' | 'verify') {
    if (busy || !deviceId) return;
    setBusy(action);
    setError(null);
    setVerification(null);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(userId)}/biometric/${action === 'capture' ? 'captura' : 'verificar'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId })
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo completar la operación.');
      if (action === 'capture') {
        setPhoto(result.data.capturas.cara);
        toast.success('Enrolamiento guardado en el sistema.');
        onSaved?.();
      } else {
        setVerification(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión. Reintentá.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogContent className='max-w-lg max-h-[92vh] overflow-y-auto' aria-busy={Boolean(busy)}>
        <DialogHeader>
          <DialogTitle>Enrolar a {nombre}</DialogTitle>
          <DialogDescription>
            Poné a la persona frente a la cámara del lector. Su imagen se guardará únicamente en la
            base de datos del sistema para el reconocimiento facial.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p role='status'>Cargando enrolamiento…</p>
        ) : (
          <div className='flex flex-col gap-4'>
            {devices.length > 0 ? (
              <>
                <Select
                  value={deviceId}
                  disabled={Boolean(busy)}
                  onValueChange={(id: string) => {
                    setDeviceId(id);
                    setVerification(null);
                  }}
                >
                  <SelectTrigger aria-label='Cámara de captura'>
                    <SelectValue placeholder='Seleccionar cámara' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {devices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.nombre}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm text-muted-foreground'>Cámara del lector</p>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={Boolean(busy)}
                    onClick={() => setLive(value => !value)}
                  >
                    {live ? 'Pausar vista' : 'Ver en vivo'}
                  </Button>
                </div>
                {failed ? (
                  <p role='status'>No se pudo obtener video. Revisá la conexión del lector.</p>
                ) : src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt='Vista en vivo de la cámara del lector'
                    className='aspect-video w-full rounded-lg border object-contain'
                  />
                ) : (
                  <div className='flex aspect-video items-center justify-center' role='status'>
                    <Loader2 className='size-5 animate-spin' aria-label='Conectando cámara' />
                  </div>
                )}
                <Button disabled={Boolean(busy)} onClick={() => execute('capture')}>
                  {busy === 'capture' ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Camera className='size-4' />
                  )}
                  {busy === 'capture' ? 'Guardando…' : 'Capturar y guardar'}
                </Button>
                <p className='text-xs text-muted-foreground'>
                  Se toma una foto actual y se guarda al instante. Una nueva captura reemplaza la
                  referencia de esta cámara.
                </p>
              </>
            ) : (
              <p className='text-sm text-muted-foreground'>
                No hay cámaras disponibles. Configurá un lector con conexión y credenciales.
              </p>
            )}
            <div className='flex items-center gap-4 rounded-lg border p-4'>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/jpeg;base64,${photo}`}
                  alt={`Referencia facial de ${nombre} guardada en el sistema`}
                  className='size-24 rounded-lg object-cover'
                />
              ) : (
                <ScanFace className='size-12 text-muted-foreground' />
              )}
              <p className='text-sm'>
                {photo ? 'Imagen guardada en el sistema' : 'Todavía no hay imagen de referencia'}
              </p>
            </div>
            {photo && deviceId && (
              <Button variant='outline' disabled={Boolean(busy)} onClick={() => execute('verify')}>
                {busy === 'verify' ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <ShieldCheck className='size-4' />
                )}
                Verificar coincidencia
              </Button>
            )}
            {verification && (
              <p role='status' className='text-sm'>
                {verification}
              </p>
            )}
          </div>
        )}
        {error && (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant='outline' disabled={Boolean(busy)} onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
