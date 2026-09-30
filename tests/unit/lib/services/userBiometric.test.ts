// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import { UserService } from '@/lib/services/UserService';
import { ConflictError, NotFoundError } from '@/lib/errors/errors';

const usuario = {
  id_usuario: 'u-1',
  run: '11111111-1',
  nombre: 'Ana',
  apellido: 'Perez',
  rol_id: 'r-1',
  estado: 1,
  biometrico_codigo: null,
  biometrico_huella: 0,
  biometrico_facial: 0
};

function instalarBase() {
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM usuarios')) return [usuario];
    if (sql.includes('FROM biometric_events')) return [];
    return [];
  });
}

function updates(): { sql: string; params: any[] }[] {
  return db.queryMock.mock.calls
    .filter(call => String(call[0]).includes('UPDATE usuarios SET'))
    .map(call => ({ sql: String(call[0]), params: call[1] }));
}

beforeEach(() => {
  db.queryMock.mockReset();
  instalarBase();
});

describe('guardado del enrolamiento', () => {
  it('persiste codigo y estados como 0/1', async () => {
    await UserService.updateBiometric('u-1', { codigo: '1001', huella: true, facial: 1 });

    const update = updates()[0];
    expect(update.sql).toContain('biometrico_codigo');
    expect(update.sql).toContain('biometrico_huella');
    expect(update.sql).toContain('biometrico_facial');
    expect(update.params).toEqual(['1001', 1, 1, expect.anything(), 'u-1']);
  });

  it('un codigo en blanco se guarda como null', async () => {
    await UserService.updateBiometric('u-1', { codigo: '   ', huella: false, facial: false });
    expect(updates()[0].params.slice(0, 3)).toEqual([null, 0, 0]);
  });

  it('sin tocar los demas campos, actualiza solo lo pedido', async () => {
    await UserService.updateBiometric('u-1', { facial: true });
    const update = updates()[0];
    expect(update.sql).not.toContain('biometrico_codigo');
    expect(update.sql).not.toContain('biometrico_huella');
    expect(update.params.slice(0, 3)).toEqual([1, expect.anything(), 'u-1']);
  });

  it('rechaza un codigo con caracteres que el equipo no puede reportar', async () => {
    await expect(UserService.updateBiometric('u-1', { codigo: '10 01' })).rejects.toThrow();
    expect(updates()).toHaveLength(0);
  });

  it('un codigo ya usado por otra persona es un conflicto legible', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE usuarios SET'))
        throw Object.assign(new Error('duplicate'), { code: '23505' });
      if (sql.includes('FROM usuarios')) return [usuario];
      return [];
    });

    await expect(UserService.updateBiometric('u-1', { codigo: '1001' })).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it('no trabaja sobre un usuario que no existe', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [];
      return [];
    });

    await expect(UserService.updateBiometric('nadie', { codigo: '1001' })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe('generación automática del código', () => {
  it('un usuario inexistente también se rechaza', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [];
      return [];
    });

    await expect(UserService.asignarCodigoBiometrico('nadie')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('la primera vez genera el siguiente numérico libre y lo guarda', async () => {
    let guardado: string | null = null;
    db.queryMock.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('WHERE biometrico_codigo IS NOT NULL'))
        return [
          { biometrico_codigo: '1001' },
          { biometrico_codigo: '1003' },
          { biometrico_codigo: 'ANA' } // no numérico: se ignora
        ];
      if (sql.includes('UPDATE usuarios SET')) {
        guardado = String(params?.[0]);
        return [];
      }
      if (sql.includes('FROM usuarios')) return [{ ...usuario, biometrico_codigo: guardado }];
      if (sql.includes('FROM biometric_events')) return [];
      return [];
    });

    const r = await UserService.asignarCodigoBiometrico('u-1');

    expect(r.generado).toBe(true);
    expect(r.codigo).toBe('1004');
    expect(guardado).toBe('1004');
  });

  it('sin ningún código usado arranca en 1001', async () => {
    let guardado: string | null = null;
    db.queryMock.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('WHERE biometrico_codigo IS NOT NULL')) return [];
      if (sql.includes('UPDATE usuarios SET')) {
        guardado = String(params?.[0]);
        return [];
      }
      if (sql.includes('FROM usuarios')) return [{ ...usuario, biometrico_codigo: guardado }];
      if (sql.includes('FROM biometric_events')) return [];
      return [];
    });

    const r = await UserService.asignarCodigoBiometrico('u-1');
    expect(r.codigo).toBe('1001');
  });

  it('si ya tiene código no genera otro ni toca la base', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [{ ...usuario, biometrico_codigo: '1007' }];
      return [];
    });

    const r = await UserService.asignarCodigoBiometrico('u-1');

    expect(r.generado).toBe(false);
    expect(r.codigo).toBe('1007');
    expect(updates()).toHaveLength(0);
  });

  it('ante un código recién tomado por otro reintenta con el siguiente', async () => {
    let intentos = 0;
    let guardado: string | null = null;
    db.queryMock.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('WHERE biometrico_codigo IS NOT NULL')) return [];
      if (sql.includes('UPDATE usuarios SET')) {
        intentos += 1;
        if (intentos === 1) throw Object.assign(new Error('duplicate'), { code: '23505' });
        guardado = String(params?.[0]);
        return [];
      }
      if (sql.includes('FROM usuarios')) return [{ ...usuario, biometrico_codigo: guardado }];
      if (sql.includes('FROM biometric_events')) return [];
      return [];
    });

    const r = await UserService.asignarCodigoBiometrico('u-1');

    expect(intentos).toBe(2);
    expect(r.generado).toBe(true);
    expect(r.codigo).toBe('1002');
  });
});

describe('estado del enrolamiento', () => {
  it('devuelve estados y la ultima verificacion que mando el lector', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios'))
        return [
          { ...usuario, biometrico_codigo: '1001', biometrico_huella: 1, biometrico_facial: 1 }
        ];
      if (sql.includes('FROM biometric_events'))
        return [
          { fecha_recepcion: '2026-09-29T12:00:00Z', resultado: 'registrado', metodo: 'cara' }
        ];
      return [];
    });

    const estado = await UserService.getBiometricStatus('u-1');
    expect(estado).toEqual({
      codigo: '1001',
      huella: 1,
      facial: 1,
      ultima_verificacion: '2026-09-29T12:00:00Z',
      ultimo_resultado: 'registrado',
      cara_base64: null,
      huella_hex: null
    });
  });

  it('devuelve la captura guardada (cara y huella) para mostrarla en el diálogo', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [usuario];
      if (sql.includes('FROM biometric_events')) return [];
      if (sql.includes('FROM biometric_plantillas'))
        return [
          { tipo: 'huella', datos: 'HEX-1' },
          { tipo: 'cara', datos: 'FOTO-B64' }
        ];
      return [];
    });

    const estado = await UserService.getBiometricStatus('u-1');
    expect(estado.cara_base64).toBe('FOTO-B64');
    expect(estado.huella_hex).toBe('HEX-1');
  });

  it('sin eventos todavia, lo dice sin romper', async () => {
    const estado = await UserService.getBiometricStatus('u-1');
    expect(estado.ultima_verificacion).toBeNull();
    expect(estado.ultimo_resultado).toBeNull();
  });
});
