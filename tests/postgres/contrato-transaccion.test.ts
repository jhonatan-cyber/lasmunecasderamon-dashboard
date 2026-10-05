/**
 * El contrato transaccional de la Fase 1 y su primera prueba de fuego: el
 * módulo migrado de la Fase 2 (Personal — horas extras) escribiendo dentro de
 * una unidad ajena.
 *
 * El contrato entrega a los participantes un contexto opaco sin SQL. La
 * resolución del contexto al ejecutor vive en
 * `lib/transaccion/infraestructura.ts` — la «infraestructura autorizada» del
 * §6 — y la puerta `infra-transaccional-autorizada` restringe su import a la
 * infraestructura de los módulos. Este archivo prueba ambos lados: la forma y
 * el ciclo de vida del contrato, y que una escritura real del módulo se
 * confirma o revierte junto con toda la unidad.
 */
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));

import db, { query } from '@/lib/database/db';
import { enUnaUnidad, type UnidadDeTrabajo } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { registrarHoraExtra } from '@/modules/personal';

const USUARIO_PRUEBA = 'lb-contrato-horas-extras';

afterAll(async () => {
  await query('DELETE FROM horas_extras WHERE usuario_id = ?', [USUARIO_PRUEBA]);
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

describe('contrato transaccional (§6)', () => {
  it('abre una unidad con identificador y la deja cerrada al terminar', async () => {
    let vista: UnidadDeTrabajo | null = null;
    await enUnaUnidad(async unidad => {
      vista = unidad;
      expect(unidad.abierta).toBe(true);
      expect(unidad.id).toMatch(/^[0-9a-f-]{36}$/);
    });
    // Quien llama necesita ver el estado real para no lanzar efectos externos dos
    // veces (§6: los avisos van después del commit, nunca antes).
    expect(vista!.abierta).toBe(false);
  });

  it('propaga el error de la operación y no deja la unidad abierta', async () => {
    let vista: UnidadDeTrabajo | null = null;
    await expect(
      enUnaUnidad(async unidad => {
        vista = unidad;
        throw new Error('falla deliberada');
      })
    ).rejects.toThrow('falla deliberada');
    expect(vista!.abierta).toBe(false);
  });

  it('rechaza operaciones sobre una unidad ya cerrada', async () => {
    let vista: UnidadDeTrabajo | null = null;
    await enUnaUnidad(async unidad => {
      vista = unidad;
    });
    await expect(vista!.ejecutar(async () => 1)).rejects.toThrow(/ya no admite/);
  });

  it('el contexto que recibe la operación no lleva SQL', async () => {
    await enUnaUnidad(async unidad => {
      const contexto = await unidad.ejecutar(async c => c);
      // El contrato entrega identidad, no acceso a la base de datos. Si alguien
      // añade `trx`, `query` o `client` aquí, esta aserción deja de compilar.
      const crudo = contexto as unknown as Record<string, unknown>;
      expect(Object.keys(contexto)).toEqual(['id']);
      expect(crudo.trx).toBeUndefined();
      expect(crudo.query).toBeUndefined();
      expect(crudo.client).toBeUndefined();
    });
  });

  it('anida sin abrir una segunda transacción', async () => {
    const resultado = await enUnaUnidad(async unidad => {
      const dentro = await enUnaUnidad(async otra => {
        expect(otra.abierta).toBe(true);
        return 'interna';
      });
      return `${dentro}:${unidad.abierta}`;
    });
    expect(resultado).toBe('interna:true');
  });
});

describe('resolución autorizada del contexto (§6)', () => {
  it('falla con un contexto que no proviene de ninguna unidad', () => {
    expect(() => resolverTransaccion({ id: crypto.randomUUID() })).toThrow(
      /no tiene transacción resoluble/
    );
  });

  it('falla con el contexto de una unidad ya cerrada', async () => {
    let contexto: { id: string } | null = null;
    await enUnaUnidad(async unidad => {
      contexto = await unidad.ejecutar(async c => c);
    });
    // La unidad confirmó; su ejecutor quedó liberado. Escribir después sería
    // operar sobre una transacción que ya no existe, justo lo que el §6 prohíbe.
    expect(() => resolverTransaccion(contexto!)).toThrow(/no tiene transacción resoluble/);
  });
});

describe('módulo migrado dentro de la unidad (Fase 2)', () => {
  it('el módulo escribe con el contexto opaco y todo se confirma junto', async () => {
    await query('DELETE FROM horas_extras WHERE usuario_id = ?', [USUARIO_PRUEBA]);
    const registrada = await enUnaUnidad(async unidad =>
      unidad.ejecutar(contexto =>
        registrarHoraExtra({ usuario_id: USUARIO_PRUEBA, hora: 1, monto: 100 }, contexto)
      )
    );
    expect(registrada).not.toBeNull();
    const filas = await query<any[]>('SELECT * FROM horas_extras WHERE id_hora_extra = ?', [
      registrada!.id_hora_extra
    ]);
    expect(filas).toHaveLength(1);
    expect(Number(filas[0].total)).toBe(100);
  });

  it('un fallo después de escribir revierte lo escrito por el módulo', async () => {
    await query('DELETE FROM horas_extras WHERE usuario_id = ?', [USUARIO_PRUEBA]);
    let idFila = '';
    await expect(
      enUnaUnidad(async unidad => {
        const fila = await unidad.ejecutar(contexto =>
          registrarHoraExtra({ usuario_id: USUARIO_PRUEBA, hora: 2, monto: 500 }, contexto)
        );
        idFila = fila!.id_hora_extra;
        throw new Error('falla deliberada tras escribir');
      })
    ).rejects.toThrow('falla deliberada tras escribir');

    const filas = await query<any[]>('SELECT * FROM horas_extras WHERE id_hora_extra = ?', [
      idFila
    ]);
    expect(filas).toHaveLength(0);
  });

  it('una operación aislada del módulo sigue yendo por el pool', async () => {
    await query('DELETE FROM horas_extras WHERE usuario_id = ?', [USUARIO_PRUEBA]);
    const registrada = await registrarHoraExtra({
      usuario_id: USUARIO_PRUEBA,
      hora: 1,
      monto: 200
    });
    expect(registrada).not.toBeNull();
    expect(Number(registrada!.total)).toBe(200);
    await query('DELETE FROM horas_extras WHERE id_hora_extra = ?', [registrada!.id_hora_extra]);
  });
});
