import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import {
  arrancarRecepcionBiometrica,
  detenerRecepcionBiometrica,
  recepcionActiva
} from '@/modules/asistencia/procesos';

const estadoGlobal = globalThis as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  arranque.encenderTodos.mockResolvedValue(undefined);
  arranque.listenersActivos.mockReturnValue([]);
  // El módulo capturó este objeto la primera vez que se evaluó: hay que
  // apagarlo, no borrarlo, para partir de limpio en cada test.
  const estado = estadoGlobal.__asistenciaRecepcion as { arrancada: boolean } | undefined;
  if (estado) estado.arrancada = false;
});

describe('arrancarRecepcionBiometrica', () => {
  it('enciende poller, listeners en vivo y vigilante de IP', async () => {
    await arrancarRecepcionBiometrica();

    expect(arranque.arrancarPoller).toHaveBeenCalledTimes(1);
    expect(arranque.encenderTodos).toHaveBeenCalledTimes(1);
    expect(arranque.arrancarVigilanteIp).toHaveBeenCalledTimes(1);
    expect(recepcionActiva()).toBe(true);
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
    expect((globalThis as Record<string, unknown>).__asistenciaRecepcion).toEqual({
      arrancada: true
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

    detenerRecepcionBiometrica();

    expect(arranque.apagarListener).toHaveBeenCalledWith('eq-1');
    expect(arranque.apagarListener).toHaveBeenCalledWith('eq-2');
    expect(arranque.detenerPoller).toHaveBeenCalledTimes(1);
    expect(arranque.detenerVigilanteIp).toHaveBeenCalledTimes(1);
    expect(recepcionActiva()).toBe(false);
  });

  it('es idempotente y no hace nada si la recepción no está encendida', () => {
    detenerRecepcionBiometrica();
    detenerRecepcionBiometrica();

    expect(arranque.detenerPoller).not.toHaveBeenCalled();
    expect(arranque.detenerVigilanteIp).not.toHaveBeenCalled();
  });
});
