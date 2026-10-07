import { describe, expect, it } from 'vitest';
import {
  calcularRankingAsistencia,
  type HistorialAsistencia
} from '@/modules/asistencia/marcas/ranking';

const usuario = (id: string, primera: string, presentes: string[]): HistorialAsistencia => ({
  id_usuario: id,
  nick: id,
  nombre_completo: id,
  rol: 'Garzon',
  primera_fecha: primera,
  ultima_fecha: presentes.at(-1) ?? primera,
  fechas_presentes: presentes
});

describe('ranking con jornada martes a domingo', () => {
  it('no cuenta lunes ni marcas duplicadas y separa los ganadores', () => {
    const r = calcularRankingAsistencia(
      [
        usuario('A', '2026-09-29', [
          '2026-09-29',
          '2026-09-29',
          '2026-09-30',
          '2026-10-01',
          '2026-10-02',
          '2026-10-03',
          '2026-10-04',
          '2026-10-05'
        ]),
        usuario('B', '2026-09-29', ['2026-09-29'])
      ],
      '2026-10-05'
    );
    expect(r.mas_asistencias[0]).toMatchObject({ id_usuario: 'A', asistencias: 6, faltas: 0 });
    expect(r.mas_faltas[0]).toMatchObject({ id_usuario: 'B', faltas: 5 });
  });
  it('respeta rango inclusivo y primera marca de cada usuario', () => {
    const r = calcularRankingAsistencia(
      [usuario('A', '2026-09-29', ['2026-10-04']), usuario('B', '2026-10-04', ['2026-10-04'])],
      '2026-10-04',
      '2026-10-03'
    );
    expect(r.mas_faltas[0]).toMatchObject({ id_usuario: 'A', faltas: 1, asistencias: 1 });
    expect(r.mas_asistencias).toHaveLength(2);
  });
  it('no cuenta después del límite y devuelve vacío sin período evaluable', () => {
    expect(
      calcularRankingAsistencia([usuario('A', '2026-10-06', ['2026-10-06'])], '2026-10-05')
        .mas_asistencias
    ).toEqual([]);
    expect(calcularRankingAsistencia([], '2026-10-05').mas_faltas).toEqual([]);
  });
});
