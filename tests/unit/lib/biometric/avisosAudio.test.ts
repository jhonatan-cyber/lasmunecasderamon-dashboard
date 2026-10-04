// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de los avisos sonoros disparados desde el sistema: resolución de
 * credenciales, mapeo resultado→audio, tolerancia total a fallos y cola por
 * equipo (el Talk del lector admite una sesión a la vez).
 *
 * El envío real (`audioService`) se mockea: acá se prueba la conexión con el
 * flujo, no el protocolo.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const cliente = vi.hoisted(() => ({ credencialesDeFila: vi.fn() }));
const audio = vi.hoisted(() => ({
  audioDeResultado: vi.fn(),
  reproducirAudioDeResultado: vi.fn(),
  reproducirAvisoEnrolamiento: vi.fn(),
  AUDIO_ENROLAMIENTO: 'usuarioRegistrado.mp3'
}));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/modules/asistencia/biometrico/deviceClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/deviceClient')>();
  return { ...actual, ...cliente };
});

vi.mock('@/modules/asistencia/biometrico/audioService', () => audio);

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import {
  avisarEnrolamientoEnEquipo,
  avisarResultadoEnEquipo
} from '@/modules/asistencia/biometrico/avisosAudio';
import type { CredencialesEquipo } from '@/modules/asistencia/biometrico/deviceClient';

const cred: CredencialesEquipo = { ip: '192.168.0.5', usuario: 'admin', clave: 'secreta' };
const fila = { ip: '192.168.0.5', usuario_equipo: 'admin', clave_cifrada: 'a.b.c' };

/** Drena las microtareas de la cola. */
const fluir = async (veces = 20) => {
  for (let i = 0; i < veces; i++) await Promise.resolve();
};

beforeEach(() => {
  // Por defecto el rate-limit queda apagado: la mayoría de tests necesita
  // enviar todos los avisos que dispare. Los de rate-limit lo encienden.
  process.env.BIOMETRIC_AUDIO_COOLDOWN_MS = '0';
  db.queryMock.mockReset().mockResolvedValue([fila]);
  cliente.credencialesDeFila.mockReset().mockReturnValue(cred);
  audio.audioDeResultado
    .mockReset()
    .mockImplementation((resultado: string) =>
      resultado === 'registrado' ? 'asistenciaRegistrada.mp3' : null
    );
  audio.reproducirAudioDeResultado.mockReset().mockResolvedValue({ ok: true, enviados: 800 });
  audio.reproducirAvisoEnrolamiento.mockReset().mockResolvedValue({ ok: true, enviados: 400 });
});

describe('avisarResultadoEnEquipo', () => {
  it('resuelve las credenciales del equipo y manda su audio', async () => {
    await avisarResultadoEnEquipo('dev-1', 'registrado');

    expect(db.queryMock).toHaveBeenCalledWith(expect.stringContaining('FROM biometric_devices'), [
      'dev-1'
    ]);
    expect(cliente.credencialesDeFila).toHaveBeenCalledWith(fila);
    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledWith(cred, 'registrado');
  });

  it('un resultado sin audio no consulta ni envía nada', async () => {
    await avisarResultadoEnEquipo('dev-1', 'usuario_inactivo');

    expect(db.queryMock).not.toHaveBeenCalled();
    expect(audio.reproducirAudioDeResultado).not.toHaveBeenCalled();
  });

  it('sin credenciales no envía y no lanza', async () => {
    cliente.credencialesDeFila.mockReturnValue(null);

    await expect(avisarResultadoEnEquipo('dev-1', 'registrado')).resolves.toBeUndefined();

    expect(audio.reproducirAudioDeResultado).not.toHaveBeenCalled();
  });

  it('con credenciales ya cargadas se ahorra la consulta a la DB', async () => {
    await avisarResultadoEnEquipo('dev-1', 'registrado', { credenciales: cred });

    expect(db.queryMock).not.toHaveBeenCalled();
    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledWith(cred, 'registrado');
  });

  it('una DB caída no se propaga: el aviso es un extra, no el registro', async () => {
    db.queryMock.mockRejectedValue(new Error('db caída'));

    await expect(avisarResultadoEnEquipo('dev-1', 'registrado')).resolves.toBeUndefined();

    expect(audio.reproducirAudioDeResultado).not.toHaveBeenCalled();
  });

  it('un envío que revienta tampoco se propaga', async () => {
    audio.reproducirAudioDeResultado.mockRejectedValue(new Error('talk ocupado'));

    await expect(avisarResultadoEnEquipo('dev-1', 'registrado')).resolves.toBeUndefined();
  });
});

describe('avisarEnrolamientoEnEquipo', () => {
  it('usa las credenciales del equipo para el acuse «usuario registrado»', async () => {
    await avisarEnrolamientoEnEquipo('dev-1');

    expect(audio.reproducirAvisoEnrolamiento).toHaveBeenCalledWith(cred);
  });

  it('con credenciales del llamador va directo al envío', async () => {
    await avisarEnrolamientoEnEquipo('dev-1', { credenciales: cred });

    expect(db.queryMock).not.toHaveBeenCalled();
    expect(audio.reproducirAvisoEnrolamiento).toHaveBeenCalledWith(cred);
  });

  it('un equipo revocado o inexistente no rompe el alta', async () => {
    db.queryMock.mockResolvedValue([]);

    await expect(avisarEnrolamientoEnEquipo('dev-1')).resolves.toBeUndefined();

    expect(audio.reproducirAvisoEnrolamiento).not.toHaveBeenCalled();
  });
});

describe('rate-limit por equipo y audio', () => {
  beforeEach(() => {
    process.env.BIOMETRIC_AUDIO_COOLDOWN_MS = '30000';
  });

  afterEach(() => {
    delete process.env.BIOMETRIC_AUDIO_COOLDOWN_MS;
  });

  it('el mismo audio en el mismo equipo no se repite dentro de la ventana', async () => {
    await avisarResultadoEnEquipo('dev-rl-1', 'registrado');
    await avisarResultadoEnEquipo('dev-rl-1', 'registrado');

    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledTimes(1);
  });

  it('pasada la ventana vuelve a sonar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      await avisarResultadoEnEquipo('dev-rl-2', 'registrado');
      vi.advanceTimersByTime(30_001);
      await avisarResultadoEnEquipo('dev-rl-2', 'registrado');
    } finally {
      vi.useRealTimers();
    }

    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledTimes(2);
  });

  it('audios distintos en el mismo equipo no se truncan entre sí', async () => {
    audio.audioDeResultado.mockImplementation((resultado: string) =>
      resultado === 'registrado' ? 'asistenciaRegistrada.mp3' : 'asistenciaYaRegistrada.mp3'
    );

    await avisarResultadoEnEquipo('dev-rl-3', 'registrado');
    await avisarResultadoEnEquipo('dev-rl-3', 'duplicado');

    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledTimes(2);
  });

  it('la ventana es POR EQUIPO: dos letores suenan en paralelo', async () => {
    await avisarResultadoEnEquipo('dev-rl-4', 'registrado');
    await avisarResultadoEnEquipo('dev-rl-5', 'registrado');

    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledTimes(2);
  });

  it('el aviso de enrolamiento también respeta la ventana', async () => {
    await avisarEnrolamientoEnEquipo('dev-rl-6');
    await avisarEnrolamientoEnEquipo('dev-rl-6');

    expect(audio.reproducirAvisoEnrolamiento).toHaveBeenCalledTimes(1);
  });
});

describe('cola por equipo', () => {
  it('serializa los avisos del mismo equipo: el segundo suena al terminar el primero', async () => {
    const pendientes: Array<(r: { ok: boolean; enviados: number }) => void> = [];
    audio.reproducirAudioDeResultado.mockImplementation(
      () => new Promise(resolve => pendientes.push(resolve))
    );

    const primero = avisarResultadoEnEquipo('dev-1', 'registrado');
    const segundo = avisarResultadoEnEquipo('dev-1', 'registrado');
    await fluir();

    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledTimes(1);

    pendientes[0]!({ ok: true, enviados: 800 });
    await fluir();

    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledTimes(2);

    pendientes[1]!({ ok: true, enviados: 800 });
    await Promise.all([primero, segundo]);
  });

  it('la cola es POR EQUIPO: un equipo lento no demora al otro', async () => {
    db.queryMock.mockImplementation(async (_sql: string, params?: unknown[]) =>
      params?.[0] === 'dev-1'
        ? [{ ip: '192.168.0.5', usuario_equipo: 'admin', clave_cifrada: 'a.b.c' }]
        : [{ ip: '192.168.0.6', usuario_equipo: 'admin', clave_cifrada: 'd.e.f' }]
    );
    cliente.credencialesDeFila.mockImplementation((f: { ip: string }) => ({
      ip: f.ip,
      usuario: 'admin',
      clave: 'x'
    }));
    audio.reproducirAudioDeResultado.mockImplementation((c: CredencialesEquipo) =>
      c.ip === '192.168.0.5'
        ? new Promise(() => {}) // dev-1 colgado a propósito
        : Promise.resolve({ ok: true, enviados: 800 })
    );

    void avisarResultadoEnEquipo('dev-1', 'registrado');

    await expect(avisarResultadoEnEquipo('dev-2', 'registrado')).resolves.toBeUndefined();
    expect(audio.reproducirAudioDeResultado).toHaveBeenCalledTimes(2);
  });
});
