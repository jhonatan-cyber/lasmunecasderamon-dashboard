import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Contrato del arranque biométrico:
 *
 *  - por defecto la recepción de lectores (poller + listeners + IP watch) ni
 *    siquiera se carga: su grafo cuesta segundos en un arranque en frío y hoy
 *    no hay lectores conectados;
 *  - con `BIOMETRIC_RECEPTION=on` se enciende fuera del camino crítico;
 *  - en Edge no pasa nada.
 *
 * El enrolamiento facial desde el teléfono no usa este camino: lo atiende
 * `/api/users/[id]/biometric/captures` bajo demanda, así que apagar la
 * recepción no lo afecta.
 */
// vi.mock se hoistea: el objeto de dobles tiene que existir antes que él.
const recepcion = vi.hoisted(() => ({
  importado: false,
  arrancarRecepcionBiometrica: vi.fn(async () => undefined),
  recepcionActiva: vi.fn(() => true)
}));

vi.mock('@/modules/asistencia/recepcion', () => {
  // El flag se enciende al evaluarse el módulo, no al llamarlo: sirve para
  // comprobar que el grafo de recepción no se carga cuando está apagado.
  recepcion.importado = true;
  return {
    arrancarRecepcionBiometrica: recepcion.arrancarRecepcionBiometrica,
    recepcionActiva: recepcion.recepcionActiva
  };
});

let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  recepcion.importado = false;
  recepcion.arrancarRecepcionBiometrica.mockClear();
  recepcion.recepcionActiva.mockClear();
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  logSpy.mockRestore();
  warnSpy.mockRestore();
});

async function registrar() {
  const { register } = await import('@/instrumentation');
  await register();
}

describe('instrumentation', () => {
  it('no carga ni arranca la recepción de lectores por defecto', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');

    await registrar();
    await new Promise(resolve => setTimeout(resolve, 25));

    expect(recepcion.importado).toBe(false);
    expect(recepcion.arrancarRecepcionBiometrica).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[instrumentation] Recepción de lectores biométricos desactivada'
    );
  });

  it('tampoco la carga si BIOMETRIC_RECEPTION está apagado explícitamente', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('BIOMETRIC_RECEPTION', 'off');

    await registrar();
    await new Promise(resolve => setTimeout(resolve, 25));

    expect(recepcion.importado).toBe(false);
    expect(recepcion.arrancarRecepcionBiometrica).not.toHaveBeenCalled();
  });

  it('con BIOMETRIC_RECEPTION=on la agenda sin esperar el arranque', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('BIOMETRIC_RECEPTION', 'on');

    await registrar();

    expect(recepcion.arrancarRecepcionBiometrica).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(recepcion.arrancarRecepcionBiometrica).toHaveBeenCalledTimes(1);
    });
  });

  it('no la carga fuera del runtime Node aunque esté encendida', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.stubEnv('BIOMETRIC_RECEPTION', 'on');

    await registrar();
    await new Promise(resolve => setTimeout(resolve, 25));

    expect(recepcion.importado).toBe(false);
    expect(recepcion.arrancarRecepcionBiometrica).not.toHaveBeenCalled();
  });
});
