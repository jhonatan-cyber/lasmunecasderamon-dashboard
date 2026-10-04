import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { query } from '@/lib/database/db';
import { descifrarSecreto } from './credencialesCrypto';

const viewers = new Map<string, number>();

export async function openVideoStream(deviceId: string, signal: AbortSignal): Promise<Response> {
  const [device] = await query<{ ip: string; usuario_equipo: string; clave_cifrada: string }[]>(
    `SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices
     WHERE id = ? AND revocado_en IS NULL`,
    [deviceId]
  );
  if (!device?.ip || !device.usuario_equipo || !device.clave_cifrada) {
    return Response.json({ message: 'El lector no tiene conexión configurada.' }, { status: 404 });
  }
  if ((viewers.get(deviceId) ?? 0) >= 3) {
    return Response.json(
      { message: 'El lector ya tiene tres vistas de video abiertas.' },
      { status: 429 }
    );
  }
  const binary = process.env.BIOMETRIC_FFMPEG_PATH || ffmpegPath;
  if (!binary) return Response.json({ message: 'FFmpeg no está disponible.' }, { status: 503 });
  if (signal.aborted) return new Response(null, { status: 499 });

  const url = new URL(`rtsp://${device.ip}:554/cam/realmonitor?channel=1&subtype=0`);
  url.username = device.usuario_equipo;
  url.password = descifrarSecreto(device.clave_cifrada);
  const child = spawn(
    binary,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostdin',
      '-rtsp_transport',
      'tcp',
      '-timeout',
      '5000000',
      '-i',
      url.href,
      '-an',
      '-vf',
      'fps=15,scale=640:-2',
      '-c:v',
      'mjpeg',
      '-q:v',
      '5',
      '-threads',
      '1',
      '-f',
      'mpjpeg',
      '-boundary_tag',
      'frame',
      '-flush_packets',
      '1',
      'pipe:1'
    ],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
  );
  viewers.set(deviceId, (viewers.get(deviceId) ?? 0) + 1);
  let done = false;
  let cancelled = false;
  let watchdog: ReturnType<typeof setTimeout>;
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const stop = () => {
    if (done) return;
    done = true;
    clearTimeout(watchdog);
    signal.removeEventListener('abort', stop);
    child.stdout.destroy();
    child.kill();
    const remaining = (viewers.get(deviceId) ?? 1) - 1;
    if (remaining) viewers.set(deviceId, remaining);
    else viewers.delete(deviceId);
    if (!cancelled) controller.close();
  };
  const body = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
      watchdog = setTimeout(stop, 15000);
      signal.addEventListener('abort', stop, { once: true });
      child.on('error', stop);
      child.on('close', stop);
      child.stdout.on('error', stop);
      child.stdout.on('data', (chunk: Buffer) => {
        if (done) return;
        clearTimeout(watchdog);
        watchdog = setTimeout(stop, 10000);
        controller.enqueue(new Uint8Array(chunk));
        if ((controller.desiredSize ?? 0) <= 0) child.stdout.pause();
      });
      if (signal.aborted) stop();
    },
    pull() {
      child.stdout.resume();
    },
    cancel() {
      cancelled = true;
      stop();
    }
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
}
