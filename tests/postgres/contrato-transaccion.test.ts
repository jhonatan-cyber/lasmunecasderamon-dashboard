/**
 * El contrato transaccional de la Fase 1.
 *
 * Hay una limitación que conviene tener presente antes de leer este archivo: un
 * contrato opaco **no puede escribir dentro de la transacción por sí solo**. Que un
 * módulo escriba usando la unidad es trabajo de su repositorio, y ningún módulo ha
 * sido migrado todavía. Por eso aquí se comprueba la forma y el ciclo de vida del
 * contrato, y la atomicidad extremo a extremo sigue cubriéndose con el mecanismo
 * que hoy sí funciona: `withTransaction`, verificado en
 * `tests/postgres/cobro-con-venta.test.ts`.
 *
 * Inventar una vía de escritura dentro de la unidad —expuesta aquí— sería
 * reintroducir exactamente el `TransactionQuery` que el §6 quiere quitar, sólo que
 * con otro nombre.
 */
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));

import db from '@/lib/database/db';
import { enUnaUnidad, type UnidadDeTrabajo } from '@/lib/transaccion/contrato';

afterAll(async () => {
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
