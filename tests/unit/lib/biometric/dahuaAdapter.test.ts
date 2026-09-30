// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseDahuaPush } from '@/lib/biometric/adapters/dahua';

describe('push Dahua', () => {
  it('acepta un evento suelto con los campos habituales', () => {
    const { serial, eventos } = parseDahuaPush(
      {
        SerialNo: 'DHI1234',
        UserID: '1001',
        Time: '2026-09-29 21:30:00',
        Mode: 'Face'
      },
      new URLSearchParams()
    );
    expect(serial).toBe('DHI1234');
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      codigo: '1001',
      fechaDispositivo: '2026-09-29 21:30:00',
      metodo: 'cara'
    });
  });

  it('desenvuelve listas tipadas (events/data/records) y variantes de nombre', () => {
    const { eventos } = parseDahuaPush(
      {
        data: [
          { personId: '12', eventTime: '2026-09-29T21:00:00.000Z', verifyType: 1 },
          { pin: '00013', timestamp: '2026-09-29 21:01:00', method: 'card' }
        ]
      },
      new URLSearchParams()
    );
    expect(eventos.map(e => e.codigo)).toEqual(['12', '00013']);
    expect(eventos[0].fechaDispositivo).toBe('2026-09-29 21:00:00');
    expect(eventos.map(e => e.metodo)).toEqual(['huella', 'tarjeta']);
  });

  it('prefiere el serial de la query (la URL que mostramos al vincular)', () => {
    const { serial } = parseDahuaPush(
      { SerialNo: 'DELBODY', UserID: '1' },
      new URLSearchParams('serial=DELAQUERY')
    );
    expect(serial).toBe('DELAQUERY');
  });

  it('acepta el cuerpo como texto JSON', () => {
    const { eventos } = parseDahuaPush(
      JSON.stringify({ UserID: '77', Time: '2026-09-29 21:10:00', Mode: 'Fingerprint' }),
      new URLSearchParams()
    );
    expect(eventos).toHaveLength(1);
    expect(eventos[0].metodo).toBe('huella');
  });

  it('no inventa eventos sin codigo de persona y marca lo desconocido', () => {
    const { eventos } = parseDahuaPush(
      {
        events: [
          { Time: '2026-09-29 21:00:00' },
          { UserID: '9', Mode: 'QR' },
          { UserID: '10', Time: 'sin fecha' }
        ]
      },
      new URLSearchParams()
    );
    expect(eventos).toHaveLength(2);
    expect(eventos[0].metodo).toBe('otro');
    expect(eventos[1].fechaDispositivo).toBeNull();
  });

  it('devuelve cero eventos ante cuerpos ilegibles', () => {
    expect(parseDahuaPush('esto no es json', new URLSearchParams()).eventos).toEqual([]);
    expect(parseDahuaPush(null, new URLSearchParams()).eventos).toEqual([]);
  });
});
