'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, CameraOff, Loader2, Pause, Play, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Candidato {
  usuarioId: string;
  nombre: string;
  run: string | null;
  codigo: string | null;
  similitud: number;
}

interface Resultado {
  umbral: number;
  evaluados: number;
  mejor: Candidato | null;
  candidatos: Candidato[];
}

function porcentaje(valor: number) {
  return `${Math.round(valor * 100)}%`;
}

export default function PruebaBiometricaPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analizandoRef = useRef(false);

  const [activo, setActivo] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<string | null>(null);

  const enviar = useCallback(async (base64: string) => {
    if (analizandoRef.current) return;
    analizandoRef.current = true;
    setAnalizando(true);
    try {
      const res = await fetch('/api/biometrico/identificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto: base64 })
      });
      const json = await res.json().catch(() => null);
      if (!json?.success) {
        setError(json?.message || 'No se pudo analizar la imagen.');
        setResultado(null);
      } else {
        setError(null);
        setResultado(json.data as Resultado);
        setActualizado(new Date().toLocaleTimeString('es-CL'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    } finally {
      analizandoRef.current = false;
      setAnalizando(false);
    }
  }, []);

  const capturarYAnalizar = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    const ancho = 480;
    const alto = Math.round((video.videoHeight / video.videoWidth) * ancho);
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, ancho, alto);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    await enviar(dataUrl.slice(dataUrl.indexOf(',') + 1));
  }, [enviar]);

  const activar = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActivo(true);
      setError(null);
    } catch (e) {
      setError(
        'No se pudo abrir la cámara: ' +
          (e instanceof Error ? e.message : String(e)) +
          '. Desde el teléfono por HTTP usá "Tomar foto".'
      );
    }
  }, []);

  const detener = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActivo(false);
  }, []);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    },
    []
  );

  useEffect(() => {
    if (!activo || pausado) return;
    const id = window.setInterval(() => {
      void capturarYAnalizar();
    }, 1500);
    return () => window.clearInterval(id);
  }, [activo, pausado, capturarYAnalizar]);

  const subirArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      const url = String(lector.result || '');
      void enviar(url.slice(url.indexOf(',') + 1));
    };
    lector.readAsDataURL(archivo);
  };

  const reconocido = resultado?.mejor ? resultado.mejor.similitud >= resultado.umbral : false;

  return (
    <main className='mx-auto w-full max-w-3xl px-4 py-6'>
      <div className='mb-6 flex items-center gap-3'>
        <Link
          href='/users'
          className='inline-flex h-9 w-9 items-center justify-center rounded-full border text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
          aria-label='Volver a usuarios'
        >
          <ArrowLeft className='h-4 w-4' />
        </Link>
        <div>
          <h1 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
            Prueba de reconocimiento facial
          </h1>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Poné a la persona frente a la cámara: se compara contra las plantillas guardadas y dice
            a quién reconoce, o si no coincide con nadie.
          </p>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='overflow-hidden rounded-xl border bg-slate-900'>
          <video ref={videoRef} playsInline muted className='h-64 w-full object-cover' />
          <canvas ref={canvasRef} className='hidden' />
        </div>

        <div
          className={`rounded-xl border p-4 ${
            !resultado
              ? 'bg-gray-50 dark:bg-slate-900/60'
              : reconocido
                ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40'
                : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
          }`}
        >
          {analizando && !resultado ? (
            <div className='flex h-full items-center justify-center gap-2 text-gray-600 dark:text-gray-300'>
              <Loader2 className='h-4 w-4 animate-spin' /> Analizando…
            </div>
          ) : error ? (
            <div className='space-y-1'>
              <p className='text-sm font-semibold text-red-700 dark:text-red-300'>Sin resultado</p>
              <p className='text-sm text-red-700/90 dark:text-red-300/90'>{error}</p>
            </div>
          ) : resultado?.mejor ? (
            <div className='space-y-2'>
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  reconocido
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {reconocido ? 'Usuario reconocido' : 'No coincide con nadie'}
              </p>
              <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                {resultado.mejor.nombre}
              </p>
              <p className='text-sm text-gray-700 dark:text-gray-300'>
                Similitud {porcentaje(resultado.mejor.similitud)} · mínimo{' '}
                {porcentaje(resultado.umbral)}
              </p>
              <p className='text-sm text-gray-700 dark:text-gray-300'>
                {resultado.mejor.run ? `RUN ${resultado.mejor.run}` : 'Sin RUN'}
                {resultado.mejor.codigo ? ` · código ${resultado.mejor.codigo}` : ''}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {resultado.evaluados} plantilla(s) comparadas
                {actualizado ? ` · ${actualizado}` : ''}
              </p>
            </div>
          ) : (
            <div className='flex h-full items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400'>
              Activá la cámara y poné a la persona de frente.
            </div>
          )}
        </div>
      </div>

      <div className='mt-4 flex flex-wrap items-center gap-2'>
        {!activo ? (
          <Button onClick={activar} className='gap-2'>
            <Camera className='h-4 w-4' /> Activar cámara
          </Button>
        ) : (
          <Button onClick={detener} variant='secondary' className='gap-2'>
            <CameraOff className='h-4 w-4' /> Detener cámara
          </Button>
        )}
        <Button
          onClick={() => setPausado(p => !p)}
          variant='outline'
          disabled={!activo}
          className='gap-2'
        >
          {pausado ? <Play className='h-4 w-4' /> : <Pause className='h-4 w-4' />}
          {pausado ? 'Reanudar' : 'Pausar'}
        </Button>
        <Button
          onClick={() => void capturarYAnalizar()}
          variant='outline'
          disabled={!activo || analizando}
          className='gap-2'
        >
          <ScanFace className='h-4 w-4' /> Analizar ahora
        </Button>
        <Label
          htmlFor='foto-camara'
          className='inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800'
        >
          <Camera className='h-4 w-4' /> Tomar foto
        </Label>
        <Input
          id='foto-camara'
          type='file'
          accept='image/*'
          capture='user'
          onChange={subirArchivo}
          className='hidden'
        />
      </div>

      {resultado && resultado.candidatos.length > 0 ? (
        <div className='mt-6 rounded-xl border p-4'>
          <h2 className='mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200'>
            Mejores coincidencias
          </h2>
          <ul className='space-y-2'>
            {resultado.candidatos.map(c => (
              <li key={c.usuarioId} className='flex items-center gap-3 text-sm'>
                <span className='w-40 truncate text-gray-700 dark:text-gray-300'>{c.nombre}</span>
                <span className='h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800'>
                  <span
                    className={`block h-full ${
                      c.similitud >= resultado.umbral ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${Math.max(2, Math.min(100, c.similitud * 100))}%` }}
                  />
                </span>
                <span className='w-12 text-right tabular-nums text-gray-600 dark:text-gray-400'>
                  {porcentaje(c.similitud)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className='mt-6 text-xs text-gray-500 dark:text-gray-400'>
        Compara con el motor por software (ONNX) usando las fotos guardadas en el enrolamiento. No
        registra asistencia ni abre puertas: es solo diagnóstico. El umbral se ajusta con{' '}
        <code>BIOMETRIC_FACE_MATCH_THRESHOLD</code>.
      </p>
    </main>
  );
}
