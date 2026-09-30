// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del enrolamiento gestionado: pull equipo→DB, restauración DB→equipo y
 * validación de credenciales contra el serial del equipo.
 *
 * El cliente del equipo (`deviceClient`) se mockea completo: acá se prueba la
 * orquestación, no el HTTP. El Digest se prueba aparte en deviceClient.test.ts.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const cliente = vi.hoisted(() => ({
  verificarConexion: vi.fn(),
  leerCara: vi.fn(),
  leerHuella: vi.fn(),
  capturarHuellaEnEquipo: vi.fn(),
  subirCara: vi.fn(),
  subirHuella: vi.fn(),
  eliminarUsuarioDelEquipo: vi.fn(),
  credencialesDeFila: vi.fn()
}));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-09-29 22:15:00'
}));

vi.mock('@/lib/biometric/deviceClient', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/biometric/deviceClient')>();
  return { ...actual, ...cliente };
});

import {
  guardarCredenciales,
  probarConexion,
  quitarDelEquipo,
  restaurarEnEquipo,
  sincronizarPersona
} from '@/lib/biometric/enrollmentService';

const equipo = {
  id: 'dev-1',
  nombre: 'Puerta principal',
  marca: 'dahua',
  serial: 'SERIAL1',
  ip: '192.168.1.50',
  usuario_equipo: 'admin',
  clave_cifrada: 'a.b.c'
};

const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };

function sqls(): string[] {
  return db.queryMock.mock.calls.map(call => String(call[0]));
}

function instalarEquipoConCredenciales() {
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM biometric_devices')) return [equipo];
    if (sql.includes('FROM biometric_plantillas')) return [];
    return [];
  });
  cliente.credencialesDeFila.mockReturnValue(cred);
}

beforeEach(() => {
  db.queryMock.mockReset();
  for (const fn of Object.values(cliente)) fn.mockReset();
});

describe('probarConexion', () => {
  it('con credenciales nuevas las usa directo y devuelve identidad', async () => {
    cliente.verificarConexion.mockResolvedValue({
      modelo: 'ASI3213S',
      serial: 'SERIAL1',
      version: '4.000'
    });

    const r = await probarConexion('dev-1', { ip: '10.0.0.5', usuario: 'admin', clave: 'x' });

    expect(r.ok).toBe(true);
    expect(r.modelo).toBe('ASI3213S');
    expect(cliente.verificarConexion).toHaveBeenCalledWith({
      ip: '10.0.0.5',
      usuario: 'admin',
      clave: 'x'
    });
  });

  it('sin credenciales guardadas explica qué falta', async () => {
    db.queryMock.mockImplementation(async () => [{ ...equipo, clave_cifrada: null }]);
    cliente.credencialesDeFila.mockReturnValue(null);

    const r = await probarConexion('dev-1');

    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('IP/credenciales');
  });

  it('traduce el fallo de conexión a mensaje sin tirar', async () => {
    instalarEquipoConCredenciales();
    cliente.verificarConexion.mockRejectedValue(new Error('fetch failed'));

    const r = await probarConexion('dev-1');

    expect(r.ok).toBe(false);
  });
});

describe('guardarCredenciales', () => {
  it('rechaza si el equipo de esa IP reporta OTRO serial', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      return [];
    });
    cliente.verificarConexion.mockResolvedValue({
      modelo: 'ASI3213S',
      serial: 'OTRO-SERIAL',
      version: '4.000'
    });

    const r = await guardarCredenciales('dev-1', {
      ip: '192.168.1.77',
      usuario: 'admin',
      clave: 'x'
    });

    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('OTRO-SERIAL');
    // No debe haber UPDATE con credenciales.
    expect(sqls().some(sql => sql.includes('UPDATE biometric_devices'))).toBe(false);
  });

  it('serial coincidente: guarda la clave CIFRADA', async () => {
    const crypto = await import('@/lib/biometric/credencialesCrypto');
    vi.spyOn(crypto, 'cifrarSecreto').mockReturnValue('cifrado-fake');

    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      return [];
    });
    cliente.verificarConexion.mockResolvedValue({
      modelo: 'ASI3213S',
      serial: 'serial1',
      version: '4.000'
    });

    const r = await guardarCredenciales('dev-1', {
      ip: '192.168.1.50',
      usuario: 'admin',
      clave: 'plana'
    });

    expect(r.ok).toBe(true);
    const update = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('UPDATE biometric_devices')
    );
    expect(update).toBeTruthy();
    // La clave en claro jamás va a la base.
    expect(JSON.stringify(update?.[1] ?? [])).not.toContain('plana');
    expect(update?.[1]).toContain('cifrado-fake');
  });
});

describe('sincronizarPersona', () => {
  const persona = { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' };

  it('cara y huella del equipo quedan guardadas como plantillas', async () => {
    instalarEquipoConCredenciales();
    cliente.leerCara.mockResolvedValue({ fotoBase64: 'FOTO-JPEG-B64' });
    cliente.leerHuella.mockResolvedValue({ plantillaHex: 'PLANTILLA-HEX' });

    const r = await sincronizarPersona('dev-1', persona);

    expect(r.ok).toBe(true);
    expect(r.detalles).toEqual({ cara: 'sincronizada', huella: 'sincronizada' });

    const inserts = db.queryMock.mock.calls.filter(call =>
      String(call[0]).includes('INSERT INTO biometric_plantillas')
    );
    expect(inserts.length).toBe(2);
    expect(JSON.stringify(inserts)).toContain('FOTO-JPEG-B64');
    expect(JSON.stringify(inserts)).toContain('PLANTILLA-HEX');
  });

  it('sin datos en el equipo: ok=false y mensaje que guía', async () => {
    instalarEquipoConCredenciales();
    cliente.leerCara.mockResolvedValue(null);
    cliente.leerHuella.mockResolvedValue(null);

    const r = await sincronizarPersona('dev-1', persona);

    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain(persona.codigo);
    expect(r.detalles).toEqual({ cara: 'sin_datos', huella: 'sin_datos' });
  });

  it('plantilla existente igual: solo refresca sincronía, no duplica', async () => {
    instalarEquipoConCredenciales();
    cliente.leerCara.mockResolvedValue({ fotoBase64: 'FOTO-VIEJA' });
    cliente.leerHuella.mockResolvedValue(null);
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('SELECT id, datos FROM biometric_plantillas')) {
        return [{ id: 'p-1', datos: 'FOTO-VIEJA' }];
      }
      return [];
    });

    const r = await sincronizarPersona('dev-1', persona);

    expect(r.detalles.cara).toBe('sincronizada');
    expect(sqls().some(sql => sql.includes('INSERT INTO biometric_plantillas'))).toBe(false);
    const refresh = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('SET fecha_sincronizacion = ?, sincronizada = 1')
    );
    expect(refresh).toBeTruthy();
  });

  it('equipo sin credenciales lanza error claro', async () => {
    db.queryMock.mockImplementation(async () => [{ ...equipo, clave_cifrada: null }]);
    cliente.credencialesDeFila.mockReturnValue(null);

    await expect(sincronizarPersona('dev-1', persona)).rejects.toThrow('IP/credenciales');
  });

  it('huella capturada en equipo cuando se pide', async () => {
    instalarEquipoConCredenciales();
    cliente.leerCara.mockResolvedValue(null);
    cliente.leerHuella.mockResolvedValue({ plantillaHex: 'HEX' });

    await sincronizarPersona('dev-1', persona, { capturarHuella: true });

    expect(cliente.capturarHuellaEnEquipo).toHaveBeenCalledWith(cred, '1001');
  });
});

describe('restaurarEnEquipo', () => {
  const persona = { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' };

  it('reescribe en el equipo lo que hay en la DB y marca sincronizada', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('FROM biometric_plantillas')) {
        return [
          { tipo: 'cara', datos: 'FOTO-B64' },
          { tipo: 'huella', datos: 'HEX' }
        ];
      }
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);

    const r = await restaurarEnEquipo('dev-1', persona);

    expect(r.ok).toBe(true);
    expect(cliente.subirCara).toHaveBeenCalledWith(cred, '1001', 'Ana', 'FOTO-B64');
    expect(cliente.subirHuella).toHaveBeenCalledWith(cred, '1001', 'HEX');
    expect(
      db.queryMock.mock.calls.filter(call => String(call[0]).includes('sincronizada = 1')).length
    ).toBeGreaterThan(0);
  });

  it('sin plantillas guardadas responde sin errores', async () => {
    instalarEquipoConCredenciales();

    const r = await restaurarEnEquipo('dev-1', persona);

    expect(r.ok).toBe(true);
    expect(r.mensaje).toContain('No hay plantillas');
  });
});

describe('quitarDelEquipo', () => {
  it('borra del equipo y deja el maestro pendiente de re-sincronizar', async () => {
    instalarEquipoConCredenciales();

    await quitarDelEquipo('dev-1', { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' });

    expect(cliente.eliminarUsuarioDelEquipo).toHaveBeenCalledWith(cred, '1001');
    expect(
      db.queryMock.mock.calls.filter(call => String(call[0]).includes('sincronizada = 0')).length
    ).toBe(1);
  });
});
