// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buscarEquipoPorMac,
  candidatosPorMac,
  coincideMac,
  enteroAIp,
  ipAEntero,
  macsDe,
  normalizarMac,
  parsearVecinosLinux,
  parsearVecinosWindows,
  rangosDeRed
} from '@/lib/biometric/discovery';

/**
 * Descubrimiento del lector por MAC.
 *
 * El equipo está en DHCP: si su IP cambia, el sistema la re-encuentra con
 * (1) la tabla de vecinos/ARP y (2) el serial como confirmación. Acá se cubre
 * lo puro (parsers, rangos, filtrado) y la orquestación con red inyectada, para
 * que ningún test toque la red real.
 */

describe('normalizarMac', () => {
  it('acepta los formatos que sueltan arp -a y configManager', () => {
    expect(normalizarMac('E0-2E-FE-DC-E1-0A')).toBe('e0:2e:fe:dc:e1:0a');
    expect(normalizarMac('e0:2e:fe:dc:e1:0a')).toBe('e0:2e:fe:dc:e1:0a');
    expect(normalizarMac('e0.2e.fe.dc.e1.0a')).toBe('e0:2e:fe:dc:e1:0a');
    expect(normalizarMac(' E0 2E FE DC E1 0A ')).toBe('e0:2e:fe:dc:e1:0a');
  });

  it('rechaza basura y longitudes que no son una MAC', () => {
    expect(normalizarMac('')).toBeNull();
    expect(normalizarMac(null)).toBeNull();
    expect(normalizarMac(undefined)).toBeNull();
    expect(normalizarMac('no-es-una-mac')).toBeNull();
    expect(normalizarMac('e0:2e:fe:dc:e1')).toBeNull();
  });

  it('lee el campo guardado en la BD (lista separada por comas)', () => {
    expect(macsDe('e0:2e:fe:dc:e1:0a,e0:2e:fe:dc:e1:0b')).toEqual([
      'e0:2e:fe:dc:e1:0a',
      'e0:2e:fe:dc:e1:0b'
    ]);
    expect(macsDe(null)).toEqual([]);
    expect(coincideMac('e0:2e:fe:dc:e1:0b', 'E0-2E-FE-DC-E1-0B')).toBe(true);
    expect(coincideMac('e0:2e:fe:dc:e1:0b', 'aa:bb:cc:dd:ee:ff')).toBe(false);
    expect(coincideMac(null, 'aa:bb:cc:dd:ee:ff')).toBe(false);
  });
});

const ARP_WINDOWS = [
  'Interfaz: 192.168.0.2 --- 0x8',
  '  Dirección de Internet      Dirección física      Tipo',
  '  192.168.0.1            e0-2e-fe-dc-e1-0b     dinámico',
  '  192.168.0.33           e0-2e-fe-dc-e1-0a     dinámico',
  '  192.168.0.255          ff-ff-ff-ff-ff-ff     estático',
  '  224.0.0.22             01-00-5e-00-00-16     estático',
  'Fin de la lista'
].join('\r\n');

describe('parsearVecinosWindows (arp -a)', () => {
  it('extrae IPs y MACs descartando broadcast y multicast', () => {
    expect(parsearVecinosWindows(ARP_WINDOWS)).toEqual([
      { ip: '192.168.0.1', mac: 'e0:2e:fe:dc:e1:0b' },
      { ip: '192.168.0.33', mac: 'e0:2e:fe:dc:e1:0a' }
    ]);
  });

  it('devuelve vacío si no hay tabla', () => {
    expect(parsearVecinosWindows('')).toEqual([]);
    expect(parsearVecinosWindows('No se encontran entradas ARP.')).toEqual([]);
  });
});

describe('parsearVecinosLinux (ip -o neigh)', () => {
  it('lee lladdr y ignora las entradas sin MAC', () => {
    const salida = [
      '192.168.0.1 dev wlan0 lladdr e0:2e:fe:dc:e1:0b REACHABLE',
      '192.168.0.33 dev wlan0 lladdr e0:2e:fe:dc:e1:0a STALE',
      '192.168.0.99 dev wlan0 FAILED',
      '192.168.0.100 dev wlan0 INCOMPLETE'
    ].join('\n');
    expect(parsearVecinosLinux(salida)).toEqual([
      { ip: '192.168.0.1', mac: 'e0:2e:fe:dc:e1:0b' },
      { ip: '192.168.0.33', mac: 'e0:2e:fe:dc:e1:0a' }
    ]);
  });
});

describe('rangos de red', () => {
  it('convierte IP <-> entero', () => {
    expect(ipAEntero('192.168.0.33')).toBe(3232235553);
    expect(enteroAIp(3232235553)).toBe('192.168.0.33');
    expect(ipAEntero('1.2.3')).toBeNull();
    expect(ipAEntero('300.1.1.1')).toBeNull();
  });

  it('lista solo los hosts de la red (sin red ni broadcast)', () => {
    const rangos = rangosDeRed([{ nombre: 'eth0', ipv4: '10.0.0.5', netmask: '255.255.255.252' }]);
    expect(rangos).toHaveLength(1);
    expect(rangos[0].base).toBe('10.0.0.4');
    expect(rangos[0].ips).toEqual(['10.0.0.5', '10.0.0.6']);
  });

  it('recorta redes grandes al límite indicado', () => {
    const rangos = rangosDeRed(
      [{ nombre: 'eth0', ipv4: '192.168.1.7', netmask: '255.255.255.0' }],
      5
    );
    expect(rangos[0].ips).toEqual([
      '192.168.1.1',
      '192.168.1.2',
      '192.168.1.3',
      '192.168.1.4',
      '192.168.1.5'
    ]);
  });

  it('salta interfaces sin IPv4 válida', () => {
    expect(
      rangosDeRed([
        { nombre: 'lo', ipv4: '::1', netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff' }
      ])
    ).toEqual([]);
  });
});

describe('candidatosPorMac', () => {
  const vecinos = [
    { ip: '192.168.0.1', mac: 'e0:2e:fe:dc:e1:0b' },
    { ip: '192.168.0.33', mac: 'e0:2e:fe:dc:e1:0a' },
    { ip: '192.168.0.44', mac: 'e0:2e:fe:dc:e1:0a' }
  ];

  it('devuelve solo las IPs con la MAC registrada', () => {
    expect(
      candidatosPorMac({
        vecinos,
        vivas: ['192.168.0.33', '192.168.0.44'],
        macs: ['e0:2e:fe:dc:e1:0a']
      })
    ).toEqual(['192.168.0.33', '192.168.0.44']);
  });

  it('prefiere las que respondieron al barrido', () => {
    expect(
      candidatosPorMac({ vecinos, vivas: ['192.168.0.33'], macs: ['e0:2e:fe:dc:e1:0a'] })
    ).toEqual(['192.168.0.33']);
  });

  it('si el barrido no la vio, igual la propone (la ARP manda)', () => {
    expect(candidatosPorMac({ vecinos, vivas: [], macs: ['e0:2e:fe:dc:e1:0a'] })).toEqual([
      '192.168.0.33',
      '192.168.0.44'
    ]);
  });

  it('no devuelve nada sin MAC registrada', () => {
    expect(candidatosPorMac({ vecinos, vivas: ['192.168.0.33'], macs: [] })).toEqual([]);
  });
});

describe('buscarEquipoPorMac', () => {
  const opsBase = {
    candidatas: () => ['192.168.0.30', '192.168.0.33', '192.168.0.44'],
    barrido: async () => ['192.168.0.33', '192.168.0.44'],
    sondear: async () => false
  };

  it('encuentra la IP nueva por MAC y la confirma con el serial', async () => {
    const resultado = await buscarEquipoPorMac({
      macs: ['e0:2e:fe:dc:e1:0a'],
      ipActual: '192.168.0.99',
      ops: {
        ...opsBase,
        vecinos: async () => [{ ip: '192.168.0.44', mac: 'e0:2e:fe:dc:e1:0a' }],
        serial: async ip => (ip === '192.168.0.44' ? 'BF013C7PAJB4D74' : null)
      }
    });
    expect(resultado).toEqual({ ip: '192.168.0.44', verificada: true });
  });

  it('nunca devuelve una IP cuyo serial no coincide (otro equipo con la IP vieja)', async () => {
    const resultado = await buscarEquipoPorMac({
      macs: ['e0:2e:fe:dc:e1:0a'],
      ipActual: '192.168.0.33',
      ops: {
        ...opsBase,
        vecinos: async () => [
          { ip: '192.168.0.33', mac: 'e0:2e:fe:dc:e1:0a' },
          { ip: '192.168.0.44', mac: 'e0:2e:fe:dc:e1:0a' }
        ],
        serial: async ip => (ip === '192.168.0.44' ? 'BF013C7PAJB4D74' : null)
      }
    });
    expect(resultado).toEqual({ ip: '192.168.0.44', verificada: true });
  });

  it('si nadie responde devuelve null', async () => {
    const resultado = await buscarEquipoPorMac({
      macs: ['e0:2e:fe:dc:e1:0a'],
      ipActual: '192.168.0.33',
      ops: { ...opsBase, vecinos: async () => [], serial: async () => null }
    });
    expect(resultado).toBeNull();
  });

  it('sin MAC registrada cae en el escaneo por serial de lo que responda', async () => {
    const resultado = await buscarEquipoPorMac({
      macs: [],
      ipActual: '192.168.0.33',
      ops: {
        ...opsBase,
        barrido: async () => ['192.168.0.30'],
        vecinos: async () => [],
        serial: async ip => (ip === '192.168.0.30' ? 'BF013C7PAJB4D74' : null)
      }
    });
    expect(resultado).toEqual({ ip: '192.168.0.30', verificada: true });
  });

  it('con la red vacía devuelve null', async () => {
    const resultado = await buscarEquipoPorMac({
      macs: ['e0:2e:fe:dc:e1:0a'],
      ipActual: '127.0.0.1',
      ops: {
        candidatas: () => [],
        barrido: async () => [],
        vecinos: async () => [],
        sondear: async () => false
      }
    });
    expect(resultado).toBeNull();
  });
});
