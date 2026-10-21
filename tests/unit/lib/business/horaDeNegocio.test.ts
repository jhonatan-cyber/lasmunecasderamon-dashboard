import { afterEach, describe, expect, it } from 'vitest';
import { horaDeNegocio } from '@/lib/business/timezoneService';

/**
 * La hora de una colación se muestra tal como se registró, en la zona horaria
 * del negocio.
 *
 * Las fechas de la API llegan como texto naive ("2026-10-20 21:10:00"), no
 * como instante. Convertirlas con `new Date` las hace depender de la zona del
 * navegador y, además, ese formato con espacio no lo parsea Safari.
 */
describe('horaDeNegocio', () => {
  const tzOriginal = process.env.TZ;

  afterEach(() => {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  });

  it('devuelve la hora del texto naive sin moverla', () => {
    expect(horaDeNegocio('2026-10-20 21:10:00')).toBe('21:10');
    expect(horaDeNegocio('2026-10-20T21:10:00')).toBe('21:10');
  });

  it('no depende de la zona horaria del proceso', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(horaDeNegocio('2026-10-20 21:10:00')).toBe('21:10');

    process.env.TZ = 'UTC';
    expect(horaDeNegocio('2026-10-20 21:10:00')).toBe('21:10');
  });

  it('traduce un instante a la hora del negocio', () => {
    // 21:10 UTC en Chile (invierno, UTC-3) son las 18:10 del negocio.
    process.env.TZ = 'Asia/Tokyo';
    expect(horaDeNegocio('2026-10-20T21:10:00Z')).toBe('18:10');
  });

  it('devuelve un guion cuando la fecha no se puede leer', () => {
    expect(horaDeNegocio('no es una fecha')).toBe('—');
  });
});
