// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de `verificarCoincidenciaFacial`: la orquestación entre la plantilla de
 * la DB, la captura en vivo del lector y el motor facial del equipo. El cliente
 * CGI y el puente NetSDK se mockean; acá se prueban los caminos de decisión y
 * los mensajes que ve el operador.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const cliente = vi.hoisted(() => ({
  capturarFotoDelEquipo: vi.fn(),
  credencialesDeFila: vi.fn()
}));
const facial = vi.hoisted(() => ({ extraerVectorFacial: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getSystemTimezone: () => 'America/Santiago',
  getNowInBusinessTimezone: () => '2026-09-30 09:00:00'
}));

vi.mock('@/modules/asistencia/biometrico/deviceClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/deviceClient')>();
  return { ...actual, ...cliente };
});

vi.mock('@/modules/asistencia/biometrico/faceSdk', async importOriginal => {
  const actual = await importOriginal<typeof import('@/modules/asistencia/biometrico/faceSdk')>();
  return { ...actual, extraerVectorFacial: facial.extraerVectorFacial };
});

import { verificarCoincidenciaFacial } from '@/modules/asistencia/biometrico/enrollmentService';
import { ErrorFacial } from '@/modules/asistencia/biometrico/faceSdk';

const equipo = {
  id: 'dev-1',
  nombre: 'Puerta principal',
  marca: 'dahua',
  serial: 'BF013C7PAJB4D74',
  ip: '192.168.0.5',
  usuario_equipo: 'admin',
  clave_cifrada: 'a.b.c'
};
const cred = { ip: '192.168.0.5', usuario: 'admin', clave: 'Admin123' };
const persona = { usuarioId: 'u-1', nombre: 'Sebas', codigo: '1007' };
const FOTO_BASE64 = Buffer.from('foto-jpeg-de-prueba').toString('base64');

function vector(...valores: number[]): Float32Array {
  return new Float32Array(valores);
}

function equiparPlantilla(filas: { datos: string }[] = [{ datos: FOTO_BASE64 }]) {
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM biometric_devices')) return [equipo];
    if (sql.includes('FROM biometric_plantillas')) return filas;
    return [];
  });
}

beforeEach(() => {
  db.queryMock.mockReset();
  cliente.capturarFotoDelEquipo.mockReset();
  cliente.credencialesDeFila.mockReset();
  facial.extraerVectorFacial.mockReset();

  cliente.credencialesDeFila.mockReturnValue(cred);
  cliente.capturarFotoDelEquipo.mockResolvedValue({
    base64: FOTO_BASE64,
    contentType: 'image/jpeg'
  });
});

describe('verificarCoincidenciaFacial', () => {
  it('marca coincidencia cuando el coseno supera el umbral', async () => {
    equiparPlantilla();
    facial.extraerVectorFacial.mockResolvedValueOnce(vector(1, 0, 0));
    facial.extraerVectorFacial.mockResolvedValueOnce(vector(1, 0, 0));

    const r = await verificarCoincidenciaFacial('dev-1', persona);

    expect(r.ok).toBe(true);
    expect(r.coincide).toBe(true);
    expect(r.similitud).toBeCloseTo(1, 6);
    expect(r.umbral).toBe(0.7);
    expect(r.mensaje).toContain('coincide');
    expect(r.captura).toBe(FOTO_BASE64);
    expect(cliente.capturarFotoDelEquipo).toHaveBeenCalledTimes(1);
    expect(facial.extraerVectorFacial).toHaveBeenCalledTimes(2);
  });

  it('avisa cuando la cara no coincide (vectores distintos)', async () => {
    equiparPlantilla();
    facial.extraerVectorFacial.mockResolvedValueOnce(vector(1, 0, 0));
    facial.extraerVectorFacial.mockResolvedValueOnce(vector(0, 1, 0));

    const r = await verificarCoincidenciaFacial('dev-1', persona);

    expect(r.ok).toBe(true);
    expect(r.coincide).toBe(false);
    expect(r.similitud).toBeCloseTo(0, 6);
    expect(r.mensaje).toContain('NO parece ser');
    expect(r.mensaje).toContain('Sebas');
  });

  it('sin foto de referencia no llama al equipo ni al SDK', async () => {
    equiparPlantilla([]);

    const r = await verificarCoincidenciaFacial('dev-1', persona);

    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('sin_plantilla');
    expect(r.mensaje).toContain('foto de referencia');
    expect(cliente.capturarFotoDelEquipo).not.toHaveBeenCalled();
    expect(facial.extraerVectorFacial).not.toHaveBeenCalled();
  });

  it('si el lector no ve ninguna cara lo explica en castellano', async () => {
    equiparPlantilla();
    facial.extraerVectorFacial.mockResolvedValueOnce(vector(1, 0, 0));
    facial.extraerVectorFacial.mockRejectedValueOnce(
      new ErrorFacial('sin_cara', 'El equipo no detectó ninguna cara en la foto.')
    );

    const r = await verificarCoincidenciaFacial('dev-1', persona);

    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('sin_cara');
    expect(r.mensaje).toContain('ninguna cara enfrente');
  });

  it('si el SDK no está disponible mantiene el motivo para el 503', async () => {
    equiparPlantilla();
    facial.extraerVectorFacial.mockRejectedValueOnce(
      new ErrorFacial('sdk_no_disponible', 'No se encontró dhnetsdk.dll')
    );

    const r = await verificarCoincidenciaFacial('dev-1', persona);

    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('sdk_no_disponible');
    expect(r.mensaje).toContain('dhnetsdk.dll');
  });

  it('acepta la plantilla como data URL y la limpia antes de mandarla', async () => {
    equiparPlantilla([{ datos: `data:image/jpeg;base64,${FOTO_BASE64}` }]);
    facial.extraerVectorFacial.mockResolvedValueOnce(vector(1, 0, 0));
    facial.extraerVectorFacial.mockResolvedValueOnce(vector(1, 0, 0));

    const r = await verificarCoincidenciaFacial('dev-1', persona);

    const plantillaEnviada = facial.extraerVectorFacial.mock.calls[0][1] as Buffer;
    expect(plantillaEnviada.toString()).toBe('foto-jpeg-de-prueba');
    expect(r.ok).toBe(true);
  });
});
