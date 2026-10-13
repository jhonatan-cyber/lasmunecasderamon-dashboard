import { expect, it, vi } from 'vitest';
import { verificarYMarcarEnvase } from '@/modules/inventario/envases/repositorio';
import type { TransactionQuery } from '@/lib/database/db';

const scanned = {
  id: 'fisica',
  producto_id: 'p1',
  presentacion_id: 'pres1',
  codigo: 'LM-000002',
  estado: 'almacen',
  ubicacion: 'bar',
  ml_restante: 0,
  abierta_por_shots: false,
  fecha_devolucion: null
};

it.each([0, 35])(
  'concilia el envase físico con el consumo pendiente y registra %s ml de merma',
  async ml => {
    const trx = vi.fn(async (sql: string) => {
      if (sql.includes('FROM configuraciones')) return [];
      if (sql.startsWith('DELETE FROM inventario_movimiento_unidades'))
        return [{ movimiento_id: 'sale', unidad_id: 'logica', ml_consumido: 750 }];
      if (sql.includes('SET fecha_devolucion')) return [{ id: 'fisica' }];
      if (sql.includes('id <> ?'))
        return [
          {
            id: 'logica',
            estado: ml ? 'almacen' : 'vendida',
            ml_restante: ml,
            abierta_por_shots: true
          }
        ];
      if (sql.includes('WHERE u.')) return [scanned];
      return [];
    });
    const result = await verificarYMarcarEnvase(trx as TransactionQuery, scanned.codigo, 'barman');
    expect(result.ok).toBe(true);
    expect(result.unidad).toMatchObject({ id: 'fisica', codigo: 'LM-000002', ml_merma: ml });
    const candidate = trx.mock.calls.find(([sql]) => sql.includes('id <> ?'))!;
    expect(candidate[0]).toContain('producto_id = ? AND presentacion_id = ?');
    expect(candidate[0]).toContain('fecha_devolucion IS NULL');
    expect(trx).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO inventario_movimiento_unidades'),
      ['sale', 'fisica', 750]
    );
    expect(trx).toHaveBeenCalledWith(expect.stringContaining('abierta_por_shots = ?'), [
      'almacen',
      0,
      0,
      false,
      'logica'
    ]);
  }
);

it('rechaza el envase si no hay consumo de corto pendiente de esa presentación', async () => {
  const trx = vi.fn(async (sql: string) => (sql.includes('WHERE u.') ? [scanned] : []));
  const result = await verificarYMarcarEnvase(trx as TransactionQuery, scanned.codigo, 'barman');
  expect(result).toMatchObject({ ok: false, motivo: 'no_esta_vacia' });
  expect(
    trx.mock.calls.some(([sql]) => sql.startsWith('UPDATE') || sql.includes('WITH vinculos'))
  ).toBe(false);
});

it('rechaza el reescaneo sin reasignar otro consumo pendiente', async () => {
  const trx = vi.fn(async (sql: string) =>
    sql.includes('WHERE u.') ? [{ ...scanned, fecha_devolucion: '2026-10-12 12:00:00' }] : []
  );
  expect(
    await verificarYMarcarEnvase(trx as TransactionQuery, scanned.codigo, 'barman')
  ).toMatchObject({ ok: false, motivo: 'ya_devuelto' });
  expect(trx.mock.calls.some(([sql]) => sql.includes('id <> ?'))).toBe(false);
});
