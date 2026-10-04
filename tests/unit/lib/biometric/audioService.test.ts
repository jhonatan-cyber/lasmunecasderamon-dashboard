// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import {
  AUDIOS_BIOMETRICOS,
  AUDIOS_PRUEBA,
  AUDIO_ENROLAMIENTO,
  archivoDeClave,
  audioDeResultado,
  carpetaAudios,
  reproducirAudioDeResultado,
  reproducirAudioEquipo,
  reproducirAvisoEnrolamiento
} from '@/modules/asistencia/biometrico/audioService';
import type { NetSdk } from '@/modules/asistencia/biometrico/audioLib';
import type { CredencialesEquipo } from '@/modules/asistencia/biometrico/deviceClient';

/**
 * Tests del servicio de audio: el catálogo de MP3 de `public/audio`, el nombre
 * del archivo por resultado, y que el envío al lector sea SIEMPRE a prueba de
 * fallos (nunca lanza; el flujo de asistencia no depende del sonido).
 *
 * El SDK y el PCM viajan inyectados: acá no se abre el Talk real ni se llama a
 * ffmpeg.
 */

const cred: CredencialesEquipo = { ip: '192.168.0.5', usuario: 'admin', clave: 'secreta' };

/** SDK mínimo cuyo login puede aceptar (777) o rechazar (0). */
function sdkFalso(login = 777): {
  net: NetSdk;
  login: ReturnType<typeof vi.fn>;
  startTalkEx: ReturnType<typeof vi.fn>;
} {
  const loginFn = vi.fn(() => login);
  const startTalkEx = vi.fn(async () => 55);
  const net = {
    login: loginFn,
    setDeviceMode: vi.fn(() => 1),
    startTalkEx,
    talkSendData: vi.fn(async (_t: number, datos: Buffer) => datos.length),
    stopTalkEx: vi.fn(async () => 1),
    logout: vi.fn(),
    getLastError: vi.fn(() => 0)
  } as unknown as NetSdk;
  return { net, login: loginFn, startTalkEx };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('catálogo de audios', () => {
  it('mapea cada resultado de asistencia a su MP3 de public/audio', () => {
    expect(AUDIOS_BIOMETRICOS).toEqual({
      registrado: 'asistenciaRegistrada.mp3',
      duplicado: 'asistenciaYaRegistrada.mp3',
      fuera_ventana: 'horaFinalizada.mp3',
      sin_usuario: 'usuarioNoRegistrado.mp3'
    });
    expect(AUDIO_ENROLAMIENTO).toBe('usuarioRegistrado.mp3');
    expect(audioDeResultado('registrado')).toBe('asistenciaRegistrada.mp3');
    expect(audioDeResultado('duplicado')).toBe('asistenciaYaRegistrada.mp3');
    expect(audioDeResultado('fuera_ventana')).toBe('horaFinalizada.mp3');
    expect(audioDeResultado('sin_usuario')).toBe('usuarioNoRegistrado.mp3');
  });

  it('no inventa audio para resultados sin sonido (usuario_inactivo, basura)', () => {
    expect(audioDeResultado('usuario_inactivo')).toBeNull();
    expect(audioDeResultado('otro')).toBeNull();
    expect(archivoDeClave('enrolamiento')).toBe('usuarioRegistrado.mp3');
    expect(archivoDeClave('nada')).toBeNull();
  });

  it('la carpeta es public/audio y el catálogo apunta a archivos que existen', () => {
    expect(carpetaAudios().endsWith(path.join('public', 'audio'))).toBe(true);

    // Contrato con el repositorio: si alguien renombra un MP3, este test lo dice
    // antes de que el lector quede mudo en la puerta.
    for (const archivo of Object.values(AUDIOS_PRUEBA)) {
      expect(fs.existsSync(path.join(carpetaAudios(), archivo)), `falta ${archivo}`).toBe(true);
    }
  });
});

describe('reproducirAudioEquipo', () => {
  it('envía el PCM al lector y reporta los bytes aceptados', async () => {
    const sdk = sdkFalso();
    const pcm = Buffer.alloc(1600);

    const r = await reproducirAudioEquipo(cred, 'asistenciaRegistrada.mp3', {
      net: sdk.net,
      pcm,
      colaMs: 0
    });

    expect(r).toEqual({ ok: true, enviados: 1600 });
    expect(sdk.login).toHaveBeenCalledWith(cred);
    expect(sdk.startTalkEx).toHaveBeenCalledTimes(1);
  });

  it('un equipo que rechaza el login no lanza: devuelve ok=false con el motivo', async () => {
    const sdk = sdkFalso(0);

    const r = await reproducirAudioEquipo(cred, 'asistenciaRegistrada.mp3', {
      net: sdk.net,
      pcm: Buffer.alloc(800),
      colaMs: 0
    });

    expect(r.ok).toBe(false);
    expect(r.error).toContain('CLIENT_LoginEx2');
  });

  it('un audio que no está en public/audio se reporta sin tocar el equipo', async () => {
    const sdk = sdkFalso();

    const r = await reproducirAudioEquipo(cred, 'noExiste.mp3', { net: sdk.net });

    expect(r.ok).toBe(false);
    expect(r.error).toContain('No existe el audio');
    expect(sdk.login).not.toHaveBeenCalled();
  });

  it('rechaza nombres con path traversal (el audio sale solo de public/audio)', async () => {
    const sdk = sdkFalso();

    const r = await reproducirAudioEquipo(cred, '../secretos.mp3', { net: sdk.net });

    expect(r.ok).toBe(false);
    expect(r.error).toContain('inválido');
    expect(sdk.login).not.toHaveBeenCalled();
  });

  it('si el Talk falla a mitad de envío igual devuelve ok=false (nunca lanza)', async () => {
    const sdk = sdkFalso();
    sdk.startTalkEx.mockResolvedValue(0);

    const r = await reproducirAudioEquipo(cred, 'asistenciaRegistrada.mp3', {
      net: sdk.net,
      pcm: Buffer.alloc(800),
      colaMs: 0
    });

    expect(r.ok).toBe(false);
    expect(r.error).toContain('CLIENT_StartTalkEx');
  });
});

describe('atajos por resultado y enrolamiento', () => {
  it('reproducirAudioDeResultado mapea el resultado a su archivo', async () => {
    const sdk = sdkFalso();

    const r = await reproducirAudioDeResultado(cred, 'duplicado', {
      net: sdk.net,
      pcm: Buffer.alloc(800),
      colaMs: 0
    });

    expect(r).toEqual({ ok: true, enviados: 800 });
  });

  it('un resultado sin audio no llama al equipo', async () => {
    const sdk = sdkFalso();

    const r = await reproducirAudioDeResultado(cred, 'usuario_inactivo', { net: sdk.net });

    expect(r.ok).toBe(false);
    expect(r.error).toContain('usuario_inactivo');
    expect(sdk.login).not.toHaveBeenCalled();
  });

  it('el aviso de enrolamiento envía su propio audio', async () => {
    const sdk = sdkFalso();

    const r = await reproducirAvisoEnrolamiento(cred, {
      net: sdk.net,
      pcm: Buffer.alloc(400),
      colaMs: 0
    });

    expect(r).toEqual({ ok: true, enviados: 400 });
  });
});
