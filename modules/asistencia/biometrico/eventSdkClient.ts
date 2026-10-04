import { spawn } from 'node:child_process';
import path from 'node:path';
import type { CredencialesEquipo } from './deviceClient';

interface OpcionesSdk {
  signal: AbortSignal;
  onAviso: () => void;
  onError: (error: Error) => void;
}

/** Dahua publica el NetSDK sólo para Windows (dhnetsdk.dll) y Linux (libdhnetsdk.so). */
const PLATAFORMAS_NETSDK = new Set(['win32', 'linux']);

export function abrirAvisosSdk(
  credenciales: CredencialesEquipo,
  opciones: OpcionesSdk
): Promise<void> {
  if (!PLATAFORMAS_NETSDK.has(process.platform) || process.env.BIOMETRIC_EVENTS_SDK === 'false') {
    return Promise.reject(new Error('NetSDK de eventos no disponible en este servidor'));
  }
  if (opciones.signal.aborted) return Promise.reject(new Error('Suscripción cancelada'));
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(process.cwd(), 'scripts/biometric-events-sdk.cjs')],
      {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'ignore']
      }
    );
    let ready = false;
    let stopped = false;
    let buffer = '';
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout>;
    const stop = () => finish(new Error('Suscripción NetSDK cancelada'));
    const finish = (error: Error) => {
      if (stopped) return;
      stopped = true;
      clearTimeout(watchdog);
      opciones.signal.removeEventListener('abort', stop);
      if (!child.stdin.destroyed) child.stdin.end('stop\n');
      killTimer = setTimeout(() => child.kill(), 2000);
      killTimer.unref();
      if (!ready) reject(error);
      else if (!opciones.signal.aborted) opciones.onError(error);
    };
    watchdog = setTimeout(() => finish(new Error('NetSDK no respondió al suscribirse')), 15000);
    opciones.signal.addEventListener('abort', stop, { once: true });
    child.on('error', () => finish(new Error('No se pudo iniciar el proceso NetSDK')));
    child.stdin.on('error', () => finish(new Error('Se cerró el proceso NetSDK')));
    child.on('close', () => {
      finish(new Error('Se cerró la suscripción NetSDK'));
      clearTimeout(killTimer);
    });
    child.stdout.on('data', (chunk: Buffer) => {
      if (stopped) return;
      buffer += chunk.toString('utf8');
      if (buffer.length > 16384) return finish(new Error('Respuesta NetSDK inválida'));
      let end: number;
      while ((end = buffer.indexOf('\n')) >= 0 && !stopped) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        try {
          const message = JSON.parse(line);
          if (!['ready', 'heartbeat', 'event', 'disconnected', 'error'].includes(message.type)) {
            return finish(new Error('Mensaje NetSDK desconocido'));
          }
          if (message.type === 'error' || message.type === 'disconnected') {
            return finish(new Error('El lector interrumpió la suscripción NetSDK'));
          }
          clearTimeout(watchdog);
          watchdog = setTimeout(() => finish(new Error('NetSDK dejó de responder')), 15000);
          if (message.type === 'ready') {
            ready = true;
            resolve();
          }
          if (message.type === 'event') opciones.onAviso();
        } catch {
          finish(new Error('No se pudo interpretar el aviso NetSDK'));
        }
      }
    });
    child.stdin.write(JSON.stringify(credenciales) + '\n');
    if (opciones.signal.aborted) stop();
  });
}
