// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const sdk = vi.hoisted(() => ({
  libreria: vi.fn(),
  login: vi.fn(),
  setup: vi.fn(),
  queryTime: vi.fn(),
  control: vi.fn(),
  logout: vi.fn()
}));
/** Simula una DLL que NO exporta CLIENT_SetupDeviceTime (koffi lanza al pedirla). */
const estado = vi.hoisted(() => ({ sinSetup: false }));
const cliente = vi.hoisted(() => ({ credencialesDeFila: vi.fn() }));
const tz = vi.hoisted(() => ({ ahora: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: tz.ahora
}));

vi.mock('@/lib/biometric/audioSdk', () => ({
  // `libreriaNet` devuelve la LIBRERÍA koffi: un objeto con `.func(prototipo)`.
  libreriaNet: sdk.libreria
}));

vi.mock('@/lib/biometric/deviceClient', () => ({
  credencialesDeFila: cliente.credencialesDeFila
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import {
  leerHoraEquipo,
  netTimeDesdeFecha,
  quizasSincronizarReloj,
  reiniciarCooldowns,
  sincronizarRelojEquipo
} from '@/lib/biometric/clockSync';

const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };

beforeEach(() => {
  estado.sinSetup = false;
  db.queryMock.mockReset().mockResolvedValue([]);
  sdk.libreria.mockReset().mockResolvedValue({
    func: (prototipo: string) => {
      if (prototipo.includes('CLIENT_SetupDeviceTime')) {
        if (estado.sinSetup) throw new Error(`Cannot find function ${prototipo}`);
        return sdk.setup;
      }
      if (prototipo.includes('CLIENT_QueryDeviceTime')) return sdk.queryTime;
      if (prototipo.includes('CLIENT_ControlDevice')) return sdk.control;
      if (prototipo.includes('CLIENT_LoginEx2')) return sdk.login;
      if (prototipo.includes('CLIENT_Logout')) return sdk.logout;
      throw new Error(`Prototipo no previsto en el test: ${prototipo}`);
    }
  });
  sdk.login.mockReset().mockReturnValue(777);
  sdk.setup.mockReset().mockReturnValue(true);
  sdk.queryTime.mockReset().mockReturnValue(true);
  sdk.control.mockReset().mockReturnValue(true);
  sdk.logout.mockReset();
  cliente.credencialesDeFila.mockReset().mockReturnValue(cred);
  tz.ahora.mockReset().mockReturnValue('2026-10-01 22:15:00');
  reiniciarCooldowns();
});

/** Escribe en un buffer NET_TIME los 6 DWORD de una fecha (como lo haría el equipo). */
function llenarNetTime(buf: Buffer, fecha: string): boolean {
  const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return false;
  [1, 2, 3, 4, 5, 6].forEach((i, j) => buf.writeUInt32LE(Number(m[i]), j * 4));
  return true;
}

describe('netTimeDesdeFecha', () => {
  it('serializa la fecha de negocio en NET_TIME little-endian de 24 bytes', () => {
    const b = netTimeDesdeFecha('2026-10-01 22:15:09');

    expect(b.length).toBe(24);
    expect(b.readUInt32LE(0)).toBe(2026);
    expect(b.readUInt32LE(4)).toBe(10);
    expect(b.readUInt32LE(8)).toBe(1);
    expect(b.readUInt32LE(12)).toBe(22);
    expect(b.readUInt32LE(16)).toBe(15);
    expect(b.readUInt32LE(20)).toBe(9);
  });

  it('acepta la fecha con T separador y rechaza basura', () => {
    expect(netTimeDesdeFecha('2026-10-01T22:15:00').readUInt32LE(0)).toBe(2026);
    expect(() => netTimeDesdeFecha('ayer')).toThrow(/inválida/);
  });
});

describe('sincronizarRelojEquipo', () => {
  it('usa CLIENT_SetupDeviceTime (vía canónica) con la hora del negocio y cierra sesión', async () => {
    await sincronizarRelojEquipo(cred);

    expect(sdk.login).toHaveBeenCalledWith(
      '192.168.1.50',
      37777,
      'admin',
      'secreta',
      0,
      null,
      expect.any(Buffer),
      expect.any(Buffer)
    );
    const [handle, params] = sdk.setup.mock.calls[0];
    expect(handle).toBe(777);
    expect(params.length).toBe(24);
    expect(params.readUInt32LE(0)).toBe(2026);
    expect(params.readUInt32LE(12)).toBe(22);
    expect(sdk.control).not.toHaveBeenCalled();
    expect(sdk.logout).toHaveBeenCalledWith(777);
  });

  it('si la DLL no exporta SetupDeviceTime cae al respaldo: control 121', async () => {
    estado.sinSetup = true;

    await sincronizarRelojEquipo(cred);

    const [handle, tipo, params, espera] = sdk.control.mock.calls[0];
    expect(handle).toBe(777);
    expect(tipo).toBe(121); // EM_CONTROL_DEV_TIME
    expect(params.readUInt32LE(0)).toBe(2026);
    expect(params.readUInt32LE(12)).toBe(22);
    expect(espera).toBe(5_000);
    expect(sdk.logout).toHaveBeenCalledWith(777);
  });

  it('si SetupDeviceTime devuelve false, lanza y cierra la sesión', async () => {
    sdk.setup.mockReturnValue(false);

    await expect(sincronizarRelojEquipo(cred)).rejects.toThrow('CLIENT_SetupDeviceTime');
    expect(sdk.logout).toHaveBeenCalledWith(777);
  });

  it('un login rechazado corta sin llamar al setup ni al logout', async () => {
    sdk.login.mockReturnValue(0);

    await expect(sincronizarRelojEquipo(cred)).rejects.toThrow('CLIENT_LoginEx2');
    expect(sdk.setup).not.toHaveBeenCalled();
    expect(sdk.control).not.toHaveBeenCalled();
    expect(sdk.logout).not.toHaveBeenCalled();
  });
});

describe('leerHoraEquipo', () => {
  it('consulta CLIENT_QueryDeviceTime y formatea la hora de pared del equipo', async () => {
    sdk.queryTime.mockImplementation((h: number, buf: Buffer) =>
      llenarNetTime(buf, '2026-10-01 21:00:07')
    );

    expect(await leerHoraEquipo(cred)).toBe('2026-10-01 21:00:07');

    const [handle, buf, espera] = sdk.queryTime.mock.calls[0];
    expect(handle).toBe(777);
    expect(buf.length).toBe(24);
    expect(espera).toBe(5_000);
    expect(sdk.logout).toHaveBeenCalledWith(777);
  });

  it('si la consulta falla lanza y cierra la sesión', async () => {
    sdk.queryTime.mockReturnValue(false);

    await expect(leerHoraEquipo(cred)).rejects.toThrow('CLIENT_QueryDeviceTime');
    expect(sdk.logout).toHaveBeenCalledWith(777);
  });
});

describe('quizasSincronizarReloj', () => {
  it('debajo del umbral (5 min) no toca el SDK', async () => {
    expect(await quizasSincronizarReloj('dev-1', 'S1', 120)).toBe(false);
    expect(sdk.libreria).not.toHaveBeenCalled();
  });

  it('por encima del umbral consulta credenciales y sincroniza', async () => {
    db.queryMock.mockResolvedValue([
      { ip: '192.168.1.50', usuario_equipo: 'admin', clave_cifrada: 'a.b.c' }
    ]);

    expect(await quizasSincronizarReloj('dev-1', 'S1', 700)).toBe(true);
    expect(cliente.credencialesDeFila).toHaveBeenCalled();
    expect(sdk.setup).toHaveBeenCalledTimes(1);
  });

  it('respeta el cooldown: la segunda vez en 6 h no reintenta', async () => {
    db.queryMock.mockResolvedValue([
      { ip: '192.168.1.50', usuario_equipo: 'admin', clave_cifrada: 'a.b.c' }
    ]);

    expect(await quizasSincronizarReloj('dev-1', 'S1', 700)).toBe(true);
    expect(await quizasSincronizarReloj('dev-1', 'S1', 700)).toBe(false);
    expect(sdk.setup).toHaveBeenCalledTimes(1);

    // Otro equipo tiene su propio cooldown.
    expect(await quizasSincronizarReloj('dev-2', 'S2', 700)).toBe(true);
    expect(sdk.setup).toHaveBeenCalledTimes(2);
  });

  it('un fallo de sincronización no lanza y no reintentará hasta el cooldown', async () => {
    db.queryMock.mockResolvedValue([
      { ip: '192.168.1.50', usuario_equipo: 'admin', clave_cifrada: 'a.b.c' }
    ]);
    sdk.setup.mockReturnValue(false);

    expect(await quizasSincronizarReloj('dev-1', 'S1', 700)).toBe(false);
    expect(await quizasSincronizarReloj('dev-1', 'S1', 700)).toBe(false); // cooldown
    expect(sdk.setup).toHaveBeenCalledTimes(1);
  });

  it('sin credenciales reporta y no sincroniza', async () => {
    db.queryMock.mockResolvedValue([]);
    cliente.credencialesDeFila.mockReturnValue(null);

    expect(await quizasSincronizarReloj('dev-1', 'S1', 700)).toBe(false);
    expect(sdk.libreria).not.toHaveBeenCalled();
  });
});
