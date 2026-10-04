// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Identificación 1:N del servidor: con la foto del record decides a quién
 * corresponde, comparando contra los vectores cacheados de las plantillas.
 * El SDK facial y la base se mockean; la aritmética (coseno, umbrales) corre
 * con el código real.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const sdk = vi.hoisted(() => ({ extraerVectorFacial: vi.fn() }));
const atribucion = vi.hoisted(() => ({
  fn: vi.fn(() => Promise.resolve('registrado' as const))
}));

vi.mock('@/modules/asistencia/biometrico/processBiometricEvent', () => ({
  atribuirAsistenciaIdentificada: atribucion.fn
}));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/modules/asistencia/biometrico/faceSdk', async importOriginal => {
  const actual = await importOriginal<typeof import('@/modules/asistencia/biometrico/faceSdk')>();
  return { ...actual, extraerVectorFacial: sdk.extraerVectorFacial };
});

vi.mock('@/modules/asistencia/biometrico/deviceClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/deviceClient')>();
  return {
    ...actual,
    credencialesDeFila: vi.fn(() => ({ ip: '192.168.0.5', usuario: 'admin', clave: 'x' }))
  };
});

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import {
  actualizarVectoresPlantillas,
  deserializarVector,
  encolarIdentificacionDeRecord,
  identificarImagen,
  identificarRecord,
  recuperarIdentificacionesPendientes,
  serializarVector
} from '@/modules/asistencia/biometrico/identificacionFacial';
import { ErrorFacial } from '@/modules/asistencia/biometrico/faceSdk';

const RECORD = 'record-1';
const DISPOSITIVO = 'dev-1';
const USUARIO_A = 'usuario-a';
const USUARIO_B = 'usuario-b';

/** Vector unitario en la posición `i` (256 componentes, como el eigen real). */
function unitario(i: number): Float32Array {
  const v = new Float32Array(256);
  v[i] = 1;
  return v;
}

interface Escenario {
  record?: {
    foto?: Buffer | null;
    codigo_persona?: string | null;
    fechaDispositivo?: Date | null;
  } | null;
  plantillas?: {
    usuario_id: string;
    vector: Float32Array | null;
    tieneVector?: boolean;
    /** Equipo del que salió la plantilla (para el fallback de credenciales). */
    dispositivo_id?: string;
    /** Fallo determinista ya marcado: sin vector pero vista (no reintentar). */
    marcada?: boolean;
  }[];
  candidatos?: { usuario_id: string; vector: Float32Array }[];
  reclamado?: string | null;
  pendientesBarrido?: { id: string; dispositivo_id: string }[];
}

function instalarConsultas(esc: Escenario) {
  const actualizaciones: { sql: string; params: unknown[] }[] = [];
  db.queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const s = String(sql);
    if (s.includes('SELECT foto, codigo_persona, rec_no')) {
      if (esc.record === null) return [];
      const foto =
        esc.record && 'foto' in esc.record
          ? esc.record.foto
          : Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
      return [
        {
          foto,
          codigo_persona: esc.record?.codigo_persona ?? null,
          rec_no: 101,
          fecha_dispositivo: esc.record?.fechaDispositivo ?? new Date()
        }
      ];
    }
    if (s.includes('SELECT DISTINCT ON (usuario_id)') && s.includes('datos')) {
      // ultimasPlantillas(): fotos de referencia con (sin) vector cacheado.
      return (esc.plantillas ?? []).map((p, i) => ({
        id: `plantilla-${i}`,
        usuario_id: p.usuario_id,
        dispositivo_id: p.dispositivo_id ?? DISPOSITIVO,
        datos: 'Zm90bw==',
        vector: p.tieneVector === false || !p.vector ? null : serializarVector(p.vector),
        vector_actualizado_en:
          p.tieneVector === false
            ? null
            : p.marcada
              ? new Date('2026-10-02T05:00:00Z')
              : new Date('2026-10-02T00:00:00Z'),
        fecha_captura: new Date('2026-10-01T00:00:00Z')
      }));
    }
    if (s.includes('SELECT DISTINCT ON (usuario_id)') && s.includes('vector IS NOT NULL')) {
      return (esc.candidatos ?? []).map(c => ({
        usuario_id: c.usuario_id,
        vector: serializarVector(c.vector)
      }));
    }
    if (s.includes('FROM biometric_devices')) {
      // Por id (params[0]) o fallback sin equipo propio (sin params).
      if (params.length && params[0] !== DISPOSITIVO) return [];
      return [{ ip: '192.168.0.5', usuario_equipo: 'admin', clave_cifrada: 'a.b.c' }];
    }
    if (s.includes('SELECT id_usuario FROM usuarios')) {
      return esc.reclamado ? [{ id_usuario: esc.reclamado }] : [];
    }
    if (
      s.includes('UPDATE biometric_plantillas') ||
      s.includes('UPDATE biometric_device_records')
    ) {
      actualizaciones.push({ sql: s, params });
      return [];
    }
    if (
      s.includes('FROM biometric_device_records') &&
      s.includes('identificacion_estado IS NULL')
    ) {
      return esc.pendientesBarrido ?? [];
    }
    if (s.includes('UPDATE biometric_device_records')) return [];
    return [];
  });
  return actualizaciones;
}

function resultadoDe(actualizaciones: { sql: string; params: unknown[] }[]) {
  return actualizaciones.find(u => u.sql.includes('identificacion_estado = ?'));
}

beforeEach(() => {
  db.queryMock.mockReset();
  sdk.extraerVectorFacial.mockReset();
  atribucion.fn.mockReset().mockResolvedValue('registrado');
});

describe('serialización de vectores', () => {
  it('idavuelta de 256 float32 little-endian', () => {
    const original = new Float32Array(256);
    original[0] = 1;
    original[1] = -0.5;
    original[255] = 0.123456;

    const buffer = serializarVector(original);

    expect(buffer.length).toBe(1024);
    const vuelta = deserializarVector(buffer);
    expect(vuelta.length).toBe(256);
    expect(vuelta[0]).toBe(1);
    expect(vuelta[1]).toBeCloseTo(-0.5, 6);
    expect(vuelta[255]).toBeCloseTo(0.123456, 6);
  });
});

describe('identificarRecord', () => {
  it('identifica al dueño de la cara cuando la similitud supera el umbral', async () => {
    const cara = unitario(0);
    const actualizaciones = instalarConsultas({
      record: { codigo_persona: '1001' },
      plantillas: [{ usuario_id: USUARIO_A, vector: cara }],
      candidatos: [{ usuario_id: USUARIO_A, vector: cara }],
      reclamado: USUARIO_A
    });
    sdk.extraerVectorFacial.mockResolvedValue(cara);

    const estado = await identificarRecord(RECORD, DISPOSITIVO);

    expect(estado).toBe('identificado');
    expect(resultadoDe(actualizaciones)?.params?.[0]).toBe(USUARIO_A);
    expect(atribucion.fn).toHaveBeenCalledWith(USUARIO_A, RECORD, DISPOSITIVO, expect.any(Date));
  });

  it('graba usuario, similitud y estado en el record', async () => {
    const cara = unitario(3);
    const actualizaciones = instalarConsultas({
      record: { codigo_persona: '' },
      plantillas: [{ usuario_id: USUARIO_A, vector: cara }],
      candidatos: [{ usuario_id: USUARIO_A, vector: cara }]
    });
    sdk.extraerVectorFacial.mockResolvedValue(cara);

    await identificarRecord(RECORD, DISPOSITIVO);

    const update = resultadoDe(actualizaciones);
    expect(update?.params).toEqual([USUARIO_A, 1, 'identificado', RECORD]);
  });

  it('conflicto: el equipo reclamó un código que es OTRA persona', async () => {
    const cara = unitario(5);
    const actualizaciones = instalarConsultas({
      record: { codigo_persona: '1001' },
      plantillas: [
        { usuario_id: USUARIO_A, vector: cara },
        { usuario_id: USUARIO_B, vector: unitario(7) }
      ],
      candidatos: [
        { usuario_id: USUARIO_A, vector: cara },
        { usuario_id: USUARIO_B, vector: unitario(7) }
      ],
      reclamado: USUARIO_B
    });
    sdk.extraerVectorFacial.mockResolvedValue(cara);

    const estado = await identificarRecord(RECORD, DISPOSITIVO);

    expect(estado).toBe('conflicto');
    expect(resultadoDe(actualizaciones)?.params).toEqual([USUARIO_A, 1, 'conflicto', RECORD]);
    // Un conflicto es para revisión humana: jamás acredita por su cuenta.
    expect(atribucion.fn).not.toHaveBeenCalled();
  });

  it('sin_coincidencia: nadie pasa el umbral', async () => {
    const actualizaciones = instalarConsultas({
      record: { codigo_persona: '1001' },
      plantillas: [{ usuario_id: USUARIO_A, vector: unitario(1) }],
      candidatos: [{ usuario_id: USUARIO_A, vector: unitario(1) }]
    });
    // Captura ortogonal al candidato: coseno 0 < 0.7.
    sdk.extraerVectorFacial.mockResolvedValue(unitario(2));

    const estado = await identificarRecord(RECORD, DISPOSITIVO);

    expect(estado).toBe('sin_coincidencia');
    expect(resultadoDe(actualizaciones)?.params?.[0]).toBeNull();
    expect(resultadoDe(actualizaciones)?.params?.[1]).toBeCloseTo(0, 6);
    expect(atribucion.fn).not.toHaveBeenCalled();
  });

  it('sin_cara es definitivo: se graba sin reintentar', async () => {
    const actualizaciones = instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: unitario(0) }],
      candidatos: [{ usuario_id: USUARIO_A, vector: unitario(0) }]
    });
    sdk.extraerVectorFacial.mockRejectedValue(new ErrorFacial('sin_cara', 'no hay cara'));

    const estado = await identificarRecord(RECORD, DISPOSITIVO);

    expect(estado).toBe('sin_cara');
    expect(resultadoDe(actualizaciones)?.params).toEqual([null, null, 'sin_cara', RECORD]);
  });

  it('error transitorio del equipo: lanza sin grabar nada (para que el barrido reintente)', async () => {
    const actualizaciones = instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: unitario(0) }],
      candidatos: [{ usuario_id: USUARIO_A, vector: unitario(0) }]
    });
    sdk.extraerVectorFacial.mockRejectedValue(
      new ErrorFacial('error_desconocido', 'el equipo está ocupado')
    );

    await expect(identificarRecord(RECORD, DISPOSITIVO)).rejects.toThrow('ocupado');
    expect(actualizaciones).toHaveLength(0);
  });

  it('sin plantillas cara en el sistema: estado definitivo sin tocar el equipo', async () => {
    const actualizaciones = instalarConsultas({ plantillas: [], candidatos: [] });

    const estado = await identificarRecord(RECORD, DISPOSITIVO);

    expect(estado).toBe('sin_plantillas');
    expect(sdk.extraerVectorFacial).not.toHaveBeenCalled();
    expect(resultadoDe(actualizaciones)?.params).toEqual([null, null, 'sin_plantillas', RECORD]);
  });

  it('plantillas sin vector y extracción fallida: lanza (reintento) en vez de grabar sin_plantillas', async () => {
    instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: null, tieneVector: false }],
      candidatos: []
    });
    sdk.extraerVectorFacial.mockRejectedValue(new ErrorFacial('login_fallido', 'login rechazado'));

    await expect(identificarRecord(RECORD, DISPOSITIVO)).rejects.toThrow();
  });

  it('record sin foto: se queda en sin_foto sin pedirle nada al equipo', async () => {
    const actualizaciones = instalarConsultas({
      record: { foto: null },
      plantillas: [{ usuario_id: USUARIO_A, vector: unitario(0) }],
      candidatos: [{ usuario_id: USUARIO_A, vector: unitario(0) }]
    });

    const estado = await identificarRecord(RECORD, DISPOSITIVO);

    expect(estado).toBe('sin_foto');
    expect(sdk.extraerVectorFacial).not.toHaveBeenCalled();
    expect(resultadoDe(actualizaciones)?.params).toEqual([null, null, 'sin_foto', RECORD]);
  });

  it('plantilla marcada sin vector (fallo determinista): sin_plantillas y sin reintentar', async () => {
    const actualizaciones = instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: null, marcada: true }],
      candidatos: []
    });

    const estado = await identificarRecord(RECORD, DISPOSITIVO);

    expect(estado).toBe('sin_plantillas');
    expect(sdk.extraerVectorFacial).not.toHaveBeenCalled();
    expect(actualizaciones.some(u => u.sql.includes('UPDATE biometric_plantillas'))).toBe(false);
  });
});

describe('extracción de vectores de plantillas', () => {
  it('fallo determinista (sin_cara): marca la plantilla sin vector para no reintentar', async () => {
    const actualizaciones = instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: null, tieneVector: false }]
    });
    sdk.extraerVectorFacial.mockRejectedValue(new ErrorFacial('sin_cara', 'no hay cara'));

    const listas = await actualizarVectoresPlantillas();

    expect(listas).toBe(0);
    const marca = actualizaciones.find(u => u.sql.includes('UPDATE biometric_plantillas'));
    expect(marca?.sql).toContain('vector_actualizado_en = CURRENT_TIMESTAMP');
    expect(marca?.sql).not.toContain('SET vector = ?');
    expect(marca?.params).toEqual(['plantilla-0']);
  });

  it('fallo transitorio (login_fallido): no marca, queda para el próximo ciclo', async () => {
    const actualizaciones = instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: null, tieneVector: false }]
    });
    sdk.extraerVectorFacial.mockRejectedValue(new ErrorFacial('login_fallido', 'login rechazado'));

    const listas = await actualizarVectoresPlantillas();

    expect(listas).toBe(0);
    expect(actualizaciones).toHaveLength(0);
  });

  it('equipo propio revocado: extrae con cualquier dispositivo activo', async () => {
    const actualizaciones = instalarConsultas({
      plantillas: [
        { usuario_id: USUARIO_A, vector: null, tieneVector: false, dispositivo_id: 'dev-borrado' }
      ]
    });
    sdk.extraerVectorFacial.mockResolvedValue(unitario(0));

    const listas = await actualizarVectoresPlantillas();

    expect(listas).toBe(1);
    expect(sdk.extraerVectorFacial).toHaveBeenCalledTimes(1);
    const guarda = actualizaciones.find(u => u.sql.includes('SET vector = ?'));
    expect(guarda?.params?.[1]).toBe('plantilla-0');
  });

  it('nada de dónde extraer (sin ningún equipo activo): no marca ni intenta', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      const s = String(sql);
      if (s.includes('SELECT DISTINCT ON (usuario_id)') && s.includes('datos')) {
        return [
          {
            id: 'plantilla-0',
            usuario_id: USUARIO_A,
            dispositivo_id: DISPOSITIVO,
            datos: 'Zm90bw==',
            vector: null,
            vector_actualizado_en: null,
            fecha_captura: new Date('2026-10-01T00:00:00Z')
          }
        ];
      }
      if (s.includes('FROM biometric_devices')) return [];
      if (s.includes('UPDATE biometric_plantillas')) return [];
      return [];
    });

    const listas = await actualizarVectoresPlantillas();

    expect(listas).toBe(0);
    expect(sdk.extraerVectorFacial).not.toHaveBeenCalled();
    const sqls = db.queryMock.mock.calls.map(c => String(c[0]));
    expect(sqls.some(s => s.includes('UPDATE biometric_plantillas'))).toBe(false);
  });
});

describe('cola y barrido', () => {
  it('el barrido solo retoma records con foto y sin resultado (o en error)', async () => {
    instalarConsultas({
      pendientesBarrido: [
        { id: 'r-1', dispositivo_id: DISPOSITIVO },
        { id: 'r-2', dispositivo_id: DISPOSITIVO }
      ]
    });

    const total = await recuperarIdentificacionesPendientes(3);

    expect(total).toBe(2);
    const sqls = db.queryMock.mock.calls.map(c => String(c[0]));
    const barrido = sqls.find(s => s.includes('FROM biometric_device_records'));
    expect(barrido).toContain("identificacion_estado = 'error'");
  });

  it('el barrido excluye los que agotaron sus intentos en este proceso', async () => {
    instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: null, tieneVector: false }],
      candidatos: [],
      pendientesBarrido: [
        { id: 'a1b2c3d4-0000-4000-8000-000000000001', dispositivo_id: DISPOSITIVO }
      ]
    });
    sdk.extraerVectorFacial.mockRejectedValue(new ErrorFacial('login_fallido', 'rechazado'));

    for (let intento = 1; intento <= 3; intento += 1) {
      encolarIdentificacionDeRecord({
        recordId: 'a1b2c3d4-0000-4000-8000-000000000001',
        dispositivoId: DISPOSITIVO
      });
      await vi.waitFor(() => {
        expect(sdk.extraerVectorFacial).toHaveBeenCalledTimes(intento);
      });
      // Deja que falle y libere el vuelo antes de re-encolar.
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    db.queryMock.mockClear();
    await recuperarIdentificacionesPendientes(3);

    const barrido = db.queryMock.mock.calls
      .map(c => String(c[0]))
      .find(s => s.includes('FROM biometric_device_records'));
    expect(barrido).toContain("id NOT IN ('a1b2c3d4-0000-4000-8000-000000000001')");
  });

  it('encolar es idempotente (mismo record en vuelo no entra dos veces)', async () => {
    const actualizaciones = instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: unitario(0) }],
      candidatos: [{ usuario_id: USUARIO_A, vector: unitario(0) }]
    });
    sdk.extraerVectorFacial.mockResolvedValue(unitario(0));

    encolarIdentificacionDeRecord({ recordId: 'r-único', dispositivoId: DISPOSITIVO });
    encolarIdentificacionDeRecord({ recordId: 'r-único', dispositivoId: DISPOSITIVO });

    await vi.waitFor(() => {
      expect(sdk.extraerVectorFacial).toHaveBeenCalledTimes(1);
      expect(actualizaciones.some(u => u.sql.includes('identificacion_estado = ?'))).toBe(true);
    });
  });
});

describe('identificarImagen', () => {
  const FOTO = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

  it('identifica a partir de la foto sin pasar por un record', async () => {
    const cara = unitario(0);
    instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: cara }],
      candidatos: [{ usuario_id: USUARIO_A, vector: cara }]
    });
    sdk.extraerVectorFacial.mockResolvedValue(cara);

    const identificacion = await identificarImagen(FOTO, DISPOSITIVO);

    expect(identificacion?.usuarioId).toBe(USUARIO_A);
    expect(identificacion?.similitud).toBeCloseTo(1, 5);
  });

  it('captura ortogonal a todo: nadie pasa el umbral y devuelve null', async () => {
    instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: unitario(1) }],
      candidatos: [{ usuario_id: USUARIO_A, vector: unitario(1) }]
    });
    sdk.extraerVectorFacial.mockResolvedValue(unitario(2));

    const identificacion = await identificarImagen(FOTO, DISPOSITIVO);

    expect(identificacion).toBeNull();
  });

  it('sin candidatos con vector no pide nada al equipo', async () => {
    instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: unitario(0) }],
      candidatos: []
    });

    const identificacion = await identificarImagen(FOTO, DISPOSITIVO);

    expect(identificacion).toBeNull();
    expect(sdk.extraerVectorFacial).not.toHaveBeenCalled();
  });

  it('foto vacía devuelve null sin tocar la base', async () => {
    instalarConsultas({});

    const identificacion = await identificarImagen(Buffer.alloc(0), DISPOSITIVO);

    expect(identificacion).toBeNull();
    expect(db.queryMock).not.toHaveBeenCalled();
  });

  it('propaga el ErrorFacial del equipo (p. ej. sin_cara)', async () => {
    const cara = unitario(0);
    instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: cara }],
      candidatos: [{ usuario_id: USUARIO_A, vector: cara }]
    });
    sdk.extraerVectorFacial.mockRejectedValue(new ErrorFacial('sin_cara', 'no hay cara'));

    await expect(identificarImagen(FOTO, DISPOSITIVO)).rejects.toThrow('no hay cara');
  });

  it('sin credenciales de extracción lanza en vez de decidir a ciegas', async () => {
    const cara = unitario(0);
    instalarConsultas({
      plantillas: [{ usuario_id: USUARIO_A, vector: cara }],
      candidatos: [{ usuario_id: USUARIO_A, vector: cara }]
    });
    const previa = db.queryMock.getMockImplementation()!;
    db.queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (String(sql).includes('FROM biometric_devices')) return [];
      return previa(sql, params);
    });

    await expect(identificarImagen(FOTO, DISPOSITIVO)).rejects.toThrow('Sin credenciales');
  });
});
