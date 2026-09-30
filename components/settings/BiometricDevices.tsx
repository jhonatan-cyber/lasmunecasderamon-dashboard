'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFechaConHora } from '@/lib/utils/formatters';

type Marca = 'zkteco' | 'dahua';

interface BiometricDevice {
  id: string;
  nombre: string;
  marca: Marca;
  modelo: string | null;
  serial: string;
  ip: string | null;
  usuario_equipo?: string | null;
  fecha_crea: string;
  ultimo_uso: string | null;
  revocado_en: string | null;
  activo: boolean;
}

interface EstadoConexion {
  probando: boolean;
  ok?: boolean;
  mensaje?: string;
}

interface ResumenPoll {
  equipoId: string;
  serial: string;
  leidos: number;
  nuevos: number;
  registrados: number;
  duplicados: number;
  fueraVentana: number;
  sinUsuario: number;
  usuarioInactivo: number;
  errores: number;
}

const RESUMEN_POLL = (r: ResumenPoll): string =>
  `${r.registrados} asistencia(s) registrada(s) de ${r.nuevos} registro(s) nuevo(s)` +
  (r.duplicados ? ` · ${r.duplicados} duplicado(s)` : '') +
  (r.fueraVentana ? ` · ${r.fueraVentana} fuera de ventana` : '') +
  (r.sinUsuario ? ` · ${r.sinUsuario} sin usuario` : '') +
  (r.usuarioInactivo ? ` · ${r.usuarioInactivo} inactivo(s)` : '') +
  (r.errores ? ` · ${r.errores} error(es)` : '');

/**
 * URL que hay que poner en el equipo para que empuje sus eventos:
 *  - ZKTeco (ADMS): el protocolo ya trae el serial en la query, basta con la raíz.
 *  - Dahua: el serial va explícito en la query porque el payload puede no traerlo.
 */
function urlConfiguracion(marca: Marca, serial: string, origin: string): string {
  return marca === 'dahua' ? `${origin}/dahua/push?serial=${serial}` : `${origin}/iclock/cdata`;
}

export function BiometricDevices() {
  const id = useId();
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const [nombre, setNombre] = useState('Puerta principal');
  const [marca, setMarca] = useState<Marca>('zkteco');
  const [modelo, setModelo] = useState('');
  const [serial, setSerial] = useState('');
  const [ip, setIp] = useState('');
  const [saving, setSaving] = useState(false);

  // Credenciales CGI por equipo (lo que usa el SERVIDOR para conectarse al lector).
  const [credPorEquipo, setCredPorEquipo] = useState<
    Record<string, { ip: string; usuario: string; clave: string }>
  >({});
  const [conexionPorEquipo, setConexionPorEquipo] = useState<Record<string, EstadoConexion>>({});
  const [credVisible, setCredVisible] = useState<Record<string, boolean>>({});
  const [recoger, setRecoger] = useState<Record<string, boolean>>({});
  const [pollAccion, setPollAccion] = useState<Record<string, 'toggling' | 'polling' | null>>({});
  const [pollMensaje, setPollMensaje] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/biometric/devices', { cache: 'no-store' });
      if (response.status === 401 || response.status === 403) {
        setAllowed(false);
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('No se pudieron cargar los equipos.');
      setDevices(result.data);
      setRecoger(
        Object.fromEntries(
          (result.data as BiometricDevice[]).map(d => [
            d.id,
            Number((d as any).recoger_registros) === 1
          ])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/biometric/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          marca,
          modelo: modelo.trim(),
          serial: serial.trim(),
          ip: ip.trim()
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo vincular el equipo.');
      toast.success('Equipo vinculado. Configura la URL en el lector.');
      setSerial('');
      setModelo('');
      setIp('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo vincular el equipo.');
    } finally {
      setSaving(false);
    }
  }

  async function probarConexion(device: BiometricDevice) {
    const cred = credPorEquipo[device.id];
    setConexionPorEquipo(prev => ({ ...prev, [device.id]: { probando: true } }));
    try {
      // Con credenciales tipeadas y sin guardar todavía: POST las guarda y prueba.
      // Sin credenciales nuevas: GET prueba con las ya guardadas.
      const res = cred
        ? await fetch(`/api/biometric/devices/${encodeURIComponent(device.id)}/credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cred)
          })
        : await fetch(`/api/biometric/devices/${encodeURIComponent(device.id)}/credentials`);
      const result = await res.json();
      setConexionPorEquipo(prev => ({
        ...prev,
        [device.id]: { probando: false, ok: Boolean(result.success), mensaje: result.message }
      }));
      if (result.success) {
        toast.success(result.message || 'Conexión OK.');
        setCredPorEquipo(prev => ({ ...prev, [device.id]: { ip: '', usuario: '', clave: '' } }));
        await load();
      } else {
        toast.error(result.message || 'No se pudo conectar.');
      }
    } catch (err) {
      setConexionPorEquipo(prev => ({ ...prev, [device.id]: { probando: false } }));
      toast.error(err instanceof Error ? err.message : 'Error de conexión.');
    }
  }

  async function toggleRecoger(device: BiometricDevice, encender: boolean) {
    setPollAccion(prev => ({ ...prev, [device.id]: 'toggling' }));
    try {
      const res = await fetch(`/api/biometric/devices/${encodeURIComponent(device.id)}/poller`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encender })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'No se pudo cambiar el recolector.');
      toast.success(result.message);
      setRecoger(prev => ({ ...prev, [device.id]: encender }));
      setPollMensaje(prev => ({ ...prev, [device.id]: '' }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setPollAccion(prev => ({ ...prev, [device.id]: null }));
    }
  }

  async function recogerAhora(device: BiometricDevice) {
    setPollAccion(prev => ({ ...prev, [device.id]: 'polling' }));
    try {
      const res = await fetch('/api/biometric/records/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId: device.id })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'No se pudo recoger.');
      const r = result.data as ResumenPoll;
      setPollMensaje(prev => ({ ...prev, [device.id]: RESUMEN_POLL(r) }));
      if (r.registrados > 0) toast.success(`${r.registrados} asistencia(s) registrada(s).`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setPollAccion(prev => ({ ...prev, [device.id]: null }));
    }
  }

  async function revoke(id: string) {
    setRevoking(id);
    try {
      const response = await fetch(`/api/biometric/devices/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo desvincular.');
      toast.success('Equipo desvinculado: sus eventos ya no se aceptan.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setRevoking(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copiada.');
    } catch {
      toast.error('No se pudo copiar. Copia el texto a mano.');
    }
  }

  if (!allowed) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lector biométrico de la puerta</CardTitle>
        <CardDescription>
          Los equipos ZKTeco y Dahua empujan cada verificación a este sitio. El alta por serial es
          lo que autoriza al equipo: sin ella, sus eventos se rechazan.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        <form onSubmit={create} className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor={`${id}-nombre`}>Nombre</Label>
            <Input
              id={`${id}-nombre`}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              maxLength={100}
              required
              disabled={saving}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor={`${id}-marca`}>Marca</Label>
            <select
              id={`${id}-marca`}
              value={marca}
              onChange={e => setMarca(e.target.value as Marca)}
              disabled={saving}
              className='flex h-10 w-full rounded-full border border-input bg-gray-100 px-4 py-2 text-base ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
            >
              <option value='zkteco'>ZKTeco (ADMS / iClock)</option>
              <option value='dahua'>Dahua (push HTTP)</option>
            </select>
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor={`${id}-serial`}>Serial del equipo</Label>
            <Input
              id={`${id}-serial`}
              value={serial}
              onChange={e => setSerial(e.target.value)}
              placeholder='Ej: QJT3253600356'
              maxLength={64}
              required
              disabled={saving}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor={`${id}-modelo`}>Modelo (opcional)</Label>
            <Input
              id={`${id}-modelo`}
              value={modelo}
              onChange={e => setModelo(e.target.value)}
              placeholder='Ej: SpeedFace-V5L, ASI3204E'
              maxLength={80}
              disabled={saving}
            />
          </div>
          <div className='flex flex-col gap-1.5 sm:col-span-2'>
            <Label htmlFor={`${id}-ip`}>IP del equipo (opcional, solo informativa)</Label>
            <Input
              id={`${id}-ip`}
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder='Ej: 192.168.1.50'
              maxLength={45}
              disabled={saving}
            />
          </div>
          <div className='sm:col-span-2'>
            <Button type='submit' disabled={saving || !nombre.trim() || !serial.trim()}>
              {saving ? 'Vinculando...' : 'Vincular equipo'}
            </Button>
          </div>
        </form>

        <div className='flex flex-col gap-3'>
          <h3 className='font-medium'>Equipos vinculados</h3>
          {loading ? (
            <p role='status'>Cargando equipos...</p>
          ) : error ? (
            <div role='alert'>
              <p>{error}</p>
              <Button type='button' variant='outline' onClick={load}>
                Reintentar
              </Button>
            </div>
          ) : !devices.length ? (
            <p className='text-sm text-muted-foreground'>Todavía no hay equipos vinculados.</p>
          ) : (
            devices.map(device => {
              const url = urlConfiguracion(device.marca, device.serial, origin);
              return (
                <div key={device.id} className='flex flex-col gap-3 rounded-lg border p-3'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <p className='font-medium'>
                        {device.nombre}
                        <span className='ml-2 text-xs font-normal text-muted-foreground'>
                          {device.marca === 'dahua' ? 'Dahua' : 'ZKTeco'}
                          {device.modelo ? ` · ${device.modelo}` : ''}
                        </span>
                      </p>
                      <p className='text-xs text-muted-foreground'>Serial: {device.serial}</p>
                      <p className='text-xs text-muted-foreground'>
                        Último evento:{' '}
                        {device.ultimo_uso ? formatFechaConHora(device.ultimo_uso) : 'nunca'}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {device.revocado_en
                          ? `Desvinculado el ${formatFechaConHora(device.revocado_en)}`
                          : device.activo
                            ? 'Activo · sus eventos se aceptan'
                            : 'Inactivo'}
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
                  <div className='flex flex-wrap items-center gap-2'>
                    <code className='flex-1 min-w-0 truncate rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs'>
                      {url}
                    </code>
                    <Button type='button' variant='outline' size='sm' onClick={() => copy(url)}>
                      Copiar URL
                    </Button>
                  </div>
                  {device.marca === 'dahua' && (
                    <div className='flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div>
                          <p className='text-sm font-medium'>Conexión del sistema al equipo</p>
                          <p className='text-xs text-muted-foreground'>
                            IP y credenciales CGI para enrolar desde acá (se guardan cifradas).
                          </p>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => probarConexion(device)}
                          disabled={conexionPorEquipo[device.id]?.probando}
                        >
                          {conexionPorEquipo[device.id]?.probando
                            ? 'Probando...'
                            : 'Probar conexión'}
                        </Button>
                      </div>
                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                        <Input
                          aria-label='IP del equipo'
                          placeholder='IP, ej: 192.168.1.50'
                          value={credPorEquipo[device.id]?.ip ?? device.ip ?? ''}
                          onChange={e =>
                            setCredPorEquipo(prev => ({
                              ...prev,
                              [device.id]: {
                                ip: e.target.value,
                                usuario:
                                  credPorEquipo[device.id]?.usuario ?? device.usuario_equipo ?? '',
                                clave: credPorEquipo[device.id]?.clave ?? ''
                              }
                            }))
                          }
                          maxLength={45}
                        />
                        <Input
                          aria-label='Usuario CGI'
                          placeholder='Usuario CGI (admin)'
                          value={credPorEquipo[device.id]?.usuario ?? device.usuario_equipo ?? ''}
                          onChange={e =>
                            setCredPorEquipo(prev => ({
                              ...prev,
                              [device.id]: {
                                ip: credPorEquipo[device.id]?.ip ?? device.ip ?? '',
                                usuario: e.target.value,
                                clave: credPorEquipo[device.id]?.clave ?? ''
                              }
                            }))
                          }
                          maxLength={64}
                        />
                        <div className='flex gap-1'>
                          <Input
                            aria-label='Clave CGI'
                            type={credVisible[device.id] ? 'text' : 'password'}
                            placeholder='Clave CGI'
                            value={credPorEquipo[device.id]?.clave ?? ''}
                            onChange={e =>
                              setCredPorEquipo(prev => ({
                                ...prev,
                                [device.id]: {
                                  ip: credPorEquipo[device.id]?.ip ?? device.ip ?? '',
                                  usuario:
                                    credPorEquipo[device.id]?.usuario ??
                                    device.usuario_equipo ??
                                    '',
                                  clave: e.target.value
                                }
                              }))
                            }
                            maxLength={100}
                          />
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setCredVisible(prev => ({ ...prev, [device.id]: !prev[device.id] }))
                            }
                          >
                            {credVisible[device.id] ? 'Ocultar' : 'Ver'}
                          </Button>
                        </div>
                      </div>
                      {conexionPorEquipo[device.id]?.mensaje && (
                        <p
                          role='status'
                          className={
                            conexionPorEquipo[device.id]?.ok
                              ? 'text-xs text-green-700 dark:text-green-400'
                              : 'text-xs text-amber-700 dark:text-amber-400'
                          }
                        >
                          {conexionPorEquipo[device.id]?.mensaje}
                        </p>
                      )}
                      <div className='flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-gray-300 dark:border-gray-700 pt-2'>
                        <label className='flex items-center gap-2 text-sm'>
                          <input
                            type='checkbox'
                            className='h-4 w-4 rounded border-input'
                            checked={recoger[device.id] ?? false}
                            disabled={pollAccion[device.id] === 'toggling'}
                            onChange={e => toggleRecoger(device, e.target.checked)}
                          />
                          Recoger registros para asistencia (cada minuto)
                        </label>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => recogerAhora(device)}
                          disabled={pollAccion[device.id] !== null}
                        >
                          {pollAccion[device.id] === 'polling' ? 'Recogiendo...' : 'Recoger ahora'}
                        </Button>
                      </div>
                      {pollMensaje[device.id] && (
                        <p role='status' className='text-xs text-muted-foreground'>
                          {pollMensaje[device.id]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className='text-xs text-muted-foreground space-y-1'>
          <p>
            <strong>ZKTeco:</strong> en el equipo, Comm → Server Mode = ADMS y pon el dominio del
            sitio como servidor (HTTPS en el puerto 443). El equipo empieza a conectarse solo.
          </p>
          <p>
            <strong>Dahua:</strong> en el terminal, configura el push hacia la URL mostrada. La hora
            del equipo debe estar en la zona horaria del negocio.
          </p>
          <p>
            El enrolamiento de huella y cara se hace en el menú del equipo; el código de cada
            persona se registra en su ficha (Personal → Editar).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
