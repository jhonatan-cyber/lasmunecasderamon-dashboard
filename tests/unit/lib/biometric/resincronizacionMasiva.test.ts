// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de la re-sincronización masiva: restaura en el equipo a todas las
 * personas ACTIVAS con plantilla pendiente (`sincronizada = 0`), salta a los
 * inactivos (baja deliberada) y arma un resumen sin cortarse por un fallo.
 *
 * `restaurarEnEquipo` se mockea: su lógica de alta NetSDK/CGI está probada en
 * enrollmentService.test.ts; acá se prueba la orquestación del barrido.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const cliente = vi.hoisted(() => ({
  credencialesDeFila: vi.fn(),
  // Si no se mockea, cada restauración hace un CGI real que espera el timeout
  // de 8 s: el test tardaría segundos por persona.
  contarCarasEnEquipo: vi.fn()
}));
const facial = vi.hoisted(() => ({
  personaEnEquipo: vi.fn(),
  extraerVectorFacial: vi.fn(),
  guardarPersonaEnEquipo: vi.fn(),
  guardarCaraEnEquipo: vi.fn(),
  eliminarPersonaEnEquipo: vi.fn()
}));
// El acuse sonoro del alta se mockea: sin esto cada restauración intentaría
// abrir el Talk real contra la IP del equipo de prueba.
const audio = vi.hoisted(() => ({ avisarEnrolamiento: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

vi.mock('@/modules/asistencia/biometrico/avisosAudio', () => ({
  avisarEnrolamientoEnEquipo: audio.avisarEnrolamiento
}));

vi.mock('@/modules/asistencia/biometrico/deviceClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/deviceClient')>();
  return { ...actual, ...cliente };
});

vi.mock('@/modules/asistencia/biometrico/faceSdk', async importOriginal => {
  const actual = await importOriginal<typeof import('@/modules/asistencia/biometrico/faceSdk')>();
  return { ...actual, ...facial };
});

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-09-30 12:00:00'
}));

vi.mock('@/lib/utils/image-utils', () => ({
  imagenGuardadaABase64Jpeg: vi.fn().mockResolvedValue(null)
}));

import { resincronizarPendientesEnEquipo } from '@/modules/asistencia/biometrico/enrollmentService';

const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };
const equipo = {
  id: 'dev-1',
  nombre: 'Puerta',
  marca: 'dahua',
  serial: 'SERIAL1',
  ip: '192.168.1.50',
  usuario_equipo: 'admin',
  clave_cifrada: 'a.b.c',
  mac: null
};

/** Fila de pendiente (lo que devuelve el SELECT con LEFT JOIN a usuarios). */
function pendiente(
  usuarioId: string,
  estado: number | null,
  nombre: string | null = 'Ana',
  apellido: string | null = 'Perez'
) {
  return { usuario_id: usuarioId, nombre, apellido, estado };
}

beforeEach(() => {
  db.queryMock.mockReset();
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM biometric_devices')) return [equipo];
    if (sql.includes('biometric_plantillas bp')) return [];
    if (sql.includes('FROM usuarios')) return [];
    return [];
  });
  cliente.credencialesDeFila.mockReset();
  cliente.credencialesDeFila.mockReturnValue(cred);
  cliente.contarCarasEnEquipo.mockReset();
  cliente.contarCarasEnEquipo.mockResolvedValue(0);
  for (const fn of Object.values(facial)) fn.mockReset();
  audio.avisarEnrolamiento.mockClear();
});

describe('resincronizarPendientesEnEquipo', () => {
  it('restaura a los activos con plantilla pendiente usando su nombre completo', async () => {
    db.queryMock.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('biometric_plantillas bp'))
        return [pendiente('u-1', 1), pendiente('u-2', 1, 'Beto', 'Gomez')];
      // leerPlantillasParaAlta: la plantilla propia de cara queda como origen.
      if (sql.includes('SELECT tipo, datos FROM biometric_plantillas'))
        return [{ tipo: 'cara', datos: 'FOTO-B64' }];
      if (sql.includes('FROM usuarios')) return [];
      return [];
    });
    facial.extraerVectorFacial.mockResolvedValue(new Float32Array([1, 0, 0]));
    facial.guardarPersonaEnEquipo.mockResolvedValue('creada');
    facial.guardarCaraEnEquipo.mockResolvedValue('cargada');

    const r = await resincronizarPendientesEnEquipo('dev-1');

    expect(r).toMatchObject({
      restauradas: ['Ana Perez', 'Beto Gomez'],
      fallidas: [],
      inactivosOmitidos: 0
    });
    // Una barrida de N personas suena UNA sola vez al terminar (no N veces).
    expect(audio.avisarEnrolamiento).toHaveBeenCalledTimes(1);
    expect(audio.avisarEnrolamiento).toHaveBeenCalledWith('dev-1', { credenciales: cred });
  });

  it('omite a los inactivos y a las personas borradas del sistema', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('biometric_plantillas bp'))
        return [
          pendiente('u-activo', 1),
          pendiente('u-inactivo', 0),
          pendiente('u-borrado', null, null, null) // fila de usuarios ausente
        ];
      if (sql.includes('SELECT tipo, datos FROM biometric_plantillas'))
        return [{ tipo: 'cara', datos: 'FOTO-B64' }];
      return [];
    });
    facial.extraerVectorFacial.mockResolvedValue(new Float32Array([1, 0, 0]));
    facial.guardarPersonaEnEquipo.mockResolvedValue('creada');
    facial.guardarCaraEnEquipo.mockResolvedValue('cargada');

    const r = await resincronizarPendientesEnEquipo('dev-1');

    expect(r.restauradas).toEqual(['Ana Perez']);
    expect(r.inactivosOmitidos).toBe(2);
    // Nadie inactivo llegó al alta: la puerta no debe volver a reconocerlos.
    expect(facial.guardarPersonaEnEquipo).toHaveBeenCalledTimes(1);
  });

  it('un fallo individual no corta el barrido y queda en el resumen con su motivo', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('biometric_plantillas bp'))
        return [pendiente('u-1', 1), pendiente('u-2', 1, 'Beto', 'Gomez')];
      if (sql.includes('SELECT tipo, datos FROM biometric_plantillas'))
        return [{ tipo: 'cara', datos: 'FOTO-B64' }];
      return [];
    });
    facial.extraerVectorFacial
      .mockRejectedValueOnce(new Error('el equipo rechazó la cara'))
      .mockResolvedValueOnce(new Float32Array([1, 0, 0]));
    facial.guardarPersonaEnEquipo.mockResolvedValue('creada');
    facial.guardarCaraEnEquipo.mockResolvedValue('cargada');

    const r = await resincronizarPendientesEnEquipo('dev-1');

    expect(r.restauradas).toEqual(['Beto Gomez']);
    // Fallo genérico (no facial): motivo tipado 'error' para el resumen de la UI.
    expect(r.fallidas).toEqual([{ nombre: 'Ana Perez', motivo: 'error' }]);
  });

  it('una persona sin plantilla que empujar se reporta como sinDatos, no como restaurada', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('biometric_plantillas bp')) return [pendiente('u-1', 1)];
      // Ni plantilla propia, ni maestra, ni foto de ficha: nada que empujar.
      if (sql.includes('SELECT tipo, datos FROM biometric_plantillas')) return [];
      if (sql.includes('FROM usuarios')) return [];
      return [];
    });

    const r = await resincronizarPendientesEnEquipo('dev-1');

    expect(r.restauradas).toEqual([]);
    expect(r.fallidas).toEqual([{ nombre: 'Ana Perez', motivo: 'sin_plantilla' }]);
    expect(audio.avisarEnrolamiento).not.toHaveBeenCalled();
  });

  it('sin pendientes devuelve un resumen vacío sin consultar nada más', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('biometric_plantillas bp')) return [];
      return [];
    });

    const r = await resincronizarPendientesEnEquipo('dev-1');

    expect(r).toEqual({ restauradas: [], fallidas: [], inactivosOmitidos: 0, sinDatos: 0 });
    expect(facial.guardarPersonaEnEquipo).not.toHaveBeenCalled();
    expect(audio.avisarEnrolamiento).not.toHaveBeenCalled();
  });

  it('un equipo sin credenciales sigue lanzando el error accionable', async () => {
    db.queryMock.mockImplementation(async () => [{ ...equipo, clave_cifrada: null }]);
    cliente.credencialesDeFila.mockReturnValue(null);

    await expect(resincronizarPendientesEnEquipo('dev-1')).rejects.toThrow('IP/credenciales');
  });
});
