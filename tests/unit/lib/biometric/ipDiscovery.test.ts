// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Servicio de descubrimiento de IP por MAC.
 *
 * Cubre las tres ramas que importan en producción:
 *   - el equipo responde en su IP (no se mueve nada, se refresca la MAC),
 *   - el DHCP le cambió la IP (se actualiza y se reinicia el listener en vivo),
 *   - no se pudo resolver (error claro según el motivo).
 */

const db = vi.hoisted(() => ({
  queryMock: vi.fn()
}));

const equipo = vi.hoisted(() => ({
  verificarMock: vi.fn(),
  macsCgiMock: vi.fn()
}));

const red = vi.hoisted(() => ({
  buscarMock: vi.fn(),
  macTablaMock: vi.fn(),
  sondeoMock: vi.fn()
}));

const live = vi.hoisted(() => ({ apagar: vi.fn(), encender: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/biometric/deviceClient', () => ({
  credencialesDeFila: (fila: {
    ip: string | null;
    usuario_equipo: string | null;
    clave_cifrada: string | null;
  }) =>
    fila.ip && fila.usuario_equipo && fila.clave_cifrada
      ? { ip: fila.ip, usuario: fila.usuario_equipo, clave: 'secreto' }
      : null,
  verificarConexion: equipo.verificarMock,
  leerMacsDelEquipo: equipo.macsCgiMock
}));

vi.mock('@/lib/biometric/discovery', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/biometric/discovery')>();
  return {
    ...original,
    buscarEquipoPorMac: red.buscarMock,
    macDeTabla: red.macTablaMock,
    sondearPuerto: red.sondeoMock
  };
});

vi.mock('@/lib/biometric/eventListener', () => ({
  apagarListener: live.apagar,
  encenderListener: live.encender
}));

import { descubrirIpDispositivo, guardarMac } from '@/lib/biometric/ipDiscovery';

interface FilaTest {
  id: string;
  nombre: string;
  serial: string;
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
  mac: string | null;
  recoger_registros: number;
}

const FILA: FilaTest = {
  id: 'eq-1',
  nombre: 'Puerta principal',
  serial: 'BF013C7PAJB4D74',
  ip: '192.168.0.33',
  usuario_equipo: 'admin',
  clave_cifrada: 'cifrada',
  mac: null,
  recoger_registros: 1
};

function instalarFila(overrides: Partial<FilaTest> = {}) {
  const fila: FilaTest = { ...FILA, ...overrides };
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM biometric_devices WHERE id = ?')) return [fila];
    if (sql.includes('SELECT mac FROM biometric_devices')) return [{ mac: fila.mac }];
    return [];
  });
  return fila;
}

function escrituras(sqlBuscado: string) {
  return db.queryMock.mock.calls.filter(([sql]) => String(sql).includes(sqlBuscado));
}

beforeEach(() => {
  db.queryMock.mockReset();
  equipo.verificarMock.mockReset();
  equipo.macsCgiMock.mockReset();
  red.buscarMock.mockReset();
  red.macTablaMock.mockReset();
  red.sondeoMock.mockReset();
  live.apagar.mockReset();
  live.encender.mockReset().mockResolvedValue(true);
  instalarFila();
});

describe('descubrirIpDispositivo', () => {
  it('rechaza equipos revocados o inexistentes', async () => {
    db.queryMock.mockResolvedValue([]);
    const resultado = await descubrirIpDispositivo('otro');
    expect(resultado.ok).toBe(false);
    expect(resultado.codigo).toBe('NO_ENCONTRADO');
    expect(red.buscarMock).not.toHaveBeenCalled();
  });

  it('pide credenciales si el equipo no las tiene', async () => {
    instalarFila({ ip: null, usuario_equipo: null, clave_cifrada: null });
    const resultado = await descubrirIpDispositivo('eq-1');
    expect(resultado.ok).toBe(false);
    expect(resultado.codigo).toBe('SIN_CREDENCIALES');
    expect(red.buscarMock).not.toHaveBeenCalled();
  });

  it('con credenciales recién tipeadas busca aunque no haya guardadas', async () => {
    instalarFila({
      ip: null,
      usuario_equipo: null,
      clave_cifrada: null,
      mac: 'e0:2e:fe:dc:e1:0a'
    });
    equipo.verificarMock.mockResolvedValue({
      modelo: 'ASI3213A-W',
      serial: 'BF013C7PAJB4D74',
      version: '1.0'
    });
    red.buscarMock.mockImplementation(
      async ({ ops }: { ops: { serial: (ip: string) => Promise<string | null> } }) => {
        const serial = await ops.serial('192.168.0.77');
        return serial ? { ip: '192.168.0.77', verificada: true } : null;
      }
    );

    const resultado = await descubrirIpDispositivo('eq-1', {
      forzar: true,
      credenciales: { usuario: 'admin', clave: 'nueva' }
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.ipNueva).toBe('192.168.0.77');
    // El serial se confirmó con el usuario/clave recién tipeados.
    expect(equipo.verificarMock).toHaveBeenCalledWith({
      ip: '192.168.0.77',
      usuario: 'admin',
      clave: 'nueva'
    });
    expect(escrituras('SET ip = ?')).toHaveLength(1);
  });

  it('si responde en su IP actual no mueve nada y refresca la MAC', async () => {
    equipo.verificarMock.mockResolvedValue({
      modelo: 'ASI3213A-W',
      serial: 'BF013C7PAJB4D74',
      version: '1.0'
    });
    red.macTablaMock.mockResolvedValue('e0:2e:fe:dc:e1:0a');
    equipo.macsCgiMock.mockRejectedValue(new Error('sin CGI de red'));

    const resultado = await descubrirIpDispositivo('eq-1');

    expect(resultado.ok).toBe(true);
    expect(resultado.cambio).toBe(false);
    expect(resultado.ipNueva).toBe('192.168.0.33');
    expect(resultado.verificada).toBe(true);
    expect(red.buscarMock).not.toHaveBeenCalled();
    expect(live.apagar).not.toHaveBeenCalled();
    expect(escrituras('SET mac')).toHaveLength(1);
    expect(escrituras('SET ip')).toHaveLength(0);
  });

  it('si la IP responde con OTRO serial, re-busca por MAC', async () => {
    equipo.verificarMock.mockResolvedValue({ modelo: 'otro', serial: 'AJENO0001', version: '1.0' });
    red.buscarMock.mockResolvedValue({ ip: '192.168.0.77', verificada: true });

    const resultado = await descubrirIpDispositivo('eq-1', { forzar: true });

    expect(red.buscarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        macs: [],
        ipActual: '192.168.0.33',
        ops: { serial: expect.any(Function) }
      })
    );
    expect(resultado.ok).toBe(true);
    expect(resultado.cambio).toBe(true);
    expect(resultado.ipNueva).toBe('192.168.0.77');
    expect(escrituras('SET ip = ?')).toHaveLength(1);
    expect(live.apagar).toHaveBeenCalledWith('eq-1');
    expect(live.encender).toHaveBeenCalledWith('eq-1');
  });

  it('sin MAC registrada igualmente intenta el barrido (confirmación por serial)', async () => {
    instalarFila({ mac: null });
    red.buscarMock.mockResolvedValue(null);

    const resultado = await descubrirIpDispositivo('eq-1', { forzar: true });

    expect(red.buscarMock.mock.calls[0][0].macs).toEqual([]);
    expect(resultado.ok).toBe(false);
    expect(resultado.codigo).toBe('SIN_MAC');
  });

  it('informa cuándo no aparece en la red', async () => {
    instalarFila({ mac: 'e0:2e:fe:dc:e1:0a' });
    red.buscarMock.mockResolvedValue(null);

    const resultado = await descubrirIpDispositivo('eq-1', { forzar: true });

    expect(resultado.ok).toBe(false);
    expect(resultado.codigo).toBe('FUERA_DE_RED');
    expect(resultado.mensaje).toContain('e0:2e:fe:dc:e1:0a');
    expect(escrituras('SET ip')).toHaveLength(0);
  });

  it('no reenciende el listener si el equipo no recoge registros', async () => {
    instalarFila({ mac: 'e0:2e:fe:dc:e1:0a', recoger_registros: 0 });
    red.buscarMock.mockResolvedValue({ ip: '192.168.0.77', verificada: true });

    await descubrirIpDispositivo('eq-1', { forzar: true });

    expect(live.apagar).toHaveBeenCalled();
    expect(live.encender).not.toHaveBeenCalled();
  });
});

describe('guardarMac', () => {
  it('no escribe si la MAC ya estaba registrada', async () => {
    instalarFila({ mac: 'e0:2e:fe:dc:e1:0a' });
    expect(await guardarMac('eq-1', ['e0:2e:fe:dc:e1:0a'])).toBe(false);
    expect(escrituras('SET mac')).toHaveLength(0);
  });

  it('une la MAC nueva con las que ya había (el equipo tiene dos NICs)', async () => {
    instalarFila({ mac: 'e0:2e:fe:dc:e1:0a' });
    expect(await guardarMac('eq-1', ['E0-2E-FE-DC-E1-0B'])).toBe(true);
    const escritura = escrituras('SET mac')[0];
    expect(escritura[1]).toEqual(['e0:2e:fe:dc:e1:0a,e0:2e:fe:dc:e1:0b', 'eq-1']);
  });

  it('ignora intentos de guardar nada', async () => {
    instalarFila();
    expect(await guardarMac('eq-1', [])).toBe(false);
    expect(escrituras('SET mac')).toHaveLength(0);
  });
});
