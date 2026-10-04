// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del alta/baja de equipos biométricos: validación de serial, serial ya
 * vinculado (activo vs revocado) y las consultas que usan las rutas de eventos
 * en vivo. La DB se mockea completa: acá se prueba la lógica, no el SQL contra
 * Postgres.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

import {
  createBiometricDevice,
  findActiveDevice,
  listBiometricDevices,
  revokeBiometricDevice,
  touchDevice
} from '@/modules/asistencia/biometrico/deviceAuth';

beforeEach(() => {
  db.queryMock.mockReset();
  db.queryMock.mockResolvedValue([]);
});

describe('findActiveDevice', () => {
  it('sin consultar si el serial no cumple el formato', async () => {
    for (const serial of ['', '  ', 'ab', 'x'.repeat(65), 'SN;DROP TABLE', 'serial con espacios']) {
      expect(await findActiveDevice(serial)).toBeNull();
    }
    expect(db.queryMock).not.toHaveBeenCalled();
  });

  it('busca por serial sin distinguir mayúsculas y solo entre activos', async () => {
    const fila = { id: 'dev-1', nombre: 'Puerta', marca: 'dahua', serial: 'SN-001' };
    db.queryMock.mockResolvedValue([fila]);

    expect(await findActiveDevice('  SN-001  ')).toEqual(fila);

    const [sql, params] = db.queryMock.mock.calls[0];
    expect(sql).toContain('LOWER(serial) = LOWER(?)');
    expect(sql).toContain('revocado_en IS NULL');
    expect(params).toEqual(['SN-001']);
  });

  it('devuelve null cuando ningún equipo coincide', async () => {
    expect(await findActiveDevice('SN-999')).toBeNull();
  });
});

describe('touchDevice', () => {
  it('actualiza último_uso del equipo', async () => {
    await touchDevice('dev-1');
    const [sql, params] = db.queryMock.mock.calls[0];
    expect(sql).toContain('UPDATE biometric_devices SET ultimo_uso = CURRENT_TIMESTAMP');
    expect(params).toEqual(['dev-1']);
  });
});

describe('createBiometricDevice', () => {
  it('rechaza un serial inválido sin tocar la DB', async () => {
    await expect(
      createBiometricDevice({ nombre: 'Puerta', marca: 'dahua', serial: 'x' }, 'user-1')
    ).rejects.toMatchObject({ name: 'ValidationError', code: 'VALIDATION_ERROR' });
    expect(db.queryMock).not.toHaveBeenCalled();
  });

  it('rechaza un serial ya vinculado a un equipo activo', async () => {
    db.queryMock.mockResolvedValue([{ id: 'dev-viejo', revocado_en: null }]);

    await expect(
      createBiometricDevice({ nombre: 'Puerta', marca: 'dahua', serial: ' SN-001 ' }, 'user-1')
    ).rejects.toThrow('Ese serial ya está vinculado a un equipo activo');

    const soloSelect = db.queryMock.mock.calls.every(([sql]) => !sql.includes('INSERT'));
    expect(soloSelect).toBe(true);
  });

  it('si el serial estaba revocado, borra la fila vieja y crea una nueva', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, revocado_en'))
        return [{ id: 'dev-viejo', revocado_en: '2026-01-02' }];
      return [];
    });

    const equipo = await createBiometricDevice(
      { nombre: 'Puerta', marca: 'dahua', serial: 'SN-001' },
      'user-1'
    );

    expect(equipo).toEqual({
      id: expect.any(String),
      nombre: 'Puerta',
      marca: 'dahua',
      serial: 'SN-001'
    });
    const borrado = db.queryMock.mock.calls.findIndex(([sql]) =>
      sql.includes('DELETE FROM biometric_devices')
    );
    const alta = db.queryMock.mock.calls.findIndex(([sql]) =>
      sql.includes('INSERT INTO biometric_devices')
    );
    expect(borrado).toBeGreaterThanOrEqual(0);
    expect(alta).toBeGreaterThan(borrado);
    expect(db.queryMock.mock.calls[borrado][1]).toEqual(['dev-viejo']);
  });

  it('crea el equipo nuevo con los campos recortados y el usuario que da de alta', async () => {
    const equipo = await createBiometricDevice(
      {
        nombre: '  Puerta principal  ',
        marca: 'dahua',
        modelo: '  ASI3213A-W  ',
        serial: '  SN-001  ',
        ip: '  10.0.0.5  '
      },
      'user-9'
    );

    expect(equipo).toEqual({
      id: expect.any(String),
      nombre: 'Puerta principal',
      marca: 'dahua',
      serial: 'SN-001'
    });

    const insert = db.queryMock.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO biometric_devices')
    );
    expect(insert).toBeDefined();
    expect(insert![0]).toContain('creado_por');
    // [id, nombre, marca, modelo, serial, ip, creado_por]
    expect(insert![1].slice(1)).toEqual([
      'Puerta principal',
      'dahua',
      'ASI3213A-W',
      'SN-001',
      '10.0.0.5',
      'user-9'
    ]);
  });

  it('modelo e ip opcionales se guardan como null', async () => {
    await createBiometricDevice({ nombre: 'Puerta', marca: 'zkteco', serial: 'SN-002' }, 'user-1');
    const insert = db.queryMock.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO biometric_devices')
    );
    expect(insert![1].slice(1)).toEqual(['Puerta', 'zkteco', null, 'SN-002', null, 'user-1']);
  });
});

describe('listBiometricDevices', () => {
  it('devuelve los equipos con su flag de activo calculado', async () => {
    const filas = [
      {
        id: 'dev-1',
        nombre: 'Puerta',
        marca: 'dahua',
        modelo: null,
        serial: 'SN-001',
        ip: '10.0.0.5',
        usuario_equipo: null,
        mac: null,
        recoger_registros: 1,
        fecha_crea: '2026-01-01',
        ultimo_uso: null,
        revocado_en: null,
        activo: true
      }
    ];
    db.queryMock.mockResolvedValue(filas);

    expect(await listBiometricDevices()).toEqual(filas);

    const [sql] = db.queryMock.mock.calls[0];
    expect(sql).toContain('(revocado_en IS NULL) AS activo');
    expect(sql).toContain('ORDER BY fecha_crea DESC');
  });
});

describe('revokeBiometricDevice', () => {
  it('marca revocado_en solo si todavía estaba activo', async () => {
    await revokeBiometricDevice('dev-1');
    const [sql, params] = db.queryMock.mock.calls[0];
    expect(sql).toContain('SET revocado_en = CURRENT_TIMESTAMP');
    expect(sql).toContain('revocado_en IS NULL');
    expect(params).toEqual(['dev-1']);
  });
});
