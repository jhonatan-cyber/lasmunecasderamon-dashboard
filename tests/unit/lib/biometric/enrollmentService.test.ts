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
  contarCarasEnEquipo: vi.fn(),
  capturarFotoDelEquipo: vi.fn(),
  leerCara: vi.fn(),
  leerHuella: vi.fn(),
  capturarHuellaEnEquipo: vi.fn(),
  subirCara: vi.fn(),
  subirHuella: vi.fn(),
  eliminarUsuarioDelEquipo: vi.fn(),
  credencialesDeFila: vi.fn(),
  leerMacsDelEquipo: vi.fn()
}));
const facial = vi.hoisted(() => ({
  extraerVectorFacial: vi.fn(),
  guardarPersonaEnEquipo: vi.fn(),
  guardarCaraEnEquipo: vi.fn(),
  eliminarPersonaEnEquipo: vi.fn()
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

vi.mock('@/lib/biometric/faceSdk', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/biometric/faceSdk')>();
  return { ...actual, ...facial };
});

import {
  darDeAltaConFoto,
  fotoEnVivoDelEquipo,
  guardarCredenciales,
  guardarFotoCapturada,
  probarConexion,
  quitarDelEquipo,
  restaurarEnEquipo,
  sincronizarPersona
} from '@/lib/biometric/enrollmentService';
import { ErrorFacial } from '@/lib/biometric/faceSdk';

/** Foto de prueba en base64 estándar (el código limpia y decodifica el base64). */
const FOTO_B64 = Buffer.from('foto-jpeg-de-prueba').toString('base64');

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
  for (const fn of Object.values(facial)) fn.mockReset();
  cliente.contarCarasEnEquipo.mockResolvedValue(0);
  // La MAC se captura al probar la conexión: sin esto el CGI de red saldría a
  // buscar un equipo que en el test no existe (y tardaría segundos en fallar).
  cliente.leerMacsDelEquipo.mockResolvedValue([]);
  facial.extraerVectorFacial.mockResolvedValue(new Float32Array([1, 0, 0]));
  facial.guardarPersonaEnEquipo.mockResolvedValue('creada');
  facial.guardarCaraEnEquipo.mockResolvedValue('cargada');
  facial.eliminarPersonaEnEquipo.mockResolvedValue(true);
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
    // La persona todavía no está en el equipo: el mensaje apunta al alta por red.
    expect(r.mensaje).toContain('Dar de alta en el equipo');
    expect(r.detalles).toEqual({ cara: 'sin_datos', huella: 'sin_datos' });
    expect(r.carasEnEquipo).toBe(0);
  });

  it('informa cuántas caras tiene el equipo para distinguir equipo vacío', async () => {
    instalarEquipoConCredenciales();
    cliente.contarCarasEnEquipo.mockResolvedValue(4);
    cliente.leerCara.mockResolvedValue(null);
    cliente.leerHuella.mockResolvedValue(null);

    const r = await sincronizarPersona('dev-1', persona);

    expect(r.carasEnEquipo).toBe(4);
    expect(r.mensaje).not.toContain('no tiene ninguna cara');
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
      String(call[0]).includes('SET fecha_sincronizacion = ?, sincronizada = ?')
    );
    expect(refresh).toBeTruthy();
    // Lo leído del equipo queda marcado como sincronizado (1).
    expect((refresh?.[1] as unknown[])[1]).toBe(1);
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

describe('foto en vivo del lector', () => {
  const persona = { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' };

  it('guarda la foto capturada como plantilla de cara de la persona', async () => {
    instalarEquipoConCredenciales();

    const r = await guardarFotoCapturada('dev-1', persona, 'FOTO-DE-CAMARA');

    expect(r.ok).toBe(true);
    expect(r.capturas.cara).toBe('FOTO-DE-CAMARA');
    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO biometric_plantillas')
    );
    expect(JSON.stringify(insert)).toContain('FOTO-DE-CAMARA');
  });

  it('fotoEnVivoDelEquipo usa las credenciales guardadas del equipo', async () => {
    instalarEquipoConCredenciales();
    cliente.capturarFotoDelEquipo.mockResolvedValue({ base64: 'ABC', contentType: 'image/jpeg' });

    const foto = await fotoEnVivoDelEquipo('dev-1');

    expect(foto.base64).toBe('ABC');
    expect(cliente.capturarFotoDelEquipo).toHaveBeenCalledWith(cred);
  });

  it('sin credenciales no se puede pedir la foto', async () => {
    db.queryMock.mockImplementation(async () => [{ ...equipo, clave_cifrada: null }]);
    cliente.credencialesDeFila.mockReturnValue(null);

    await expect(fotoEnVivoDelEquipo('dev-1')).rejects.toThrow('IP/credenciales');
  });
});

describe('restaurarEnEquipo (alta al equipo por NetSDK)', () => {
  const persona = { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' };

  function instalarPlantillasPropias() {
    db.queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      // guardarPlantilla busca la fila existente por tipo para refrescar la sincronía.
      if (sql.includes('SELECT id, datos FROM biometric_plantillas')) {
        const tipo = params?.[2];
        return [{ id: `p-${tipo}`, datos: tipo === 'cara' ? FOTO_B64 : 'HEX' }];
      }
      if (sql.includes('FROM biometric_plantillas')) {
        return [
          { tipo: 'cara', datos: FOTO_B64 },
          { tipo: 'huella', datos: 'HEX' }
        ];
      }
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
  }

  it('crea la persona y carga la cara por NetSDK; la huella va por CGI', async () => {
    instalarPlantillasPropias();

    const r = await restaurarEnEquipo('dev-1', persona);

    expect(r.ok).toBe(true);
    expect(r.detalles).toEqual({ cara: 'sincronizada', huella: 'sincronizada' });
    expect(facial.extraerVectorFacial).toHaveBeenCalledWith(cred, Buffer.from(FOTO_B64, 'base64'));
    expect(facial.guardarPersonaEnEquipo).toHaveBeenCalledWith(cred, {
      codigo: '1001',
      nombre: 'Ana'
    });
    expect(facial.guardarCaraEnEquipo).toHaveBeenCalledWith(cred, '1001', expect.any(Float32Array));
    expect(cliente.subirCara).not.toHaveBeenCalled();
    expect(cliente.subirHuella).toHaveBeenCalledWith(cred, '1001', 'HEX');
    expect(r.mensaje).toContain('persona creada');
    expect(r.mensaje).toContain('cara cargada');
    // La copia del equipo queda registrada como sincronizada en la DB.
    const sync = db.queryMock.mock.calls.filter(
      call => String(call[0]).includes('sincronizada = ?') && (call[1] as unknown[])[1] === 1
    );
    expect(sync.length).toBeGreaterThanOrEqual(2);
  });

  it('si el puente NetSDK no está, reintenta por el CGI histórico', async () => {
    instalarPlantillasPropias();
    facial.guardarPersonaEnEquipo.mockRejectedValue(
      new ErrorFacial('sdk_no_disponible', 'No se encontró dhnetsdk.dll')
    );

    const r = await restaurarEnEquipo('dev-1', persona);

    expect(r.ok).toBe(true);
    expect(r.detalles.cara).toBe('sincronizada');
    expect(cliente.subirCara).toHaveBeenCalledWith(cred, '1001', 'Ana', FOTO_B64);
    expect(r.mensaje).toContain('cara cargada');
  });

  it('sin ninguna cara ni huella guardada pide capturar la foto primero', async () => {
    instalarEquipoConCredenciales();

    const r = await restaurarEnEquipo('dev-1', persona);

    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('sin_plantilla');
    expect(r.mensaje).toContain('Capturar foto');
    expect(facial.guardarPersonaEnEquipo).not.toHaveBeenCalled();
  });

  it('usa la última foto maestra de la persona aunque sea de otro equipo', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes("tipo = 'cara'")) return [{ tipo: 'cara', datos: FOTO_B64 }];
      if (sql.includes('FROM biometric_plantillas')) return [];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);

    const r = await restaurarEnEquipo('dev-1', persona);

    expect(r.ok).toBe(true);
    expect(facial.extraerVectorFacial).toHaveBeenCalledWith(cred, Buffer.from(FOTO_B64, 'base64'));
  });
});

describe('quitarDelEquipo', () => {
  it('borra la persona por NetSDK y complementa por CGI; el maestro queda pendiente', async () => {
    instalarEquipoConCredenciales();

    await quitarDelEquipo('dev-1', { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' });

    expect(facial.eliminarPersonaEnEquipo).toHaveBeenCalledWith(cred, '1001');
    expect(cliente.eliminarUsuarioDelEquipo).toHaveBeenCalledWith(cred, '1001');
    expect(
      db.queryMock.mock.calls.filter(call => String(call[0]).includes('sincronizada = 0')).length
    ).toBe(1);
  });

  it('si el NetSDK falla, igual intenta el borrado por CGI', async () => {
    instalarEquipoConCredenciales();
    facial.eliminarPersonaEnEquipo.mockRejectedValue(
      new ErrorFacial('sdk_no_disponible', 'sin dhnetsdk.dll')
    );

    await quitarDelEquipo('dev-1', { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' });

    expect(cliente.eliminarUsuarioDelEquipo).toHaveBeenCalledWith(cred, '1001');
  });
});

describe('darDeAltaConFoto (crear usuario → alta en el lector)', () => {
  const persona = { usuarioId: 'u-1', nombre: 'Ana Pérez', codigo: '1001' };

  /** Sin plantillas previas: la foto del usuario se guarda recién en esta llamada. */
  function instalarSinPlantillasPrevias() {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('SELECT id, datos FROM biometric_plantillas')) return [];
      // Tras guardarla, `leerPlantillasParaAlta` la encuentra para empujarla.
      if (sql.includes('SELECT tipo, datos FROM biometric_plantillas')) {
        return [{ tipo: 'cara', datos: FOTO_B64 }];
      }
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
  }

  it('guarda la foto como plantilla pendiente y da de alta a la persona', async () => {
    instalarSinPlantillasPrevias();

    const r = await darDeAltaConFoto('dev-1', persona, FOTO_B64);

    expect(r.ok).toBe(true);
    expect(r.mensaje).toContain('persona creada');
    expect(r.mensaje).toContain('cara cargada');
    expect(facial.guardarPersonaEnEquipo).toHaveBeenCalledWith(cred, {
      codigo: '1001',
      nombre: 'Ana Pérez'
    });
    expect(facial.guardarCaraEnEquipo).toHaveBeenCalledWith(cred, '1001', expect.any(Float32Array));

    // La foto del usuario quedó como plantilla maestra, primero PENDIENTE de sincronizar.
    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO biometric_plantillas')
    );
    expect(insert).toBeTruthy();
    expect(JSON.stringify(insert)).toContain(FOTO_B64);
    expect(insert?.[1]).toContain(0); // sincronizada = 0 (todavía no la tenía el equipo)
  });

  it('si el equipo rechaza el alta, devuelve el error sin lanzar', async () => {
    instalarSinPlantillasPrevias();
    facial.guardarCaraEnEquipo.mockRejectedValue(
      new ErrorFacial('error_desconocido', 'el equipo rechazó la cara')
    );

    const r = await darDeAltaConFoto('dev-1', persona, FOTO_B64);

    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('No se pudo dar de alta');
    expect(r.detalles.cara).toBe('error');
  });

  it('equipo revocado o inexistente: error claro sin tocar las plantillas', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [];
      return [];
    });

    await expect(darDeAltaConFoto('dev-404', persona, FOTO_B64)).rejects.toThrow(
      'no encontrado o revocado'
    );
  });
});
