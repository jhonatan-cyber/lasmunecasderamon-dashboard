// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'desafio-1'
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
  return { logger: mocks, default: mocks };
});

import {
  CHALLENGE_TTL_SECONDS,
  buildChallengeToken,
  countActiveChallenges,
  hashChallengeToken,
  issueChallenge,
  redeemChallenge
} from '@/lib/kiosk/attendanceChallenges';

interface Call {
  sql: string;
  params: unknown[];
}

const calls: Call[] = [];

/** Encola respuestas por sentencia: la primera coincidencia en `sql` gana. */
function arrange(responses: Array<[match: string, rows: unknown[]]>) {
  db.queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    const hit = responses.find(([match]) => sql.includes(match));
    return hit ? hit[1] : [];
  });
}

function statementsFor(match: string) {
  return calls.filter(call => call.sql.includes(match));
}

function allParams(): unknown[] {
  return calls.flatMap(call => call.params);
}

beforeEach(() => {
  calls.length = 0;
  db.queryMock.mockReset();
});

describe('emisión de desafíos', () => {
  it('guarda solo el hash: el token crudo nunca llega a la base', async () => {
    arrange([['INSERT INTO asistencia_desafios', []]]);

    const desafio = await issueChallenge('u-1', { kind: 'kiosk', deviceId: 'pantalla-1' });

    const insert = statementsFor('INSERT INTO asistencia_desafios')[0];
    expect(insert).toBeDefined();
    expect(insert.params).toContain(hashChallengeToken(desafio.token));
    expect(allParams()).not.toContain(desafio.token);
    expect(desafio.token).toHaveLength(32);
  });

  it('registra quién lo emitió y con qué alcance', async () => {
    arrange([['INSERT INTO asistencia_desafios', []]]);

    await issueChallenge('u-1', { kind: 'kiosk', deviceId: 'pantalla-1' });
    await issueChallenge('u-2', { kind: 'user', userId: 'cajera-7' });

    const inserts = statementsFor('INSERT INTO asistencia_desafios');
    expect(inserts[0].params).toContain('kiosko:pantalla-1');
    expect(inserts[0].params).toContain(null);
    expect(inserts[1].params).toContain('usuario:cajera-7');
    expect(inserts[1].params).toContain('cajera-7');
  });

  it('un desafío nuevo reemplaza al anterior de esa persona', async () => {
    arrange([['INSERT INTO asistencia_desafios', []]]);

    await issueChallenge('u-1', { kind: 'kiosk', deviceId: 'pantalla-1' });

    const borrados = statementsFor('DELETE FROM asistencia_desafios');
    expect(borrados).toHaveLength(1);
    expect(borrados[0].params).toEqual(['u-1']);
    expect(borrados[0].sql).toContain('usuario_id = ?');
  });

  it('vence a los 120 segundos y lo declara en la respuesta', async () => {
    arrange([['INSERT INTO asistencia_desafios', []]]);
    const antes = Date.now();

    const desafio = await issueChallenge('u-1', { kind: 'kiosk', deviceId: 'pantalla-1' });

    expect(desafio.ttlSegundos).toBe(CHALLENGE_TTL_SECONDS);
    const vencimiento = new Date(desafio.expiraEn).getTime();
    expect(vencimiento).toBeGreaterThanOrEqual(antes + CHALLENGE_TTL_SECONDS * 1000 - 1000);
    expect(vencimiento).toBeLessThanOrEqual(Date.now() + CHALLENGE_TTL_SECONDS * 1000 + 1000);
  });

  it('dos emisiones seguidas no repiten el token', async () => {
    arrange([['INSERT INTO asistencia_desafios', []]]);
    const [a, b] = await Promise.all([
      issueChallenge('u-1', { kind: 'kiosk', deviceId: 'pantalla-1' }),
      issueChallenge('u-2', { kind: 'kiosk', deviceId: 'pantalla-1' })
    ]);
    expect(a.token).not.toBe(b.token);
    expect(buildChallengeToken()).not.toBe(buildChallengeToken());
  });
});

describe('canje de desafíos', () => {
  const vigente = {
    id_desafio: 'desafio-1',
    usuario_id: 'u-1',
    emisor_usuario_id: null,
    expira_en: new Date(Date.now() + 60_000).toISOString(),
    usado_en: null
  };

  it('canjea cuando la sentencia atómica alcanza la fila', async () => {
    arrange([['UPDATE asistencia_desafios', [{ usuario_id: 'u-1' }]]]);

    const resultado = await redeemChallenge('token-crudo', 'u-1');

    expect(resultado).toEqual({ ok: true, usuarioId: 'u-1' });
    expect(allParams()).not.toContain('token-crudo');
    expect(allParams()).toContain(hashChallengeToken('token-crudo'));
  });

  it('reserva el desafío para su dueño o para quien lo emitió, y para nadie más', async () => {
    arrange([['UPDATE asistencia_desafios', []]]);

    await redeemChallenge('token-crudo', 'intruso-1');

    const update = statementsFor('UPDATE asistencia_desafios')[0];
    expect(update.sql).toContain('usado_en IS NULL');
    expect(update.sql).toContain('expira_en > now()');
    expect(update.sql).toContain('usuario_id = ? OR emisor_usuario_id = ?');
    expect(update.params).toEqual([hashChallengeToken('token-crudo'), 'intruso-1', 'intruso-1']);
  });

  it('distingue un token inexistente', async () => {
    arrange([['UPDATE asistencia_desafios', []]]);
    expect(await redeemChallenge('no-existe', 'u-1')).toEqual({ ok: false, motivo: 'no_existe' });
  });

  it('distingue un token ya usado y no lo vuelve a canjear', async () => {
    arrange([
      ['UPDATE asistencia_desafios', []],
      ['SELECT id_desafio', [{ ...vigente, usado_en: new Date().toISOString() }]]
    ]);
    expect(await redeemChallenge('ya-usado', 'u-1')).toEqual({ ok: false, motivo: 'ya_usado' });
  });

  it('distingue un token vencido y lo limpia', async () => {
    arrange([
      ['UPDATE asistencia_desafios', []],
      ['SELECT id_desafio', [{ ...vigente, expira_en: new Date(Date.now() - 1000).toISOString() }]]
    ]);

    expect(await redeemChallenge('vencido', 'u-1')).toEqual({ ok: false, motivo: 'vencido' });

    const borradoPorId = calls.find(call =>
      call.sql.includes('DELETE FROM asistencia_desafios WHERE id_desafio')
    );
    expect(borradoPorId?.params).toEqual(['desafio-1']);
  });

  it('rechaza el canje de un desafío ajeno que todavía es válido', async () => {
    arrange([
      ['UPDATE asistencia_desafios', []],
      ['SELECT id_desafio', [vigente]]
    ]);

    expect(await redeemChallenge('de-otro', 'intruso-1')).toEqual({
      ok: false,
      motivo: 'no_autorizado'
    });
    // No se borra ni se marca: un tercero no puede consumir el desafío de otra persona.
    expect(statementsFor('DELETE FROM asistencia_desafios')).toHaveLength(0);
  });

  it('cuenta los desafíos vigentes sin canjear de una persona', async () => {
    arrange([['SELECT count(*) AS n', [{ n: '2' }]]]);
    expect(await countActiveChallenges('u-1')).toBe(2);
  });
});
