import { describe, expect, it } from 'vitest';
import { partitionGratificaciones } from '@/lib/utils/gratificaciones';
import { Gratificacion } from '@/types/gratificacion';

const row = (overrides: Partial<Gratificacion>): Gratificacion => ({
  id: overrides.id ?? 'r1',
  fecha_hora: '2026-01-01',
  usuario_id: 'user-a',
  usuario: 'Usuario A',
  monto: 1000,
  descripcion: '',
  fecha_crea: '2026-01-01',
  fecha_mod: null,
  estado: 1,
  ...overrides
});

describe('partitionGratificaciones', () => {
  it('separa lo propio de lo solicitado para otros', () => {
    const rows = [
      row({ id: 'r1', usuario_id: 'pepe' }),
      row({ id: 'r2', usuario_id: 'sebas', solicitante_id: 'pepe' }),
      row({ id: 'r3', usuario_id: 'sebas', solicitante_id: 'lola' })
    ];

    const { myGratificaciones, myRequests } = partitionGratificaciones(rows, 'pepe');

    expect(myGratificaciones.map(g => g.id)).toEqual(['r1']);
    expect(myRequests.map(g => g.id)).toEqual(['r2']);
  });

  it('una fila donde el usuario es beneficiario y solicitante a la vez cuenta solo como propia', () => {
    const rows = [row({ id: 'r1', usuario_id: 'pepe', solicitante_id: 'pepe' })];

    const { myGratificaciones, myRequests } = partitionGratificaciones(rows, 'pepe');

    expect(myGratificaciones.map(g => g.id)).toEqual(['r1']);
    expect(myRequests).toEqual([]);
  });

  it('normaliza ids numéricos y string al comparar', () => {
    const rows = [
      row({ id: 'r1', usuario_id: 7 }),
      row({ id: 'r2', usuario_id: 8, solicitante_id: '7' })
    ];

    const { myGratificaciones, myRequests } = partitionGratificaciones(rows, '7');

    expect(myGratificaciones.map(g => g.id)).toEqual(['r1']);
    expect(myRequests.map(g => g.id)).toEqual(['r2']);
  });

  it('solicitante_id null o ausente no genera solicitudes', () => {
    const rows = [row({ id: 'r1', usuario_id: 'sebas', solicitante_id: null })];

    const { myRequests } = partitionGratificaciones(rows, 'pepe');

    expect(myRequests).toEqual([]);
  });

  it('sin sesión identificada entrega todo como propio y nada como solicitado', () => {
    const rows = [row({ id: 'r1', usuario_id: 'pepe' }), row({ id: 'r2', usuario_id: 'sebas' })];

    for (const myId of [null, undefined]) {
      const { myGratificaciones, myRequests } = partitionGratificaciones(rows, myId);
      expect(myGratificaciones).toEqual(rows);
      expect(myRequests).toEqual([]);
    }
  });

  it('no muta el arreglo de entrada', () => {
    const rows = [row({ id: 'r1', usuario_id: 'pepe' })];

    partitionGratificaciones(rows, 'pepe');

    expect(rows).toHaveLength(1);
  });
});
