// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  device: null as string | null,
  user: null as any,
  token: 'kiosk_opaque',
  provision: vi.fn(),
  renew: vi.fn(),
  list: vi.fn(),
  revoke: vi.fn()
}));
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
  provisionDevice: auth.provision,
  renewDevice: auth.renew,
  revokeDevice: auth.revoke,
  listDevices: auth.list,
  logKioskEvent: vi.fn()
}));

vi.mock('@/lib/auth/auth-app', () => ({ getAuth: async () => auth.user }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: auth.token }) }) }));
vi.mock('@/lib/services/AuditService', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));
vi.mock('@/lib/services/ErrorLogService', () => ({
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
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

import {
  GET as kioskSessionGet,
  POST as kioskSessionPost,
  PATCH as kioskSessionPatch
} from '@/app/api/kiosk/session/route';
import { GET as devicesGet } from '@/app/api/kiosk/devices/route';
import { DELETE as deviceDelete } from '@/app/api/kiosk/devices/[id]/route';
import { GET as kioskBoardGet } from '@/app/api/kiosk/board/route';
import { POST as kioskChallengePost } from '@/app/api/kiosk/attendance/challenge/route';
import { GET as publicUsersGet } from '@/app/api/public/users/route';
import { KIOSK_DEVICE_APIS, PUBLIC_PATHS } from '@/lib/constants/route-permissions';

const postJson = (body: unknown) =>
  new Request('http://localhost/api/kiosk/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

beforeEach(() => {
  auth.device = null;
  auth.user = null;
  auth.provision.mockReset().mockResolvedValue({ id: 'device-1', token: 'kiosk_opaque' });
  auth.renew.mockReset().mockResolvedValue(null);
  db.queryMock.mockReset();
  db.queryMock.mockResolvedValue([]);
});

describe('activacion automatica de pantallas', () => {
  const context = { params: {} };
  it('informa estado y si la sesion puede activar', async () => {
    const result = await (
      await kioskSessionGet(new Request('http://localhost/api/kiosk/session'), context)
    ).json();
    expect(result).toEqual({ success: true, vinculado: false, puedeActivar: false });
  });
  it('rechaza visitantes aunque envien el antiguo secreto', async () => {
    const response = await kioskSessionPost(postJson({ secret: 'secreto-valido-123456' }), context);
    expect(response.status).toBe(401);
    expect(auth.provision).not.toHaveBeenCalled();
  });
  it('rechaza usuarios sin rol administrador', async () => {
    auth.user = { id: 'u1', role: 'cajero', permissions: {} };
    const response = await kioskSessionPost(postJson({ nombre: 'Entrada' }), context);
    expect(response.status).toBe(403);
    expect(auth.provision).not.toHaveBeenCalled();
  });
  it('activa con administrador sin exponer token y cierra su sesion', async () => {
    auth.user = { id: 'admin-1', role: 'administrador', permissions: {} };
    const response = await kioskSessionPost(postJson({ nombre: 'Entrada' }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, deviceId: 'device-1' });
    expect(auth.provision).toHaveBeenCalledWith('Entrada', 'admin-1', 'kiosk_opaque');
    const cookie = response.headers.get('set-cookie') || '';
    expect(cookie).toContain('kiosk_token=kiosk_opaque');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('refresh_token=;');
    expect(cookie).toContain('token=;');
  });
  it('renueva la credencial sin sesion de administrador', async () => {
    auth.renew.mockResolvedValue('device-1');
    const response = await kioskSessionPatch(
      new Request('http://localhost/api/kiosk/session', { method: 'PATCH' }),
      context
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=2592000');
  });
  it('no renueva credenciales revocadas y borra la cookie', async () => {
    const response = await kioskSessionPatch(
      new Request('http://localhost/api/kiosk/session', { method: 'PATCH' }),
      context
    );
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
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

describe('administracion de pantallas', () => {
  it('exige administrador para listar y revocar', async () => {
    auth.user = { id: 'c1', role: 'cajero', permissions: {} };
    expect(
      (await devicesGet(new Request('http://localhost/api/kiosk/devices'), { params: {} })).status
    ).toBe(403);
    expect(
      (
        await deviceDelete(
          new Request('http://localhost/api/kiosk/devices/x', { method: 'DELETE' }),
          { params: { id: 'x' } }
        )
      ).status
    ).toBe(403);
  });
  it('lista dispositivos y permite revocar al administrador', async () => {
    auth.user = { id: 'a1', role: 'administrador', permissions: {} };
    auth.list.mockResolvedValue([{ id: 'd1', nombre: 'Entrada', activo: true }]);
    const response = await devicesGet(new Request('http://localhost/api/kiosk/devices'), {
      params: {}
    });
    expect(await response.json()).toEqual({
      success: true,
      data: [{ id: 'd1', nombre: 'Entrada', activo: true }]
    });
    const id = 'b4b0752a-ff8d-4c8b-86a5-c4742378a685';
    expect(
      (
        await deviceDelete(
          new Request(`http://localhost/api/kiosk/devices/${id}`, { method: 'DELETE' }),
          { params: { id } }
        )
      ).status
    ).toBe(200);
    expect(auth.revoke).toHaveBeenCalledWith(id);
  });
});
