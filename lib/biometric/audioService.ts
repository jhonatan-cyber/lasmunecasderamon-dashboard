import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import ffmpegPath from 'ffmpeg-static';
import { reproducirAudio, RATE_TALK_HZ, type NetSdk, type OpcionesEnvio } from './audioLib';
import { conectarSdk } from './audioSdk';
import logger from '@/lib/utils/logger';
import type { CredencialesEquipo } from './deviceClient';

const ejecutar = promisify(execFile);

export const AUDIOS_BIOMETRICOS = {
  registrado: 'asistenciaRegistrada.mp3',
  duplicado: 'asistenciaYaRegistrada.mp3',
  fuera_ventana: 'horaFinalizada.mp3',
  sin_usuario: 'usuarioNoRegistrado.mp3'
} as const;

export const AUDIO_ENROLAMIENTO = 'usuarioRegistrado.mp3';
export const AUDIOS_PRUEBA = {
  ...AUDIOS_BIOMETRICOS,
  enrolamiento: AUDIO_ENROLAMIENTO
} as const;

export type ClaveAudio = keyof typeof AUDIOS_PRUEBA;
export function audioDeResultado(resultado: string): string | null {
  return (AUDIOS_BIOMETRICOS as Record<string, string>)[resultado] ?? null;
}

export function archivoDeClave(clave: string): string | null {
  return (AUDIOS_PRUEBA as Record<string, string>)[clave] ?? null;
}

export function carpetaAudios(): string {
  return path.join(process.cwd(), 'public', 'audio');
}

function rutaAudio(nombreAudio: string): string {
  if (nombreAudio.includes('/') || nombreAudio.includes('\\') || nombreAudio.includes('..')) {
    throw new Error(`Nombre de audio inválido: ${nombreAudio}`);
  }
  const ruta = path.join(carpetaAudios(), nombreAudio);
  if (!fs.existsSync(ruta)) {
    throw new Error(`No existe el audio "${nombreAudio}" en ${carpetaAudios()}.`);
  }
  return ruta;
}

async function pcmDesdeMp3(ruta: string): Promise<Buffer> {
  const ffmpeg = process.env.BIOMETRIC_FFMPEG_PATH || ffmpegPath;
  if (!ffmpeg) throw new Error('ffmpeg no está disponible (ffmpeg-static).');
  const { stdout } = await ejecutar(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      ruta,
      '-ac',
      '1',
      '-ar',
      String(RATE_TALK_HZ),
      '-f',
      's16le',
      'pipe:1'
    ],
    { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, windowsHide: true }
  );
  const pcm = stdout as unknown as Buffer;
  if (!pcm || pcm.length === 0) {
    throw new Error(`ffmpeg no produjo PCM para ${path.basename(ruta)}.`);
  }
  return pcm;
}

export interface ResultadoAudio {
  ok: boolean;
  enviados?: number;
  error?: string;
}

export async function reproducirAudioEquipo(
  credenciales: CredencialesEquipo,
  nombreAudio: string,
  opciones: { net?: NetSdk; pcm?: Buffer } & OpcionesEnvio = {}
): Promise<ResultadoAudio> {
  try {
    const net = opciones.net ?? (await conectarSdk());
    const pcm = opciones.pcm ?? (await pcmDesdeMp3(rutaAudio(nombreAudio)));
    const { enviados } = await reproducirAudio(net, credenciales, pcm, opciones);
    logger.info('[biometric-audio] Audio enviado al lector', {
      ip: credenciales.ip,
      audio: nombreAudio,
      enviados
    });
    return { ok: true, enviados };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.warn('[biometric-audio] No se pudo enviar el audio al lector', {
      ip: credenciales.ip,
      audio: nombreAudio,
      error: mensaje
    });
    return { ok: false, error: mensaje };
  }
}

export async function reproducirAudioDeResultado(
  credenciales: CredencialesEquipo,
  resultado: string,
  opciones: { net?: NetSdk; pcm?: Buffer } & OpcionesEnvio = {}
): Promise<ResultadoAudio> {
  const archivo = audioDeResultado(resultado);
  if (!archivo) return { ok: false, error: `Sin audio para el resultado "${resultado}".` };
  return reproducirAudioEquipo(credenciales, archivo, opciones);
}

export async function reproducirAvisoEnrolamiento(
  credenciales: CredencialesEquipo,
  opciones: { net?: NetSdk; pcm?: Buffer } & OpcionesEnvio = {}
): Promise<ResultadoAudio> {
  return reproducirAudioEquipo(credenciales, AUDIO_ENROLAMIENTO, opciones);
}
