// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Vigilante de IP: chequea cada tanto si el lector sigue en su IP y, si no,
 * lo re-busca por MAC. Acá se cubren las tres decisiones del ciclo:
 *   - accesible y con serial correcto: no se mueve nada,
 *   - inaccesible: re-búsqueda forzada,
 *   - responde OTRO equipo (se quedó con la IP): también re-búsqueda.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const desc = vi.hoisted(() => ({
  responde: vi.fn(),
  capturar: vi.fn(),
  guardar: vi.fn(),
  descubrir: vi.fn()
}));
const cli = vi.hoisted(() => ({ verificar: vi.fn(), credenciales: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/modules/asistencia/biometrico/ipDiscovery', () => ({
  equipoResponde: desc.responde,
  capturarMacs: desc.capturar,
  guardarMac: desc.guardar,
  descubrirIpDispositivo: desc.descubrir
}));

vi.mock('@/modules/asistencia/biometrico/deviceClient', () => ({
  verificarConexion: cli.verificar,
  credencialesDeFila: cli.credenciales
}));

import {
  arrancarVigilanteIp,
  detenerVigilanteIp,
  vigilarUnaVez,
  vigilanteCorriendo
} from '@/modules/asistencia/biometrico/ipWatcher';

const EQUIPOS = [
  {
    id: 'eq-1',
    serial: 'BF013C7PAJB4D74',
    ip: '192.168.0.33',
    usuario_equipo: 'admin',
    clave_cifrada: 'cifrada'
  }
];

beforeEach(() => {
  db.queryMock.mockReset().mockResolvedValue(EQUIPOS);
  desc.responde.mockReset().mockResolvedValue(true);
  desc.capturar.mockReset().mockResolvedValue(['e0:2e:fe:dc:e1:0a']);
  desc.guardar.mockReset().mockResolvedValue(true);
  desc.descubrir.mockReset().mockResolvedValue({ ok: true, cambio: false });
  cli.verificar.mockReset().mockResolvedValue({ serial: 'BF013C7PAJB4D74' });
  cli.credenciales
    .mockReset()
    .mockReturnValue({ ip: '192.168.0.33', usuario: 'admin', clave: 'x' });
  detenerVigilanteIp();
});

describe('vigilarUnaVez', () => {
  it('si el equipo responde con su serial, solo refresca la MAC', async () => {
    await vigilarUnaVez();

    expect(desc.descubrir).not.toHaveBeenCalled();
    expect(desc.capturar).toHaveBeenCalledTimes(1);
    expect(desc.guardar).toHaveBeenCalledWith('eq-1', ['e0:2e:fe:dc:e1:0a']);
  });

  it('si el puerto no responde, re-busca el equipo por MAC', async () => {
    desc.responde.mockResolvedValue(false);

    await vigilarUnaVez();

    expect(desc.descubrir).toHaveBeenCalledWith('eq-1', { forzar: true });
    expect(cli.verificar).not.toHaveBeenCalled();
  });

  it('si la IP responde pero con OTRO serial, re-busca igual', async () => {
    cli.verificar.mockResolvedValue({ serial: 'AJENO0001' });

    await vigilarUnaVez();

    expect(desc.descubrir).toHaveBeenCalledWith('eq-1', { forzar: true });
    expect(desc.capturar).not.toHaveBeenCalled();
  });

  it('un equipo sin credenciales se saltea sin tumbar el ciclo', async () => {
    cli.credenciales.mockReturnValue(null);

    await vigilarUnaVez();

    expect(desc.descubrir).not.toHaveBeenCalled();
    expect(desc.responde).not.toHaveBeenCalled();
  });

  it('un fallo en un equipo no impide procesar los demás', async () => {
    db.queryMock.mockResolvedValue([EQUIPOS[0], { ...EQUIPOS[0], id: 'eq-2', ip: '192.168.0.44' }]);
    desc.responde.mockRejectedValueOnce(new Error('red caída')).mockResolvedValue(false);

    await vigilarUnaVez();

    expect(desc.descubrir).toHaveBeenCalledTimes(1);
    expect(desc.descubrir).toHaveBeenCalledWith('eq-2', { forzar: true });
  });
});

describe('arrancarVigilanteIp', () => {
  it('es idempotente y se puede detener', () => {
    expect(vigilanteCorriendo()).toBe(false);

    arrancarVigilanteIp();
    expect(vigilanteCorriendo()).toBe(true);

    arrancarVigilanteIp();
    expect(vigilanteCorriendo()).toBe(true);

    detenerVigilanteIp();
    expect(vigilanteCorriendo()).toBe(false);
  });
});
