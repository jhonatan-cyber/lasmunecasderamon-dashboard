import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Ciclo de vida de la recepción biométrica (Fase 3, riesgo R4).
 *
 * Lo que se fija aquí es lo que la puerta no puede ver: que arrancar es
 * idempotente aunque se llame dos veces (el guard sobrevive a la recarga de
 * módulos porque vive en `globalThis`), que un fallo deja el estado como
 * estaba para poder reintentar, y que detener apaga los tres subsistemas en
 * orden. Los subsistemas se mockean: esto es ciclo de vida, no biometría.
 */
// vi.mock se hoistea: el objeto de dobles tiene que existir antes que él.
const arranque = vi.hoisted(() => ({
  arrancarPoller: vi.fn(),
  detenerPoller: vi.fn(),
  encenderTodos: vi.fn(async () => undefined),
  apagarListener: vi.fn(),
  listenersActivos: vi.fn(() => [] as string[]),
  arrancarVigilanteIp: vi.fn(),
  detenerVigilanteIp: vi.fn()
}));
const persistencia = vi.hoisted(() => ({
  connect: vi.fn(),
  cliente: {
    query: vi.fn(),
    release: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}));
const configRecepcion = vi.hoisted(() => ({ habilitada: vi.fn(async () => true) }));

vi.mock('@/modules/asistencia/biometrico/recordPoller', () => ({
  arrancarPoller: arranque.arrancarPoller,
  detenerPoller: arranque.detenerPoller
}));
vi.mock('@/modules/asistencia/biometrico/eventListener', () => ({
  encenderTodos: arranque.encenderTodos,
  apagarListener: arranque.apagarListener,
  listenersActivos: arranque.listenersActivos
}));
vi.mock('@/modules/asistencia/biometrico/ipWatcher', () => ({
  arrancarVigilanteIp: arranque.arrancarVigilanteIp,
  detenerVigilanteIp: arranque.detenerVigilanteIp
}));
// El interruptor compartido lee configuraciones de la base: en tests se fija encendido.
vi.mock('@/modules/asistencia/biometrico/recepcionConfig', () => ({
  recepcionAutomaticaHabilitada: configRecepcion.habilitada
}));
vi.mock('@/lib/database/db', () => ({
  default: { pool: { connect: persistencia.connect } }
}));

import {
  arrancarRecepcionBiometrica,
  detenerRecepcionBiometrica,
  recepcionActiva
} from '@/modules/asistencia/procesos';

const estadoGlobal = globalThis as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  persistencia.connect.mockResolvedValue(persistencia.cliente);
  persistencia.cliente.query.mockResolvedValue({ rows: [{ adquirido: true }] });
  configRecepcion.habilitada.mockResolvedValue(true);
  arranque.encenderTodos.mockResolvedValue(undefined);
  arranque.listenersActivos.mockReturnValue([]);
  // El módulo capturó este objeto la primera vez que se evaluó: hay que
  // apagarlo, no borrarlo, para partir de limpio en cada test.
  const estado = estadoGlobal.__asistenciaRecepcion as { arrancada: boolean } | undefined;
  if (estado) {
    estado.arrancada = false;
    Object.assign(estado, { arrancando: false, lockClient: null, lockErrorHandler: null });
  }
});

afterEach(async () => {
  await detenerRecepcionBiometrica();
  vi.restoreAllMocks();
});

describe('arrancarRecepcionBiometrica', () => {
  it('enciende poller, listeners en vivo y vigilante de IP', async () => {
    await arrancarRecepcionBiometrica();

    expect(arranque.arrancarPoller).toHaveBeenCalledTimes(1);
    expect(arranque.encenderTodos).toHaveBeenCalledTimes(1);
    expect(arranque.arrancarVigilanteIp).toHaveBeenCalledTimes(1);
    expect(recepcionActiva()).toBe(true);
  });

  it('adquiere el lock de PostgreSQL antes de encender los lectores', async () => {
    await arrancarRecepcionBiometrica();

    expect(persistencia.connect).toHaveBeenCalledTimes(1);
    expect(persistencia.cliente.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_try_advisory_lock'),
      expect.any(Array)
    );
    expect(arranque.encenderTodos).toHaveBeenCalledTimes(1);
  });

  it('no enciende lectores si otra instancia conserva el lock', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    persistencia.cliente.query.mockResolvedValueOnce({ rows: [{ adquirido: false }] });

    await arrancarRecepcionBiometrica();

    expect(arranque.arrancarPoller).not.toHaveBeenCalled();
    expect(arranque.encenderTodos).not.toHaveBeenCalled();
    expect(persistencia.cliente.release).toHaveBeenCalledTimes(1);
    expect(recepcionActiva()).toBe(false);
  });

  it('cancela el arranque en curso cuando se apaga la recepción', async () => {
    let resolver: ((enabled: boolean) => void) | undefined;
    configRecepcion.habilitada.mockImplementationOnce(
      () => new Promise(resolve => (resolver = resolve))
    );
    const arranqueEnCurso = arrancarRecepcionBiometrica();
    await Promise.resolve();

    await detenerRecepcionBiometrica();
    resolver?.(true);
    await arranqueEnCurso;

    expect(persistencia.connect).not.toHaveBeenCalled();
    expect(arranque.encenderTodos).not.toHaveBeenCalled();
    expect(recepcionActiva()).toBe(false);
  });

  it('es idempotente: arrancar dos veces no duplica procesos', async () => {
    await arrancarRecepcionBiometrica();
    await arrancarRecepcionBiometrica();

    expect(arranque.arrancarPoller).toHaveBeenCalledTimes(1);
    expect(arranque.encenderTodos).toHaveBeenCalledTimes(1);
    expect(arranque.arrancarVigilanteIp).toHaveBeenCalledTimes(1);
  });

  it('el guard sobrevive a la recarga del módulo (vive en globalThis)', async () => {
    await arrancarRecepcionBiometrica();

    // Así se ve una recarga: el módulo vuelve a evaluarse y su estado local se
    // pierde; el guard global es lo que evita el doble setInterval de R4.
    expect((globalThis as Record<string, unknown>).__asistenciaRecepcion).toMatchObject({
      arrancada: true,
      lockClient: persistencia.cliente
    });

    vi.resetModules();
    const reevaluado = await import('@/modules/asistencia/procesos');
    await reevaluado.arrancarRecepcionBiometrica();

    expect(arranque.arrancarPoller).toHaveBeenCalledTimes(1);
    expect(arranque.encenderTodos).toHaveBeenCalledTimes(1);
  });

  it('propaga el fallo y deja el estado listo para reintentar', async () => {
    arranque.encenderTodos.mockRejectedValueOnce(new Error('sin red'));

    await expect(arrancarRecepcionBiometrica()).rejects.toThrow('sin red');
    expect(recepcionActiva()).toBe(false);

    await arrancarRecepcionBiometrica();
    expect(arranque.encenderTodos).toHaveBeenCalledTimes(2);
    expect(recepcionActiva()).toBe(true);
  });
});

describe('detenerRecepcionBiometrica', () => {
  it('apaga listeners activos, poller y vigilante', async () => {
    arranque.listenersActivos.mockReturnValue(['eq-1', 'eq-2']);
    await arrancarRecepcionBiometrica();

    await detenerRecepcionBiometrica();

    expect(arranque.apagarListener).toHaveBeenCalledWith('eq-1');
    expect(arranque.apagarListener).toHaveBeenCalledWith('eq-2');
    expect(arranque.detenerPoller).toHaveBeenCalledTimes(1);
    expect(arranque.detenerVigilanteIp).toHaveBeenCalledTimes(1);
    expect(persistencia.cliente.query).toHaveBeenLastCalledWith(
      expect.stringContaining('pg_advisory_unlock'),
      expect.any(Array)
    );
    expect(persistencia.cliente.release).toHaveBeenCalledTimes(1);
    expect(recepcionActiva()).toBe(false);
  });

  it('es idempotente y no hace nada si la recepción no está encendida', async () => {
    await detenerRecepcionBiometrica();
    await detenerRecepcionBiometrica();

    expect(arranque.detenerPoller).not.toHaveBeenCalled();
    expect(arranque.detenerVigilanteIp).not.toHaveBeenCalled();
  });
});
