import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import db, { query } from '@/lib/database/db';
import { UserService } from '@/modules/identidad/usuarios/fachada';
import { guardarFotoCapturada } from '@/modules/asistencia/biometrico/enrollmentService';
import { desenrolarUsuario } from '@/modules/asistencia/biometrico/unenrollmentService';
import {
  guardarPersonaEnEquipo,
  guardarCaraEnEquipo
} from '@/modules/asistencia/biometrico/faceSdk';

// Ciclo local contra PostgreSQL real. La red al lector esta mockeada.

/** Red al lector mockeada; `credencialesDeFila` es vi.fn() para poder tirar en escenarios de caída. */
const cliente = vi.hoisted(() => ({
  credencialesDeFila: vi.fn(),
  contarCarasEnEquipo: vi.fn(),
  leerCara: vi.fn(),
  leerHuella: vi.fn(),
  capturarHuellaEnEquipo: vi.fn(),
  subirCara: vi.fn(),
  subirHuella: vi.fn(),
  eliminarUsuarioDelEquipo: vi.fn(),
  capturarFotoDelEquipo: vi.fn()
}));

vi.mock('@/modules/asistencia/biometrico/deviceClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/deviceClient')>();
  return { ...actual, ...cliente };
});

vi.mock('@/modules/asistencia/biometrico/faceSdk', async importOriginal => {
  const actual = await importOriginal<typeof import('@/modules/asistencia/biometrico/faceSdk')>();
  return {
    ...actual,
    extraerVectorFacial: vi.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3])),
    guardarPersonaEnEquipo: vi.fn().mockResolvedValue('creada'),
    guardarCaraEnEquipo: vi.fn().mockResolvedValue('cargada'),
    eliminarPersonaEnEquipo: vi.fn().mockResolvedValue(true),
    personaEnEquipo: vi.fn().mockResolvedValue(false)
  };
});

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

const EQUIPO = 'test-bio-equipo';
const EQUIPO_2 = 'test-bio-equipo-2';
const USUARIO = 'test-bio-ciclo';
const CODIGO = '9001';

async function plantillasDe(usuarioId: string) {
  return await query<
    { tipo: string; sincronizada: number; dispositivo_id: string; datos: string }[]
  >(
    'SELECT tipo, sincronizada, dispositivo_id, datos FROM biometric_plantillas WHERE usuario_id = ?',
    [usuarioId]
  );
}

async function estadoDe(usuarioId: string) {
  const r = await query<{ estado: number; biometrico_codigo: string | null }[]>(
    'SELECT estado, biometrico_codigo FROM usuarios WHERE id_usuario = ?',
    [usuarioId]
  );
  return r[0];
}

beforeAll(async () => {
  // Comportamiento por defecto de la red mockeada: el equipo responde.
  cliente.credencialesDeFila.mockImplementation(() => ({
    ip: '10.255.255.1',
    usuario: 'test',
    clave: 'test'
  }));
  cliente.contarCarasEnEquipo.mockResolvedValue(0);
  cliente.leerCara.mockResolvedValue({ fotoBase64: 'FOTO-DEL-LECTOR' });
  cliente.leerHuella.mockResolvedValue({ plantillaHex: 'PLANTILLA-DEL-LECTOR' });
  cliente.capturarHuellaEnEquipo.mockResolvedValue(undefined);
  cliente.subirCara.mockResolvedValue(undefined);
  cliente.subirHuella.mockResolvedValue(undefined);
  cliente.eliminarUsuarioDelEquipo.mockResolvedValue(undefined);
  cliente.capturarFotoDelEquipo.mockResolvedValue({ base64: 'X', contentType: 'image/jpeg' });

  // Equipo "con credenciales" (el CGI/NetSDK real está mockeado) y un segundo
  // equipo para probar la re-sincronización masiva con varios pendientes.
  for (const id of [EQUIPO, EQUIPO_2]) {
    await query('DELETE FROM biometric_plantillas WHERE dispositivo_id = ?', [id]);
    await query('DELETE FROM biometric_devices WHERE id = ?', [id]);
    await query(
      `INSERT INTO biometric_devices (id, nombre, marca, serial, ip, usuario_equipo, clave_cifrada, fecha_crea)
       VALUES (?, ?, 'dahua', ?, '10.255.255.1', 'admin', 'cifrada', now())`,
      [id, id === EQUIPO ? 'Puerta test' : 'Comedor test', `SERIAL-${id}`]
    );
  }

  await query('DELETE FROM biometric_plantillas WHERE usuario_id = ?', [USUARIO]);
  await query('DELETE FROM biometric_events WHERE usuario_id = ? OR codigo_persona = ?', [
    USUARIO,
    CODIGO
  ]);
  await query('DELETE FROM asistencias WHERE usuario_id = ?', [USUARIO]);
  await query('DELETE FROM usuarios WHERE id_usuario = ?', [USUARIO]);
  await query(
    `INSERT INTO usuarios
       (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp,
        aporte, sueldo, descuento, password, rol_id, estado, estado_servicio, fecha_crea,
        biometrico_codigo, biometrico_huella, biometrico_facial)
     SELECT ?, 'run-bio-ciclo', ?, 'Ciclo', 'Biometrico', 'x', '0', 'Soltero', 'n',
        0, 0, 0, 'x', (SELECT id_rol FROM roles LIMIT 1), 1, 1, now(), ?, 0, 0
     WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE biometrico_codigo = ?)`,
    [USUARIO, USUARIO, CODIGO, CODIGO]
  );
});

afterAll(async () => {
  await query('DELETE FROM biometric_plantillas WHERE usuario_id = ? OR dispositivo_id IN (?, ?)', [
    USUARIO,
    EQUIPO,
    EQUIPO_2
  ]);
  await query('DELETE FROM biometric_events WHERE usuario_id = ? OR codigo_persona = ?', [
    USUARIO,
    CODIGO
  ]);
  await query('DELETE FROM asistencias WHERE usuario_id = ?', [USUARIO]);
  await query('DELETE FROM usuarios WHERE id_usuario = ?', [USUARIO]);
  await query('DELETE FROM biometric_devices WHERE id IN (?, ?)', [EQUIPO, EQUIPO_2]);
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

describe('ciclo biometrico local contra PostgreSQL', () => {
  it('captura y habilita la referencia facial solo en la DB', async () => {
    await guardarFotoCapturada(
      EQUIPO,
      { usuarioId: USUARIO, nombre: 'Ciclo', codigo: CODIGO },
      'FOTO-LOCAL'
    );
    const filas = await plantillasDe(USUARIO);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ datos: 'FOTO-LOCAL', sincronizada: 0 });
    expect((await UserService.getBiometricStatus(USUARIO)).facial).toBe(1);
    expect(guardarPersonaEnEquipo).not.toHaveBeenCalled();
    expect(guardarCaraEnEquipo).not.toHaveBeenCalled();
  });
  it('desactivar y activar conserva las plantillas sin llamadas al lector', async () => {
    await UserService.toggleUserStatus(USUARIO, 'deactivate');
    expect((await estadoDe(USUARIO)).estado).toBe(0);
    await UserService.toggleUserStatus(USUARIO, 'activate');
    expect((await estadoDe(USUARIO)).estado).toBe(1);
    expect(await plantillasDe(USUARIO)).toHaveLength(1);
    expect(guardarPersonaEnEquipo).not.toHaveBeenCalled();
    expect(cliente.eliminarUsuarioDelEquipo).not.toHaveBeenCalled();
  });
  it('desenrolar borra plantillas y conserva la cuenta y el codigo', async () => {
    await desenrolarUsuario(USUARIO);
    expect(await plantillasDe(USUARIO)).toHaveLength(0);
    expect((await estadoDe(USUARIO)).biometrico_codigo).toBe(CODIGO);
    expect((await UserService.getBiometricStatus(USUARIO)).facial).toBe(0);
  });
  it('puede enrolarse de nuevo y eliminar su cuenta sin tocar el lector', async () => {
    await guardarFotoCapturada(
      EQUIPO,
      { usuarioId: USUARIO, nombre: 'Ciclo', codigo: CODIGO },
      'NUEVA-FOTO'
    );
    const { eliminarUsuario } = await import('@/workflows/eliminar-usuario');
    await eliminarUsuario(USUARIO);
    expect(await plantillasDe(USUARIO)).toHaveLength(0);
    expect(await estadoDe(USUARIO)).toBeUndefined();
    expect(cliente.eliminarUsuarioDelEquipo).not.toHaveBeenCalled();
  });
});
