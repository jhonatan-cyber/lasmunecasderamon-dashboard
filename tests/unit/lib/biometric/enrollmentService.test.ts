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
  eliminarPersonaEnEquipo: vi.fn(),
  personaEnEquipo: vi.fn()
}));
const imagenes = vi.hoisted(() => ({
  imagenGuardadaABase64Jpeg: vi.fn(),
  processAndSaveImage: vi.fn()
}));
// El aviso sonoro del alta (Talk) se mockea: acá se prueba que se dispare, no
// el envío al altavoz (eso vive en avisosAudio.test.ts y audioService.test.ts).
const audio = vi.hoisted(() => ({
  avisarEnrolamiento: vi.fn(),
  avisarResultado: vi.fn()
}));
// Red: el sondeo de puerto y la búsqueda por MAC se mockean para que ningún
// test barra la subred de verdad.
const red = vi.hoisted(() => ({
  sondearPuerto: vi.fn(),
  descubrirIpDispositivo: vi.fn()
}));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn(async callback => callback(db.queryMock))
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getSystemTimezone: () => 'America/Santiago',
  getNowInBusinessTimezone: () => '2026-09-29 22:15:00'
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

vi.mock('@/lib/utils/image-utils', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/utils/image-utils')>();
  return { ...actual, ...imagenes };
});

vi.mock('@/modules/asistencia/biometrico/avisosAudio', () => ({
  avisarEnrolamientoEnEquipo: audio.avisarEnrolamiento,
  avisarResultadoEnEquipo: audio.avisarResultado
}));

vi.mock('@/modules/asistencia/biometrico/discovery', async importOriginal => {
  const actual = await importOriginal<typeof import('@/modules/asistencia/biometrico/discovery')>();
  return { ...actual, ...red };
});

vi.mock('@/modules/asistencia/biometrico/ipDiscovery', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/ipDiscovery')>();
  return { ...actual, ...red };
});

import {
  darDeAltaConFoto,
  fotoEnVivoDelEquipo,
  guardarCredenciales,
  guardarFotoCapturada,
  probarConexion,
  quitarDelEquipo,
  restaurarEnEquipo,
  sincronizarPersona,
  usarFotoDelLectorComoPerfil
} from '@/modules/asistencia/biometrico/enrollmentService';
import {
  DeviceAuthError,
  DeviceConnectionError
} from '@/modules/asistencia/biometrico/deviceClient';
import { ErrorFacial } from '@/modules/asistencia/biometrico/faceSdk';

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
  for (const fn of Object.values(audio)) fn.mockClear();
  cliente.contarCarasEnEquipo.mockResolvedValue(0);
  // La MAC se captura al probar la conexión: sin esto el CGI de red saldría a
  // buscar un equipo que en el test no existe (y tardaría segundos en fallar).
  cliente.leerMacsDelEquipo.mockResolvedValue([]);
  facial.extraerVectorFacial.mockResolvedValue(new Float32Array([1, 0, 0]));
  facial.guardarPersonaEnEquipo.mockResolvedValue('creada');
  facial.guardarCaraEnEquipo.mockResolvedValue('cargada');
  facial.eliminarPersonaEnEquipo.mockResolvedValue(true);
  facial.personaEnEquipo.mockResolvedValue(false);
  // La foto de la ficha solo entra como último recurso: por defecto no hay.
  imagenes.imagenGuardadaABase64Jpeg.mockReset().mockResolvedValue(null);
  // Si no había foto de perfil, la captura del lector se guarda como tal.
  imagenes.processAndSaveImage.mockReset().mockResolvedValue('user_1774587802530.webp');
  // Por defecto la IP conocida está viva y la búsqueda por MAC no encuentra
  // nada: cada test cambia lo que necesita (nunca se barre la red de verdad).
  red.sondearPuerto.mockReset().mockResolvedValue(true);
  red.descubrirIpDispositivo.mockReset().mockResolvedValue({
    ok: false,
    cambio: false,
    codigo: 'FUERA_DE_RED',
    mensaje: 'No aparece en la red ninguna IP con la MAC registrada.'
  });
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
    const crypto = await import('@/modules/asistencia/biometrico/credencialesCrypto');
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

  it('sin IP cargada: la re-busca por MAC y guarda la que encuentre', async () => {
    const crypto = await import('@/modules/asistencia/biometrico/credencialesCrypto');
    vi.spyOn(crypto, 'cifrarSecreto').mockReturnValue('cifrado-fake');

    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [{ ...equipo, ip: null }];
      return [];
    });
    red.descubrirIpDispositivo.mockResolvedValue({
      ok: true,
      cambio: true,
      ipAnterior: null,
      ipNueva: '192.168.0.77',
      verificada: true,
      mensaje: 'Equipo encontrado en 192.168.0.77.'
    });
    cliente.verificarConexion.mockResolvedValue({
      modelo: 'ASI3213S',
      serial: 'SERIAL1',
      version: '4.000'
    });

    const r = await guardarCredenciales('dev-1', { usuario: 'admin', clave: 'nueva' });

    expect(r.ok).toBe(true);
    expect(r.mensaje).toContain('192.168.0.77');
    // Sin IP conocida no se gasta ni un sondeo: se va derecho a la búsqueda.
    expect(red.sondearPuerto).not.toHaveBeenCalled();
    expect(red.descubrirIpDispositivo).toHaveBeenCalledWith('dev-1', {
      forzar: true,
      credenciales: { ip: '', usuario: 'admin', clave: 'nueva' }
    });
    const update = db.queryMock.mock.calls.find(call => String(call[0]).includes('SET ip = ?'));
    expect(update?.[1]).toEqual(['192.168.0.77', 'admin', 'cifrado-fake', 'dev-1']);
    // Validó el serial contra la IP que encontró.
    expect(cliente.verificarConexion).toHaveBeenCalledWith({
      ip: '192.168.0.77',
      usuario: 'admin',
      clave: 'nueva'
    });
  });

  it('la IP que dejó de responder se re-busca por MAC y se reintenta ahí', async () => {
    const crypto = await import('@/modules/asistencia/biometrico/credencialesCrypto');
    vi.spyOn(crypto, 'cifrarSecreto').mockReturnValue('cifrado-fake');

    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      return [];
    });
    red.sondearPuerto.mockResolvedValue(false);
    red.descubrirIpDispositivo.mockResolvedValue({
      ok: true,
      cambio: true,
      ipAnterior: '192.168.1.50',
      ipNueva: '192.168.1.99',
      verificada: true,
      mensaje: 'Equipo encontrado en 192.168.1.99 (IP anterior: 192.168.1.50).'
    });
    cliente.verificarConexion.mockResolvedValue({
      modelo: 'ASI3213A-W',
      serial: 'SERIAL1',
      version: '4.000'
    });

    const r = await guardarCredenciales('dev-1', {
      ip: '192.168.1.50',
      usuario: 'admin',
      clave: 'secreta'
    });

    expect(r.ok).toBe(true);
    expect(r.mensaje).toContain('IP actualizada de 192.168.1.50 a 192.168.1.99');
    // Jamás se habló contra la IP muerta: se sondeó, no respondió y siguió.
    expect(cliente.verificarConexion).not.toHaveBeenCalledWith(
      expect.objectContaining({ ip: '192.168.1.50' })
    );
    expect(cliente.verificarConexion).toHaveBeenCalledWith({
      ip: '192.168.1.99',
      usuario: 'admin',
      clave: 'secreta'
    });
    const update = db.queryMock.mock.calls.find(call => String(call[0]).includes('SET ip = ?'));
    expect(update?.[1]).toEqual(['192.168.1.99', 'admin', 'cifrado-fake', 'dev-1']);
  });

  it('clave incorrecta en una IP viva: no barre la red', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      return [];
    });
    cliente.verificarConexion.mockRejectedValue(
      new DeviceAuthError('Usuario o clave del equipo incorrectos')
    );

    const r = await guardarCredenciales('dev-1', {
      ip: '192.168.1.50',
      usuario: 'admin',
      clave: 'mala'
    });

    expect(r.ok).toBe(false);
    expect(r.codigo).toBe('CREDENCIALES');
    expect(red.descubrirIpDispositivo).not.toHaveBeenCalled();
    expect(sqls().some(sql => sql.includes('UPDATE biometric_devices'))).toBe(false);
  });

  it('si la búsqueda por MAC falla no guarda nada y explica el motivo', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      return [];
    });
    red.sondearPuerto.mockResolvedValue(false);

    const r = await guardarCredenciales('dev-1', {
      ip: '192.168.1.50',
      usuario: 'admin',
      clave: 'x'
    });

    expect(r.ok).toBe(false);
    expect(r.codigo).toBe('FUERA_DE_RED');
    expect(cliente.verificarConexion).not.toHaveBeenCalled();
    expect(sqls().some(sql => sql.includes('UPDATE biometric_devices'))).toBe(false);
    // Deja claro que sin credenciales correctas no se puede confirmar el serial.
    expect(r.mensaje).toContain('no puede confirmar el serial');
  });

  it('si la búsqueda falla conserva también el error del primer intento', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      return [];
    });
    red.sondearPuerto.mockResolvedValue(true);
    cliente.verificarConexion.mockRejectedValue(
      new DeviceConnectionError('No se pudo conectar al equipo en 192.168.1.50')
    );
    red.descubrirIpDispositivo.mockResolvedValue({
      ok: false,
      cambio: false,
      codigo: 'FUERA_DE_RED',
      mensaje: 'No aparece en la red ninguna IP con la MAC aa:bb:cc:dd:ee:ff.'
    });

    const r = await guardarCredenciales('dev-1', {
      ip: '192.168.1.50',
      usuario: 'admin',
      clave: 'x'
    });

    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('No se pudo conectar al equipo');
    expect(r.mensaje).toContain('No aparece en la red');
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
    // Enrolamiento confirmado: sale el acuse «usuario registrado» del sistema.
    expect(audio.avisarEnrolamiento).toHaveBeenCalledWith('dev-1', { credenciales: cred });
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
    expect(audio.avisarEnrolamiento).not.toHaveBeenCalled();
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

  it('cara ilegible por CGI y persona en el equipo: ok con mensaje claro', async () => {
    instalarEquipoConCredenciales();
    cliente.contarCarasEnEquipo.mockResolvedValue(1);
    cliente.leerCara.mockRejectedValue(
      new DeviceConnectionError(
        'Lectura de caras no implementada en este firmware: doFind respondió Bad Request'
      )
    );
    cliente.leerHuella.mockResolvedValue(null);
    facial.personaEnEquipo.mockResolvedValue(true);

    const r = await sincronizarPersona('dev-1', persona);

    // La consulta de respaldo va por NetSDK con las mismas credenciales.
    expect(facial.personaEnEquipo).toHaveBeenCalledWith(cred, '1001');
    expect(r.detalles.cara).toBe('no_soportada');
    expect(r.ok).toBe(true);
    expect(r.mensaje).toContain('ya está en el equipo');
    expect(r.mensaje).toContain('se conserva en el sistema');
  });

  it('cara ilegible por CGI y persona ausente: ok=false que apunta al alta', async () => {
    instalarEquipoConCredenciales();
    cliente.contarCarasEnEquipo.mockResolvedValue(1);
    cliente.leerCara.mockRejectedValue(
      new DeviceConnectionError(
        'Lectura de caras no implementada en este firmware: doFind respondió Bad Request'
      )
    );
    cliente.leerHuella.mockResolvedValue(null);
    facial.personaEnEquipo.mockResolvedValue(false);

    const r = await sincronizarPersona('dev-1', persona);

    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('todavía no está en el equipo');
    expect(r.mensaje).toContain('Dar de alta en el equipo');
  });

  it('cara ilegible y NetSDK caído: no afirma que la persona falte', async () => {
    instalarEquipoConCredenciales();
    cliente.leerCara.mockRejectedValue(
      new DeviceConnectionError(
        'Lectura de caras no implementada en este firmware: doFind respondió Bad Request'
      )
    );
    cliente.leerHuella.mockResolvedValue(null);
    facial.personaEnEquipo.mockRejectedValue(new Error('sin dhnetsdk.dll'));

    const r = await sincronizarPersona('dev-1', persona);

    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('No se pudo confirmar');
    expect(r.mensaje).toContain('idempotente');
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

describe('usarFotoDelLectorComoPerfil (la captura pasa a ser foto de perfil)', () => {
  const persona = { usuarioId: 'u-1', nombre: 'Ana', codigo: '1001' };

  function instalarConFotoDePerfil(foto: string | null) {
    instalarEquipoConCredenciales();
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('SELECT foto FROM usuarios')) return [{ foto }];
      return [];
    });
  }

  it('si la persona tiene default.png, la foto del lector pasa a ser su foto de perfil', async () => {
    instalarConFotoDePerfil('default.png');

    const nombre = await usarFotoDelLectorComoPerfil('u-1', 'FOTO-DE-CAMARA');

    expect(nombre).toBe('user_1774587802530.webp');
    expect(imagenes.processAndSaveImage).toHaveBeenCalledTimes(1);
    expect(
      db.queryMock.mock.calls.some(
        call =>
          String(call[0]).includes('UPDATE usuarios SET foto') &&
          (call[1] as unknown[])[0] === 'user_1774587802530.webp'
      )
    ).toBe(true);
  });

  it('sin foto (null) también se rellena con la captura', async () => {
    instalarConFotoDePerfil(null);

    await expect(usarFotoDelLectorComoPerfil('u-1', 'FOTO-DE-CAMARA')).resolves.toBe(
      'user_1774587802530.webp'
    );
  });

  it('si ya subió una foto de perfil propia, no se sobrescribe', async () => {
    instalarConFotoDePerfil('user_propia.webp');

    await expect(usarFotoDelLectorComoPerfil('u-1', 'FOTO-DE-CAMARA')).resolves.toBeNull();
    expect(imagenes.processAndSaveImage).not.toHaveBeenCalled();
    expect(sqls().some(sql => sql.includes('UPDATE usuarios SET foto'))).toBe(false);
  });

  it('si la foto de perfil es una URL externa, tampoco se toca', async () => {
    instalarConFotoDePerfil('https://cdn.example.com/ana.webp');

    await expect(usarFotoDelLectorComoPerfil('u-1', 'FOTO-DE-CAMARA')).resolves.toBeNull();
    expect(imagenes.processAndSaveImage).not.toHaveBeenCalled();
  });

  it('si falla el guardado del archivo no rompe el enrolamiento', async () => {
    instalarConFotoDePerfil('default.png');
    imagenes.processAndSaveImage.mockRejectedValue(new Error('disco lleno'));

    await expect(usarFotoDelLectorComoPerfil('u-1', 'FOTO-DE-CAMARA')).resolves.toBeNull();
  });

  it('guardarFotoCapturada guarda solo en la DB aunque no haya foto de perfil', async () => {
    instalarConFotoDePerfil('default.png');

    const r = await guardarFotoCapturada('dev-1', persona, 'FOTO-DE-CAMARA');

    expect(r.ok).toBe(true);
    expect(r.mensaje).toContain('base de datos del sistema');
    expect(sqls().some(sql => sql.includes('UPDATE usuarios SET foto'))).toBe(false);
    expect(imagenes.processAndSaveImage).not.toHaveBeenCalled();
    expect(facial.guardarPersonaEnEquipo).not.toHaveBeenCalled();
    expect(facial.guardarCaraEnEquipo).not.toHaveBeenCalled();
  });

  it('guardarFotoCapturada no toca el perfil si el usuario ya tiene foto propia', async () => {
    instalarConFotoDePerfil('user_propia.webp');

    const r = await guardarFotoCapturada('dev-1', persona, 'FOTO-DE-CAMARA');

    expect(r.ok).toBe(true);
    expect(r.mensaje).not.toContain('foto de perfil');
    expect(imagenes.processAndSaveImage).not.toHaveBeenCalled();
  });

  it('el pull de cara desde el equipo también rellena el perfil vacío', async () => {
    instalarConFotoDePerfil('default.png');
    cliente.leerCara.mockResolvedValue({ codigo: '1001', nombre: 'Ana', fotoBase64: FOTO_B64 });
    cliente.leerHuella.mockResolvedValue(null);

    const r = await sincronizarPersona('dev-1', persona);

    expect(r.detalles.cara).toBe('sincronizada');
    expect(imagenes.processAndSaveImage).toHaveBeenCalled();
    expect(sqls().some(sql => sql.includes('UPDATE usuarios SET foto'))).toBe(true);
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
    expect(audio.avisarEnrolamiento).toHaveBeenCalledWith('dev-1', { credenciales: cred });
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
    expect(audio.avisarEnrolamiento).not.toHaveBeenCalled();
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

  it('sin plantillas en la DB usa la foto de la ficha del usuario', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('FROM biometric_plantillas')) return [];
      if (sql.includes('SELECT foto FROM usuarios')) return [{ foto: 'user_1.webp' }];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
    imagenes.imagenGuardadaABase64Jpeg.mockResolvedValue(FOTO_B64);

    const r = await restaurarEnEquipo('dev-1', persona);

    expect(imagenes.imagenGuardadaABase64Jpeg).toHaveBeenCalledWith('user_1.webp');
    expect(r.ok).toBe(true);
    expect(r.detalles.cara).toBe('sincronizada');
    expect(facial.extraerVectorFacial).toHaveBeenCalledWith(cred, Buffer.from(FOTO_B64, 'base64'));
    expect(r.mensaje).toContain('cara cargada');
  });

  it('foto de ficha inexistente o por defecto: sigue pidiendo capturar la foto', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('FROM biometric_plantillas')) return [];
      if (sql.includes('SELECT foto FROM usuarios')) return [{ foto: 'default.png' }];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
    imagenes.imagenGuardadaABase64Jpeg.mockResolvedValue(null);

    const r = await restaurarEnEquipo('dev-1', persona);

    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('sin_plantilla');
    expect(facial.guardarPersonaEnEquipo).not.toHaveBeenCalled();
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
    expect(audio.avisarEnrolamiento).toHaveBeenCalledWith('dev-1', { credenciales: cred });
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
    expect(audio.avisarEnrolamiento).not.toHaveBeenCalled();
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
