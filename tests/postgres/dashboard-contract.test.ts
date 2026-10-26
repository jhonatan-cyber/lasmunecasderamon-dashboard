import { afterAll, describe, expect, it } from 'vitest';
import db from '@/lib/database/db';
import { StatsRepository } from '@/modules/reportes/dashboard/repositorio';
import { DashboardCompositeSchema } from '@/lib/business/schemas/dashboard';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

describe('contrato del dashboard', () => {
  it('el composite real cumple DashboardCompositeSchema', async () => {
    const data = await StatsRepository.getDashboardComposite();

    // El panel recibe JSON, no el objeto de Node: se replica el viaje por la red
    // antes de validar (así también se cubren las claves que JSON omite).
    const wire = JSON.parse(JSON.stringify(data));

    // `parse` lanza con la ruta exacta del campo que dejó de coincidir con el SQL.
    DashboardCompositeSchema.parse(wire);

    // Guardia: el contrato no es un no-op. Si el SQL renombra un alias, falla.
    const sinAlias = { ...wire, cajaStats: { ...wire.cajaStats } };
    delete sinAlias.cajaStats.total_ventas;
    expect(DashboardCompositeSchema.safeParse(sinAlias).success).toBe(false);
  });
});
