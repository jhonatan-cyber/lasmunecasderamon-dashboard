// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de `estadoEnEquipos`: la foto real de dónde está cargada la persona.
 * El cliente del equipo y el puente facial se mockean: acá se prueba la
 * orquestación (un resultado por equipo, los fallos aislados, nunca lanza).
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const cliente = vi.hoisted(() => ({ credencialesDeFila: vi.fn() }));
const facial = vi.hoisted(() => ({ personaEnEquipo: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

vi.mock('@/lib/biometric/deviceClient', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/biometric/deviceClient')>();
  return { ...actual, ...cliente };
});

vi.mock('@/lib/biometric/faceSdk', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/biometric/faceSdk')>();
  return { ...actual, ...facial };
});

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-09-30 12:00:00'
}));

import { estadoEnEquipos } from '@/lib/biometric/enrollmentService';
import { ErrorFacial } from '@/lib/biometric/faceSdk';

const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };
const persona = { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' };

beforeEach(() => {
  db.queryMock.mockReset();
  cliente.credencialesDeFila.mockReset();
  facial.personaEnEquipo.mockReset();
  facial.personaEnEquipo.mockResolvedValue(false);
});

describe('estadoEnEquipos (¿dónde está cargada la persona?)', () => {
  it('pregunta en cada equipo y devuelve el presente/ausente real', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices'))
        return [
          { id: 'dev-1', nombre: 'Puerta', ip: '10.0.0.1', clave_cifrada: 'a.b.c' },
          { id: 'dev-2', nombre: 'Comedor', ip: '10.0.0.2', clave_cifrada: 'd.e.f' }
        ];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
    facial.personaEnEquipo
      .mockResolvedValueOnce(true) // en la puerta sí está
      .mockResolvedValueOnce(false); // en el comedor no

    const r = await estadoEnEquipos(persona);

    expect(r).toEqual([
      { dispositivoId: 'dev-1', nombre: 'Puerta', ip: '10.0.0.1', presente: true },
      { dispositivoId: 'dev-2', nombre: 'Comedor', ip: '10.0.0.2', presente: false }
    ]);
    expect(facial.personaEnEquipo).toHaveBeenNthCalledWith(1, cred, '1001');
    expect(facial.personaEnEquipo).toHaveBeenNthCalledWith(2, cred, '1001');
  });

  it('un equipo sin credenciales se reporta sin abortar los demás', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices'))
        return [
          { id: 'dev-1', nombre: 'Sin cred', ip: null, clave_cifrada: null },
          { id: 'dev-2', nombre: 'OK', ip: '10.0.0.2', clave_cifrada: 'd.e.f' }
        ];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValueOnce(null).mockReturnValueOnce(cred);
    facial.personaEnEquipo.mockResolvedValue(true);

    const r = await estadoEnEquipos(persona);

    expect(r[0]).toMatchObject({
      dispositivoId: 'dev-1',
      presente: null,
      motivo: 'sin_credenciales'
    });
    expect(r[1]).toMatchObject({ dispositivoId: 'dev-2', presente: true });
    expect(facial.personaEnEquipo).toHaveBeenCalledTimes(1); // solo al equipo útil
  });

  it('un lector que rechaza la consulta queda como presente null y no tumba el barrido', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices'))
        return [
          { id: 'dev-1', nombre: 'Caído', ip: '10.0.0.1', clave_cifrada: 'a.b.c' },
          { id: 'dev-2', nombre: 'OK', ip: '10.0.0.2', clave_cifrada: 'd.e.f' }
        ];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
    facial.personaEnEquipo
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(false);

    const r = await estadoEnEquipos(persona);

    expect(r[0]).toMatchObject({ dispositivoId: 'dev-1', presente: null, motivo: 'error' });
    expect(r[1]).toMatchObject({ dispositivoId: 'dev-2', presente: false });
  });

  it('un servidor sin puente NetSDK se distingue de un error puntual', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices'))
        return [{ id: 'dev-1', nombre: 'Puerta', ip: '10.0.0.1', clave_cifrada: 'a.b.c' }];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
    facial.personaEnEquipo.mockRejectedValue(
      new ErrorFacial('sdk_no_disponible', 'No se encontró dhnetsdk.dll')
    );

    const r = await estadoEnEquipos(persona);

    expect(r[0]).toMatchObject({ presente: null, motivo: 'sdk_no_disponible' });
  });

  it('sin equipos vinculados devuelve una lista vacía', async () => {
    db.queryMock.mockImplementation(async () => []);

    const r = await estadoEnEquipos(persona);

    expect(r).toEqual([]);
    expect(facial.personaEnEquipo).not.toHaveBeenCalled();
  });
});
