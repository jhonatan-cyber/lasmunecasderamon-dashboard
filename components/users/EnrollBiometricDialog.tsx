'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Camera,
  Copy,
  Fingerprint,
  Loader2,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
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
  cara_base64?: string | null;
  huella_hex?: string | null;
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
  /** Motivo del fallo (sin_plantilla, sdk_no_disponible…): decide la guía manual. */
  motivo?: string;
  detalles?: DetallesSync;
  capturas?: { cara: string | null; huella: string | null };
  carasEnEquipo?: number | null;
}

interface ResultadoVerificacion {
  coincide: boolean;
  similitud: number;
  umbral: number;
  mensaje: string;
  captura?: string | null;
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
 * La persona se pone frente al lector y el SISTEMA se conecta al equipo por IP:
 * baja lo que el lector captó (cara y huella, Dahua CGI) y lo guarda en nuestra
 * DB como maestra. Al revés, «Dar de alta en el equipo» crea la persona y le
 * carga su cara en el lector por NetSDK, sin pasar por el menú del equipo.
 */
export function EnrollBiometricDialog({
  open,
  onOpenChange,
  userId,
  nombre,
  codigo,
  onSaved
}: EnrollBiometricDialogProps) {
  const [codigoEditado, setCodigoEditado] = useState(codigo);
  const [codigoGenerado, setCodigoGenerado] = useState(false);
  const [cara, setCara] = useState(false);
  const [huella, setHuella] = useState(false);
  const [fotoCara, setFotoCara] = useState<string | null>(null);
  const [plantillaHuella, setPlantillaHuella] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoEnrolamiento | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [dispositivos, setDispositivos] = useState<DispositivoItem[]>([]);
  const [dispositivoId, setDispositivoId] = useState('');
  const [sincronizando, setSincronizando] = useState<'sync' | 'alta' | null>(null);
  const [resultadoSync, setResultadoSync] = useState<ResultadoSync | null>(null);

  // Cámara del lector en vivo (snapshot.cgi proxeado por nuestro servidor).
  const [enVivo, setEnVivo] = useState(true);
  const [fotograma, setFotograma] = useState(0);
  const [camaraFalla, setCamaraFalla] = useState(false);
  const [capturando, setCapturando] = useState(false);
  // Verificación de coincidencia facial (cara frente al lector vs foto guardada).
  const [verificando, setVerificando] = useState(false);
  const [verificacion, setVerificacion] = useState<ResultadoVerificacion | null>(null);

  useEffect(() => {
    if (!open || !enVivo || !dispositivoId) return;
    const id = setInterval(() => setFotograma(n => n + 1), 3000);
    return () => clearInterval(id);
  }, [open, enVivo, dispositivoId]);

  useEffect(() => {
    // Al cambiar de equipo se descarta el resultado de la cámara anterior.
    setCamaraFalla(false);
    setFotograma(n => n + 1);
    setVerificacion(null);
  }, [dispositivoId]);

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
        setFotoCara(result.data.cara_base64 ?? null);
        setPlantillaHuella(result.data.huella_hex ?? null);

        const codigoActual = String(result.data.codigo ?? '').trim();
        if (codigoActual) {
          setCodigoEditado(codigoActual);
        } else {
          // Primera vez que se enrola: se genera y guarda solo el código numérico
          // (el User ID que el lector va a reportar al verificar).
          const gen = await fetch(`/api/users/${encodeURIComponent(userId)}/biometric`, {
            method: 'POST'
          });
          const genJson = await gen.json();
          if (gen.ok && genJson.success && genJson.data?.codigo) {
            setCodigoEditado(String(genJson.data.codigo));
            setEstado(genJson.data);
            setCodigoGenerado(true);
            toast.success(genJson.message || `Código ${genJson.data.codigo} generado.`);
          }
        }
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
      setCodigoEditado(codigo);
      setCodigoGenerado(false);
      void cargar();
      void cargarDispositivos();
      setResultadoSync(null);
      setVerificacion(null);
    }
  }, [open, codigo, cargar, cargarDispositivos]);

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(codigoEditado);
      toast.success('Código copiado.');
    } catch {
      toast.error('No se pudo copiar el código.');
    }
  }

  async function sincronizar(accion: 'sync' | 'alta') {
    if (!dispositivoId) {
      toast.error('Primero vinculá un equipo y cargale sus credenciales.');
      return;
    }
    setSincronizando(accion);
    setResultadoSync(null);
    setVerificacion(null);
    try {
      const url = `/api/users/${encodeURIComponent(userId)}/biometric/sync`;
      const opciones =
        accion === 'sync'
          ? {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId: dispositivoId })
            }
          : {
              // Alta/restauración: crea la persona y le carga la cara por NetSDK.
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId: dispositivoId })
            };
      const res = await fetch(url, opciones);
      const result = await res.json();
      setResultadoSync({
        ok: Boolean(result.success),
        mensaje: result.message || (result.success ? 'Listo.' : 'No se pudo sincronizar.'),
        motivo: result.data?.motivo,
        detalles: result.data?.detalles,
        capturas: result.data?.capturas,
        carasEnEquipo: result.data?.carasEnEquipo ?? null
      });
      if (result.success) {
        toast.success(result.message);
        // Lo que el lector devolvió en ESTA captura se muestra de una.
        const capturas = result.data?.capturas;
        if (capturas) {
          if (typeof capturas.cara === 'string' && capturas.cara) setFotoCara(capturas.cara);
          if (typeof capturas.huella === 'string' && capturas.huella)
            setPlantillaHuella(capturas.huella);
        }
        // Tanto capturar como dar de alta actualizan qué modalidades tiene el equipo.
        if (result.data?.detalles) {
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
        body: JSON.stringify({
          codigo: (codigoEditado || '').trim(),
          facial: cara ? 1 : 0,
          huella: huella ? 1 : 0
        })
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

  /** Captura la foto actual de la cámara del lector y la guarda en la ficha. */
  async function capturarFoto() {
    if (!dispositivoId) {
      toast.error('Primero vinculá un equipo y cargale sus credenciales.');
      return;
    }
    setCapturando(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/biometric/captura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: dispositivoId })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'No se pudo capturar.');
      const foto = result.data?.capturas?.cara as string | undefined;
      if (foto) setFotoCara(foto);
      setEstado(prev => (prev ? { ...prev, cara_base64: foto ?? prev.cara_base64 } : prev));
      setResultadoSync(null);
      setVerificacion(null);
      toast.success(result.message || 'Foto capturada y guardada.');
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo capturar la foto.');
    } finally {
      setCapturando(false);
    }
  }

  /**
   * Compara la cara que el lector ve AHORA con la foto guardada de la persona:
   * el propio motor facial del equipo extrae los vectores de ambas fotos y se
   * calcula la similitud. Si no coincide, avisa antes de guardar el enrolamiento.
   */
  /** Copia los datos de la persona para cargarla manualmente en el equipo. */
  async function copiarDatosEquipo() {
    try {
      await navigator.clipboard.writeText(`ID: ${codigoEditado}\nNombre: ${nombre}`);
      toast.success('Datos copiados para el equipo.');
    } catch {
      toast.error('No se pudo copiar.');
    }
  }

  async function verificarCoincidencia() {
    if (!dispositivoId) {
      toast.error('Primero vinculá un equipo y cargale sus credenciales.');
      return;
    }
    setVerificando(true);
    setVerificacion(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/biometric/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: dispositivoId })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'No se pudo verificar.');
      const datos = result.data ?? {};
      setVerificacion({
        coincide: Boolean(datos.coincide),
        similitud: Number(datos.similitud ?? 0),
        umbral: Number(datos.umbral ?? 0),
        mensaje: String(result.message || ''),
        captura: datos.captura ?? null
      });
      if (datos.coincide) {
        toast.success(result.message || 'La cara coincide con la foto guardada.');
      } else {
        toast.warning(result.message || 'La cara NO coincide con la foto guardada.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo verificar la coincidencia.');
    } finally {
      setVerificando(false);
    }
  }

  const hayEquipos = dispositivos.length > 0;
  const hayCaptura = Boolean(fotoCara || plantillaHuella);
  // Guía manual como respaldo: se muestra cuando el alta por red no se pudo
  // hacer (falta la foto de referencia, no hay puente NetSDK en el servidor o el
  // equipo no la encontró al capturar). Ahí se explican los datos para cargarla
  // en el menú del equipo.
  const mostrarGuiaAlta = Boolean(
    resultadoSync &&
    !resultadoSync.ok &&
    (resultadoSync.motivo === 'sin_plantilla' ||
      resultadoSync.motivo === 'sdk_no_disponible' ||
      resultadoSync.motivo === 'no_soportado' ||
      (resultadoSync.detalles?.cara === 'sin_datos' &&
        resultadoSync.detalles?.huella !== 'sincronizada'))
  );
  const faltaFoto = resultadoSync?.motivo === 'sin_plantilla';
  const sinPuenteSdk =
    resultadoSync?.motivo === 'sdk_no_disponible' || resultadoSync?.motivo === 'no_soportado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[92vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='px-6 pt-6 pb-2 pr-10'>
          <DialogTitle>Enrolar a {nombre} en el lector</DialogTitle>
          <DialogDescription>
            Capturá la foto de la persona con la cámara del lector y dalo de alta desde acá: el
            sistema crea la persona y le carga su cara en el equipo por red (NetSDK), sin usar el
            menú del equipo. La plantilla queda guardada en nuestra base como maestra.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 min-h-0 overflow-y-auto px-6 space-y-4'>
          <div className='flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3'>
            <div className='flex-1'>
              <label className='text-xs text-muted-foreground' htmlFor='enroll-codigo'>
                Código en el equipo (el que reporta al verificar)
              </label>
              <input
                id='enroll-codigo'
                type='text'
                value={codigoEditado}
                onChange={e => setCodigoEditado(e.target.value)}
                placeholder='Ej: 1001'
                className='mt-1 flex h-9 w-full rounded-lg border border-input bg-gray-100 px-3 text-base dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
              />
            </div>
            <Button type='button' variant='outline' size='sm' onClick={copiarCodigo}>
              <Copy className='h-4 w-4 mr-1' /> Copiar
            </Button>
          </div>
          <p className='-mt-2 text-[11px] text-muted-foreground'>
            {codigoGenerado
              ? 'Código generado automáticamente para esta persona. Es el ID que el lector reporta: cargalo igual en la ficha de la persona dentro del equipo.'
              : 'Si está vacío se genera solo (1001, 1002…). Debe coincidir con el User ID de la persona dentro del lector.'}
          </p>

          {hayEquipos && (
            <div className='rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-xs font-semibold'>Cámara del lector (en vivo)</p>
                <Button type='button' size='sm' variant='ghost' onClick={() => setEnVivo(v => !v)}>
                  {enVivo ? 'Pausar' : 'En vivo'}
                </Button>
              </div>
              {camaraFalla ? (
                <div className='aspect-video w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center px-4 text-center text-xs text-muted-foreground'>
                  El lector no está entregando imagen. Revisá que esté encendido y con las
                  credenciales cargadas.
                </div>
              ) : (
                // Proxy del servidor: el navegador no puede autenticarse con Digest
                // contra el equipo. foto = snapshot.cgi del lector.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/biometric/devices/${dispositivoId}/snapshot?v=${fotograma}`}
                  alt='Cámara del lector'
                  onError={() => setCamaraFalla(true)}
                  className='aspect-video w-full rounded-lg border border-gray-200 dark:border-gray-700 object-cover bg-black/5'
                />
              )}
              <div className='flex items-center justify-between gap-2'>
                <p className='text-[11px] text-muted-foreground'>
                  {enVivo ? 'Actualizando cada 3 segundos' : 'Vista pausada'}
                </p>
                <div className='flex flex-wrap items-center justify-end gap-2'>
                  <Button type='button' size='sm' onClick={capturarFoto} disabled={capturando}>
                    {capturando ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-1' />
                    ) : (
                      <Camera className='h-4 w-4 mr-1' />
                    )}
                    Capturar foto
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={verificarCoincidencia}
                    disabled={verificando || capturando || !fotoCara}
                    title={
                      fotoCara
                        ? 'Compara la cara frente al lector con la foto guardada'
                        : 'Primero capturá la foto de referencia'
                    }
                  >
                    {verificando ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-1' />
                    ) : (
                      <ShieldCheck className='h-4 w-4 mr-1' />
                    )}
                    Verificar coincidencia
                  </Button>
                </div>
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Poné a la persona frente al lector y capturá: la foto queda como imagen de su ficha,
                sin tocar el equipo.
              </p>
              <p className='text-[11px] text-muted-foreground'>
                {fotoCara
                  ? 'Con la persona frente al lector, "Verificar coincidencia" compara su cara con la foto guardada usando el motor facial del equipo.'
                  : 'Para verificar primero capturá la foto de referencia ("Capturar foto").'}
              </p>
            </div>
          )}

          {verificacion && (
            <div
              role='status'
              className={`rounded-xl border px-4 py-3 space-y-1 ${
                verificacion.coincide
                  ? 'border-green-300 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10'
                  : 'border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10'
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  verificacion.coincide
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-amber-800 dark:text-amber-300'
                }`}
              >
                {verificacion.coincide
                  ? 'La cara coincide con la foto guardada'
                  : 'La cara NO coincide con la foto guardada'}
              </p>
              <p
                className={`text-[11px] ${
                  verificacion.coincide
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-amber-800 dark:text-amber-300'
                }`}
              >
                {verificacion.mensaje}
              </p>
              <div className='flex items-center gap-3 pt-1'>
                {verificacion.captura && (
                  // Foto en vivo usada para comparar (base64 que devuelve la API).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/jpeg;base64,${verificacion.captura}`}
                    alt='Cara frente al lector'
                    className='h-20 w-20 rounded-lg border border-gray-200 dark:border-gray-700 object-cover'
                  />
                )}
                <p className='text-[11px] text-muted-foreground'>
                  Similitud {Math.round(verificacion.similitud * 100)}% · mínimo aceptado{' '}
                  {Math.round(verificacion.umbral * 100)}%
                </p>
              </div>
            </div>
          )}

          <div className='rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-xs font-semibold'>Lo que captura el lector</p>
              <p className='text-[11px] text-muted-foreground'>
                {cargando
                  ? 'Consultando...'
                  : hayCaptura
                    ? 'última captura guardada'
                    : 'sin capturas todavía'}
              </p>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='flex flex-col items-center gap-1'>
                {fotoCara ? (
                  // La foto viene en base64 desde la API: next/image no acepta data URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/jpeg;base64,${fotoCara}`}
                    alt='Cara capturada por el lector'
                    className='h-28 w-28 rounded-lg border border-gray-200 dark:border-gray-700 object-cover'
                  />
                ) : (
                  <div className='h-28 w-28 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-muted-foreground'>
                    <ScanFace className='h-6 w-6' />
                    <span className='text-[10px]'>sin cara</span>
                  </div>
                )}
                <span className='text-xs text-muted-foreground'>Cara</span>
              </div>

              <div className='flex flex-col items-center gap-1'>
                {plantillaHuella ? (
                  <div className='h-28 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 overflow-hidden'>
                    <Fingerprint className='h-4 w-4 text-muted-foreground' />
                    <p className='mt-1 font-mono text-[10px] leading-tight break-all'>
                      {plantillaHuella.slice(0, 96)}
                      {plantillaHuella.length > 96 ? '…' : ''}
                    </p>
                    <p className='mt-1 text-[10px] text-muted-foreground'>
                      {plantillaHuella.length} caracteres
                    </p>
                  </div>
                ) : (
                  <div className='h-28 w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-muted-foreground'>
                    <Fingerprint className='h-6 w-6' />
                    <span className='text-[10px]'>sin huella</span>
                  </div>
                )}
                <span className='text-xs text-muted-foreground'>Huella</span>
              </div>
            </div>
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
                    {d.nombre} · {d.ip ? `${d.ip}` : 'sin credenciales'}
                  </option>
                ))}
              </select>
              <div className='flex flex-wrap gap-2 pt-1'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => sincronizar('sync')}
                  disabled={sincronizando !== null}
                >
                  {sincronizando === 'sync' ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-1' />
                  ) : (
                    <RefreshCw className='h-4 w-4 mr-1' />
                  )}
                  Capturar desde el lector
                </Button>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => sincronizar('alta')}
                  disabled={sincronizando !== null}
                >
                  {sincronizando === 'alta' ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-1' />
                  ) : (
                    <UserPlus className='h-4 w-4 mr-1' />
                  )}
                  Dar de alta en el equipo
                </Button>
              </div>
              <p className='text-xs text-muted-foreground'>
                Pasos: 1) la persona se pone frente al lector, 2) &quot;Capturar foto&quot; guarda
                su cara de referencia y 3) &quot;Dar de alta en el equipo&quot; crea la persona y le
                carga esa cara por red (NetSDK), sin usar el menú del equipo.
              </p>
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
                  {typeof resultadoSync.carasEnEquipo === 'number' && (
                    <p>El lector tiene {resultadoSync.carasEnEquipo} cara(s) guardada(s).</p>
                  )}
                </div>
              )}
              {mostrarGuiaAlta && (
                <div className='rounded-lg border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-3 space-y-2'>
                  <p className='text-xs font-semibold text-amber-800 dark:text-amber-300'>
                    Dar de alta en el equipo (sin su menú)
                  </p>
                  {faltaFoto ? (
                    <p className='text-[11px] text-amber-800 dark:text-amber-300'>
                      Falta la foto de referencia: poné a la persona frente al lector y usá
                      «Capturar foto». Después «Dar de alta en el equipo» crea la persona y le carga
                      esa cara por red.
                    </p>
                  ) : (
                    <p className='text-[11px] text-amber-800 dark:text-amber-300'>
                      Usá «Dar de alta en el equipo»: el sistema crea la persona con el código{' '}
                      <strong className='tabular-nums'>{codigoEditado || '—'}</strong> y le carga la
                      cara por red (NetSDK), sin tocar el menú del equipo.
                    </p>
                  )}
                  {sinPuenteSdk && (
                    <p className='text-[11px] text-amber-800 dark:text-amber-300'>
                      Este servidor no tiene disponible el puente NetSDK: cargá la persona en el
                      menú del equipo con estos datos y después usá «Capturar desde el lector».
                    </p>
                  )}
                  <p className='text-[11px] text-amber-800 dark:text-amber-300'>
                    No./ID: <strong className='tabular-nums'>{codigoEditado || '—'}</strong> ·
                    Nombre: <strong>{nombre}</strong>
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => sincronizar('alta')}
                      disabled={sincronizando !== null}
                    >
                      {sincronizando === 'alta' ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-1' />
                      ) : (
                        <UserPlus className='h-4 w-4 mr-1' />
                      )}
                      Dar de alta en el equipo
                    </Button>
                    <Button type='button' size='sm' variant='outline' onClick={copiarDatosEquipo}>
                      <Copy className='h-3.5 w-3.5 mr-1' /> Copiar datos
                    </Button>
                  </div>
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
            {estado?.ultima_verificacion
              ? `Última verificación recibida: ${formatFechaConHora(
                  estado.ultima_verificacion
                )} (${estado.ultimo_resultado}).`
              : 'Todavía no llegó ninguna verificación con este código.'}
          </p>
        </div>

        <DialogFooter className='px-6 py-4 border-t bg-gray-50 dark:bg-slate-900/50'>
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
