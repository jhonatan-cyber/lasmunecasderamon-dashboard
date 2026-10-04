// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildAdmsOptions,
  parseAttlog,
  serialFromParams,
  tableFromParams
} from '@/modules/asistencia/biometrico/adapters/zkteco';

describe('handshake ADMS', () => {
  it('responde las opciones que el equipo pide para empezar a conectarse', () => {
    const opciones = buildAdmsOptions('QJT3253600356');
    expect(opciones).toContain('GET OPTION FROM: QJT3253600356');
    expect(opciones).toContain('TransInterval=1');
    expect(opciones).toContain('Realtime=1');
    expect(opciones).toContain('Encrypt=None');
    expect(opciones.split('\n').at(-2)).toBe('0');
  });

  it('lee el serial de la query con cualquiera de sus formas', () => {
    expect(serialFromParams(new URLSearchParams('SN=ABC123'))).toBe('ABC123');
    expect(serialFromParams(new URLSearchParams('sn=abc123'))).toBe('abc123');
    expect(serialFromParams(new URLSearchParams('other=1'))).toBeNull();
    expect(tableFromParams(new URLSearchParams('table=attlog'))).toBe('ATTLOG');
  });
});

describe('ATTLOG', () => {
  it('parsea codigo, fecha y modalidad', () => {
    const eventos = parseAttlog('1001\t2026-09-29 21:30:00\t1\t0\t0\t');
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      codigo: '1001',
      fechaDispositivo: '2026-09-29 21:30:00',
      metodo: 'huella'
    });
  });

  it('mapea los modos de verificacion documentados (15=cara, 4=tarjeta, 0=clave)', () => {
    const cuerpo = [
      '1\t2026-09-29 21:00:00\t15\t1\t\t',
      '2\t2026-09-29 21:01:00\t4\t1\t\t',
      '3\t2026-09-29 21:02:00\t0\t1\t\t',
      '4\t2026-09-29 21:03:00\t99\t1\t\t'
    ].join('\n');
    const eventos = parseAttlog(cuerpo);
    expect(eventos.map(e => e.metodo)).toEqual(['cara', 'tarjeta', 'clave', 'otro']);
  });

  it('descarta lineas corruptas en lugar de inventar registros', () => {
    const cuerpo = [
      '1001\t2026-09-29 21:30:00\t1',
      'linea sin tabs',
      '\t2026-09-29 21:00:00',
      '1005\tayer 21:00',
      ''
    ].join('\n');
    const eventos = parseAttlog(cuerpo);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].codigo).toBe('1001');
  });

  it('acepta hora corta (HH:mm) y fecha con T', () => {
    const eventos = parseAttlog('7\t2026-09-29T21:45\t1\t0\t');
    expect(eventos[0].fechaDispositivo).toBe('2026-09-29 21:45:00');
  });

  it('conserva la fila cruda para la auditoria', () => {
    const fila = '1001\t2026-09-29 21:30:00\t1\t0\t0\t';
    expect(parseAttlog(fila)[0].raw).toBe(fila);
  });
});
