import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import db, { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { registerAttendance } from '@/lib/repositories/attendance/AttendanceQueries';
import {
  CHALLENGE_TTL_SECONDS,
  hashChallengeToken,
  issueChallenge,
  redeemChallenge
} from '@/lib/kiosk/attendanceChallenges';

/**
 * La migracion 024 reemplaza la credencial personal (`usuarios.qr_token`, publicada en
 * /api/public/users) por un desafio que el servidor emite, guarda hasheado y verifica.
 *
 * Lo que se prueba aca es lo que antes no existia: que la presencia se resuelva del lado
 * servidor. El token no sirve para acreditar a otra persona, no se puede reusar, vence, y
 * el registro de asistencia no acepta ninguna credencial estatica.
 */

const IP = '203.0.113.77';
const ROLE = 'Anfitriona';

const usuarios = {
  dueña: 'test-desafios-dueña',
  otra: 'test-desafios-otra'
};

const ids = Object.values(usuarios);

const CLAVES_HORARIO = ['asistencia_hora_inicio', 'asistencia_hora_fin'];
let configOriginal: Array<{ id: string; clave: string; valor: string }> = [];

async function crearUsuario(id: string, nombre: string) {
  const roles = await query<any[]>('SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1', [ROLE]);
  await query(
    `INSERT INTO usuarios
       (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp,
        aporte, sueldo, descuento, password, rol_id, estado, estado_servicio, fecha_crea)
     VALUES (?, ?, ?, ?, 'DePrueba', 'sin direccion', '000000000', 'Soltero', 'ninguna',
        0, 0, 0, 'x', ?, 1, 1, now())`,
    [id, `run-${id}`, id, nombre, roles[0]?.id_rol ?? null]
  );
}

const asistenciaDeHoy = async (usuarioId: string) =>
  await query<any[]>('SELECT * FROM asistencias WHERE usuario_id = ? AND fecha = ?', [
    usuarioId,
    getNowInBusinessTimezone().substring(0, 10)
  ]);

beforeAll(async () => {
  // La ventana de asistencia es una configuracion del local (por defecto 21-23). Para que
  // el registro no dependa de la hora a la que se corran las pruebas se abre la ventana
  // entera y se restaura al final.
  configOriginal = await query<any[]>(
    'SELECT id, clave, valor FROM configuraciones WHERE clave IN (?)',
    [CLAVES_HORARIO]
  );
  await query('DELETE FROM configuraciones WHERE clave IN (?)', [CLAVES_HORARIO]);
  await query(
    "INSERT INTO configuraciones (id, clave, valor) VALUES ('test-horario-inicio','asistencia_hora_inicio','0'), ('test-horario-fin','asistencia_hora_fin','24')"
  );

  for (const id of ids) await query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
  await crearUsuario(usuarios.dueña, 'Duenia');
  await crearUsuario(usuarios.otra, 'Otra');
});

afterAll(async () => {
  await query('DELETE FROM asistencias WHERE usuario_id IN (?)', [ids]);
  await query('DELETE FROM logins WHERE usuario_id IN (?)', [ids]);
  await query('DELETE FROM usuarios WHERE id_usuario IN (?)', [ids]);
  await query('DELETE FROM configuraciones WHERE clave IN (?)', [CLAVES_HORARIO]);
  for (const fila of configOriginal) {
    await query('INSERT INTO configuraciones (id, clave, valor) VALUES (?, ?, ?)', [
      fila.id,
      fila.clave,
      fila.valor
    ]);
  }
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

describe('esquema del desafio', () => {
  it('existe la tabla con su indice unico y la FK diferible a usuarios', async () => {
    const columnas = await query<any[]>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'asistencia_desafios' AND table_schema = current_schema()`
    );
    const nombres = columnas.map(c => c.column_name);
    expect(nombres).toEqual(
      expect.arrayContaining([
        'id_desafio',
        'usuario_id',
        'token_hash',
        'emitido_por',
        'emisor_usuario_id',
        'expira_en',
        'usado_en'
      ])
    );

    const indice = await query<any[]>(
      "SELECT indexdef FROM pg_indexes WHERE tablename = 'asistencia_desafios' AND indexname = 'uq_asistencia_desafios_token'"
    );
    expect(indice[0].indexdef).toMatch(/UNIQUE/);

    const fk = await query<any[]>(
      "SELECT condeferrable FROM pg_constraint WHERE conname = 'fk_asistencia_desafios_usuario'"
    );
    expect(fk[0].condeferrable).toBe(true);
  });

  it('el token personal quedo retirado: la columna no autoriza nada', async () => {
    // Se escribe un valor viejo a mano y se comprueba que el registro de asistencia lo
    // ignora por completo: no hay ningun camino que lo lea.
    await query('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [
      'token-viejo-123',
      usuarios.dueña
    ]);

    await expect(
      registerAttendance({ qrData: 'token-viejo-123' }, { id: usuarios.dueña }, IP)
    ).rejects.toThrow(/inv[aá]lido/i);

    expect(await asistenciaDeHoy(usuarios.dueña)).toEqual([]);

    await query('UPDATE usuarios SET qr_token = NULL WHERE id_usuario = ?', [usuarios.dueña]);
  });
});

describe('emision y canje sobre la base real', () => {
  it('guarda el hash y un solo desafio vigente por persona', async () => {
    const primero = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });
    const primeroHash = hashChallengeToken(primero.token);

    const filas = await query<any[]>(
      'SELECT token_hash, emitido_por, emisor_usuario_id FROM asistencia_desafios WHERE usuario_id = ?',
      [usuarios.dueña]
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].token_hash).toBe(primeroHash);
    expect(filas[0].token_hash).not.toBe(primero.token);
    expect(filas[0].emitido_por).toBe('kiosko:pantalla-1');
    expect(filas[0].emisor_usuario_id).toBeNull();

    const segundo = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });
    const restantes = await query<any[]>(
      'SELECT token_hash FROM asistencia_desafios WHERE usuario_id = ?',
      [usuarios.dueña]
    );
    expect(restantes).toHaveLength(1);
    expect(restantes[0].token_hash).not.toBe(primeroHash);
    expect(restantes[0].token_hash).toBe(hashChallengeToken(segundo.token));
  });

  it('el desafio se canjea una sola vez', async () => {
    const desafio = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });

    expect(await redeemChallenge(desafio.token, usuarios.dueña)).toEqual({
      ok: true,
      usuarioId: usuarios.dueña
    });
    expect(await redeemChallenge(desafio.token, usuarios.dueña)).toEqual({
      ok: false,
      motivo: 'ya_usado'
    });
  });

  it('un desafio del kiosko no acredita a otra persona', async () => {
    const desafio = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });

    expect(await redeemChallenge(desafio.token, usuarios.otra)).toEqual({
      ok: false,
      motivo: 'no_autorizado'
    });

    // Sigue vigente para su dueña: el intento ajeno no lo consume.
    expect(await redeemChallenge(desafio.token, usuarios.dueña)).toEqual({
      ok: true,
      usuarioId: usuarios.dueña
    });
  });

  it('quien emite desde el mostrador puede canjearlo por el empleado', async () => {
    const desafio = await issueChallenge(usuarios.otra, {
      kind: 'user',
      userId: usuarios.dueña
    });

    expect(await redeemChallenge(desafio.token, usuarios.dueña)).toEqual({
      ok: true,
      usuarioId: usuarios.otra
    });
  });

  it('un desafio vencido no se canjea y se descarta', async () => {
    const desafio = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });
    await query(
      "UPDATE asistencia_desafios SET expira_en = now() - interval '1 second' WHERE token_hash = ?",
      [hashChallengeToken(desafio.token)]
    );

    expect(await redeemChallenge(desafio.token, usuarios.dueña)).toEqual({
      ok: false,
      motivo: 'vencido'
    });
    expect(
      await query('SELECT 1 FROM asistencia_desafios WHERE token_hash = ?', [
        hashChallengeToken(desafio.token)
      ])
    ).toEqual([]);
  });

  it('declara el vencimiento a 120 segundos', async () => {
    const antes = Date.now();
    const desafio = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });
    const fila = (
      await query<any[]>('SELECT expira_en FROM asistencia_desafios WHERE token_hash = ?', [
        hashChallengeToken(desafio.token)
      ])
    )[0];

    expect(desafio.ttlSegundos).toBe(CHALLENGE_TTL_SECONDS);
    const delta = new Date(fila.expira_en).getTime() - antes;
    expect(delta).toBeGreaterThan(CHALLENGE_TTL_SECONDS * 1000 - 5_000);
    expect(delta).toBeLessThan(CHALLENGE_TTL_SECONDS * 1000 + 5_000);
  });
});

describe('registro de asistencia verificado en el servidor', () => {
  it('registra la asistencia del dueño del desafio', async () => {
    const desafio = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });

    const resultado = await registerAttendance(
      { qrData: desafio.token },
      { id: usuarios.dueña },
      IP
    );

    expect(resultado.success).toBe(true);
    expect(resultado.user).toMatchObject({ id: usuarios.dueña });
    const filas = await asistenciaDeHoy(usuarios.dueña);
    expect(filas).toHaveLength(1);
    expect(filas[0].estado).toBe(1);

    await query('DELETE FROM asistencias WHERE usuario_id = ?', [usuarios.dueña]);
  });

  it('el mismo desafio no registra una segunda asistencia', async () => {
    const desafio = await issueChallenge(usuarios.otra, { kind: 'kiosk', deviceId: 'pantalla-1' });
    await registerAttendance({ qrData: desafio.token }, { id: usuarios.otra }, IP);

    await expect(
      registerAttendance({ qrData: desafio.token }, { id: usuarios.otra }, IP)
    ).rejects.toThrow(/ya se us/i);

    expect(await asistenciaDeHoy(usuarios.otra)).toHaveLength(1);
    await query('DELETE FROM asistencias WHERE usuario_id = ?', [usuarios.otra]);
  });

  it('no se puede marcar la asistencia de otra persona con un desafio ajeno', async () => {
    const desafio = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });

    await expect(
      registerAttendance({ qrData: desafio.token }, { id: usuarios.otra }, IP)
    ).rejects.toThrow(/otra persona/i);

    expect(await asistenciaDeHoy(usuarios.dueña)).toEqual([]);
    expect(await asistenciaDeHoy(usuarios.otra)).toEqual([]);
  });

  it('un token que no fue emitido por el servidor no registra nada', async () => {
    await expect(
      registerAttendance({ qrData: 'token-inventado-por-el-cliente' }, { id: usuarios.dueña }, IP)
    ).rejects.toThrow(/inv[aá]lido/i);

    expect(await asistenciaDeHoy(usuarios.dueña)).toEqual([]);
  });

  it('el codigo de 4 digitos sigue acreditando a quien tiene la sesion', async () => {
    const codigos = await query<any[]>('SELECT codigo FROM codigos WHERE estado = 1 LIMIT 1');
    if (codigos.length === 0) return;

    const resultado = await registerAttendance(
      { qrData: String(codigos[0].codigo) },
      { id: usuarios.dueña },
      IP
    );

    expect(resultado.success).toBe(true);
    await query('DELETE FROM asistencias WHERE usuario_id = ?', [usuarios.dueña]);
    await query('UPDATE codigos SET estado = 1 WHERE codigo = ?', [String(codigos[0].codigo)]);
  });
});

describe('sin sesion no hay asistencia', () => {
  it('un desafio valido sin sesion no registra', async () => {
    const desafio = await issueChallenge(usuarios.dueña, { kind: 'kiosk', deviceId: 'pantalla-1' });

    await expect(registerAttendance({ qrData: desafio.token }, undefined, IP)).rejects.toThrow(
      /sesion activa/i
    );

    expect(await asistenciaDeHoy(usuarios.dueña)).toEqual([]);
  });
});
