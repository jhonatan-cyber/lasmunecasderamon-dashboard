import { describe, expect, it } from 'vitest';
import {
  esFechaISO,
  estadoVencimiento,
  resolverVencimiento,
  resumenVencimientos,
  sumarMeses,
  vencimientoCalculado
} from '@/lib/business/vencimiento';

describe('esFechaISO', () => {
  it('acepta fechas reales y rechaza inexistentes o mal formadas', () => {
    expect(esFechaISO('2026-01-31')).toBe(true);
    expect(esFechaISO('2024-02-29')).toBe(true); // bisiesto
    expect(esFechaISO('2026-02-31')).toBe(false);
    expect(esFechaISO('2026-02-29')).toBe(false); // no bisiesto
    expect(esFechaISO('31-01-2026')).toBe(false);
    expect(esFechaISO('2026-1-5')).toBe(false);
    expect(esFechaISO('')).toBe(false);
    expect(esFechaISO(null)).toBe(false);
    expect(esFechaISO(undefined)).toBe(false);
  });
});

describe('sumarMeses', () => {
  it('suma meses naturales a la fecha de elaboración', () => {
    expect(sumarMeses('2026-01-01', 3)).toBe('2026-04-01');
    expect(sumarMeses('2026-11-15', 2)).toBe('2027-01-15');
    expect(sumarMeses('2026-01-01', 12)).toBe('2027-01-01');
  });

  it('recorta el día cuando el mes más largo no llega', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2024-01-31', 1)).toBe('2024-02-29'); // bisiesto
    expect(sumarMeses('2026-03-31', 1)).toBe('2026-04-30');
    expect(sumarMeses('2026-05-31', 2)).toBe('2026-07-31');
  });

  it('devuelve null con fechas o duraciones inválidas', () => {
    expect(sumarMeses('2026-02-31', 1)).toBeNull();
    expect(sumarMeses('', 1)).toBeNull();
    expect(sumarMeses(null, 1)).toBeNull();
    expect(sumarMeses('2026-01-01', 0)).toBeNull();
    expect(sumarMeses('2026-01-01', -2)).toBeNull();
    expect(sumarMeses('2026-01-01', 1.5)).toBeNull();
    expect(sumarMeses('2026-01-01', 'seis')).toBeNull();
  });
});

describe('vencimientoCalculado', () => {
  it('calcula con elaboración y duración, y espera si falta algo', () => {
    expect(vencimientoCalculado('2026-01-01', 6)).toBe('2026-07-01');
    expect(vencimientoCalculado('2026-01-01', '6')).toBe('2026-07-01');
    expect(vencimientoCalculado('2026-01-01', '')).toBeNull();
    expect(vencimientoCalculado('2026-01-01', null)).toBeNull();
    expect(vencimientoCalculado('', 6)).toBeNull();
    expect(vencimientoCalculado(null, 6)).toBeNull();
  });
});

describe('resolverVencimiento', () => {
  it('respeta el vencimiento informado a mano', () => {
    expect(
      resolverVencimiento({
        fecha_elaboracion: '2026-01-01',
        duracion_meses: 6,
        fecha_vencimiento: '2026-12-31'
      })
    ).toBe('2026-12-31');
  });

  it('calcula cuando no se informó el vencimiento', () => {
    expect(
      resolverVencimiento({
        fecha_elaboracion: '2026-01-01',
        duracion_meses: 6,
        fecha_vencimiento: null
      })
    ).toBe('2026-07-01');
    expect(
      resolverVencimiento({
        fecha_elaboracion: '2026-01-01',
        duracion_meses: '6'
      })
    ).toBe('2026-07-01');
  });

  it('queda en null cuando no hay con qué calcular', () => {
    expect(resolverVencimiento({ fecha_elaboracion: '2026-01-01' })).toBeNull();
    expect(resolverVencimiento({ duracion_meses: 6 })).toBeNull();
    expect(resolverVencimiento({})).toBeNull();
    // Vencimiento ilegible no tapa el cálculo cuando sí hay datos.
    expect(
      resolverVencimiento({
        fecha_elaboracion: '2026-01-01',
        duracion_meses: 6,
        fecha_vencimiento: 'ayer'
      })
    ).toBe('2026-07-01');
  });
});

describe('estadoVencimiento', () => {
  const HOY = '2026-10-23';

  it('marca vencido, por vencer y vigente', () => {
    expect(estadoVencimiento('2026-10-20', HOY)).toMatchObject({ estado: 'vencido', dias: -3 });
    // El mismo día del vencimiento todavía es "por vencer" (vence hoy).
    expect(estadoVencimiento('2026-10-23', HOY)).toMatchObject({ estado: 'por_vencer', dias: 0 });
    expect(estadoVencimiento('2026-11-22', HOY)).toMatchObject({ estado: 'por_vencer', dias: 30 });
    expect(estadoVencimiento('2026-11-23', HOY)).toMatchObject({ estado: 'vigente', dias: 31 });
  });

  it('respeta una ventana de aviso distinta', () => {
    // A 13 días: dentro de una ventana de 30, fuera de una de 7.
    expect(estadoVencimiento('2026-11-05', HOY, 30)).toMatchObject({ estado: 'por_vencer' });
    expect(estadoVencimiento('2026-11-05', HOY, 7)).toMatchObject({ estado: 'vigente' });
    // A 5 días entra incluso en la ventana corta.
    expect(estadoVencimiento('2026-10-28', HOY, 7)).toMatchObject({
      estado: 'por_vencer',
      dias: 5
    });
    expect(estadoVencimiento('2026-10-28', HOY, 1)).toMatchObject({ estado: 'vigente' });
  });

  it('devuelve null sin fecha válida', () => {
    expect(estadoVencimiento(null, HOY)).toBeNull();
    expect(estadoVencimiento(undefined, HOY)).toBeNull();
    expect(estadoVencimiento('', HOY)).toBeNull();
    expect(estadoVencimiento('2026-02-31', HOY)).toBeNull();
    expect(estadoVencimiento('ayer', HOY)).toBeNull();
  });
});

describe('resumenVencimientos', () => {
  it('cuenta vencidos y por vencer e ignora las fechas vacías', () => {
    expect(
      resumenVencimientos(
        [
          '2026-10-01', // vencido
          '2026-10-20', // vencido
          '2026-10-23', // vence hoy
          '2026-11-10', // por vencer (18 días)
          '2027-01-01', // vigente
          null,
          undefined,
          ''
        ],
        '2026-10-23'
      )
    ).toEqual({ vencidos: 2, porVencer: 2 });
  });

  it('queda en cero sin lotes en riesgo', () => {
    expect(resumenVencimientos([], '2026-10-23')).toEqual({ vencidos: 0, porVencer: 0 });
    expect(resumenVencimientos(['2027-05-01'], '2026-10-23')).toEqual({
      vencidos: 0,
      porVencer: 0
    });
  });
});
