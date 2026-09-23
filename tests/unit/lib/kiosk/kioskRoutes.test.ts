// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ device: null as string | null, configured: true }));
const db = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'generado'
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
  return { logger: mocks, default: mocks };
});

vi.mock('@/lib/kiosk/deviceAuth', () => ({
  KIOSK_COOKIE: 'kiosk_token',
  KIOSK_SESSION_MAX_AGE: 2_592_000,
  kioskCookieOptions: (maxAge: number) => ({ httpOnly: true, sameSite: 'strict', maxAge }),
  getKioskDevice: async () => auth.device,
  isKioskConfigured: () => auth.configured,
  matchesDeviceSecret: (candidate: unknown) => candidate === 'secreto-valido-123456',
  createDeviceToken: async (id: string) => `token-de-${id}`,
  logKioskEvent: vi.fn()
}));

vi.mock('@/lib/business/codigoService', () => ({
  getOrCreateAttendanceCode: async () => '4821',
  regenerateAttendanceCode: async () => '9999'
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 22:15:00'
}));

vi.mock('@/lib/kiosk/attendanceChallenges', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kiosk/attendanceChallenges')>(
    '@/lib/kiosk/attendanceChallenges'
  );
  return {
    ...actual,
    issueChallenge: vi.fn(async () => ({
      token: 'desafio-de-un-solo-uso',
      expiraEn: '2026-04-11T22:17:00.000Z',
      ttlSegundos: 120
    }))
  };
});

import { GET as kioskSessionGet, POST as kioskSessionPost } from '@/app/api/kiosk/session/route';
import { GET as kioskBoardGet } from '@/app/api/kiosk/board/route';
import { POST as kioskChallengePost } from '@/app/api/kiosk/attendance/challenge/route';
import { GET as publicUsersGet } from '@/app/api/public/users/route';
import { KIOSK_DEVICE_APIS, PUBLIC_PATHS } from '@/lib/middleware/proxy-routes';

const postJson = (body: unknown) =>
  new Request('http://localhost/api/kiosk/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

beforeEach(() => {
  auth.device = null;
  auth.configured = true;
  db.queryMock.mockReset();
  db.queryMock.mockResolvedValue([]);
});

describe('provision de la pantalla del local', () => {
  it('informa si el servidor esta configurado y si esta pantalla ya esta vinculada', async () => {
    const sinVincular = await (await kioskSessionGet()).json();
    expect(sinVincular).toEqual({ success: true, configurado: true, vinculado: false });

    auth.device = 'pantalla-1';
    const vinculada = await (await kioskSessionGet()).json();
    expect(vinculada.vinculado).toBe(true);
  });

  it('rechaza un secreto que no es el del local, sin dejar credencial', async () => {
    const respuesta = await kioskSessionPost(postJson({ secret: 'lo-que-sea-123456789' }));

    expect(respuesta.status).toBe(401);
    expect(respuesta.headers.get('set-cookie')).toBeNull();
  });

  it('vincula la pantalla cuando el secreto es correcto', async () => {
    const respuesta = await kioskSessionPost(postJson({ secret: 'secreto-valido-123456' }));

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).deviceId).toBeTruthy();
    const cookie = respuesta.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('kiosk_token=');
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('dice que no esta configurado en vez de aceptar cualquier secreto', async () => {
    auth.configured = false;

    const respuesta = await kioskSessionPost(postJson({ secret: 'secreto-valido-123456' }));

    expect(respuesta.status).toBe(503);
    expect((await respuesta.json()).code).toBe('KIOSK_NOT_CONFIGURED');
  });
});

describe('el tablero y los desafios exigen una pantalla vinculada', () => {
  it('/api/kiosk/board responde 401 sin credencial de dispositivo', async () => {
    const respuesta = await kioskBoardGet();

    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).code).toBe('KIOSK_NOT_LINKED');
    expect(db.queryMock).not.toHaveBeenCalled();
  });

  it('/api/kiosk/attendance/challenge responde 401 sin credencial de dispositivo', async () => {
    const respuesta = await kioskChallengePost(postJson({ userId: 'u-1' }));

    expect(respuesta.status).toBe(401);
    expect(db.queryMock).not.toHaveBeenCalled();
  });

  it('/api/kiosk/attendance/challenge emite el desafio con una pantalla vinculada', async () => {
    auth.device = 'pantalla-1';
    db.queryMock.mockResolvedValue([{ id_usuario: 'u-1' }]);

    const respuesta = await kioskChallengePost(postJson({ userId: 'u-1' }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.data.token).toBe('desafio-de-un-solo-uso');
  });

  it('el tablero no devuelve ninguna credencial personal', async () => {
    auth.device = 'pantalla-1';
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) {
        return [
          {
            id: 'u-1',
            nombre: 'Ana',
            apellido: 'Perez',
            nick: 'ana',
            foto: 'default.png',
            rol: 'Anfitriona',
            // Campos que un descuido podria arrastrar al JSON: no deben salir.
            qr_token: 'credencial-secreta',
            password: 'hash-secreto'
          }
        ];
      }
      return [];
    });

    const respuesta = await kioskBoardGet();
    const texto = JSON.stringify(await respuesta.json());

    expect(texto).not.toContain('credencial-secreta');
    expect(texto).not.toContain('hash-secreto');
    expect(texto).not.toContain('qr_token');
    expect(texto).toContain('"codigo":"4821"');
  });
});

describe('el padron publico ya no publica credenciales', () => {
  it('devuelve contacto, no el qr_token ni el codigo del local', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) {
        return [
          {
            id: 'u-1',
            nombre: 'Ana',
            apellido: 'Perez',
            nick: 'ana',
            foto: 'ana.jpg',
            role: 'Anfitriona',
            qr_token: 'credencial-secreta',
            codigo: '4821'
          }
        ];
      }
      return [];
    });

    const respuesta = await publicUsersGet();
    const texto = JSON.stringify(await respuesta.json());

    expect(respuesta.status).toBe(200);
    expect(texto).not.toContain('credencial-secreta');
    expect(texto).not.toContain('qr_token');
    expect(texto).not.toContain('4821');
    expect(texto).toContain('"nick":"ana"');

    // Y no consulta ninguna tabla de codigos ni columnas de credencial.
    for (const call of db.queryMock.mock.calls) {
      const sql = String(call[0]);
      expect(sql).not.toMatch(/qr_token|codigos/i);
    }
  });
});

describe('la politica del middleware coincide con las rutas', () => {
  it('el stream del personal no esta entre las rutas publicas', () => {
    expect(PUBLIC_PATHS).not.toContain('/api/notifications/sse');
    expect(PUBLIC_PATHS).not.toContain('/api/kiosk');
  });

  it('la pantalla del local es una categoria de credencial propia, no una ruta publica', () => {
    expect(KIOSK_DEVICE_APIS).toContain('/api/kiosk');
    expect(KIOSK_DEVICE_APIS).toContain('/api/notifications/kiosk');
    for (const ruta of KIOSK_DEVICE_APIS) {
      expect(PUBLIC_PATHS).not.toContain(ruta);
    }
  });
});
