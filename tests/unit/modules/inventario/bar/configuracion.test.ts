import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  leerConfiguracionBar: vi.fn(),
  leerValorConfiguracionBar: vi.fn()
}));

vi.mock('@/modules/inventario/bar/configuracionRepositorio', () => mocks);

import {
  DEFAULT_ACOMPANAMIENTO_MAX_ML,
  DEFAULT_BOTTLE_ML,
  DEFAULT_MERMA_SHOTS_ML,
  DEFAULT_SHOT_ML,
  DEFAULT_SHOTS_ALERTA,
  getAcompanamientoMaxMl,
  getBarMlConfig,
  getTopeSimple
} from '@/modules/inventario/bar/configuracion';

describe('configuración del bar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.leerConfiguracionBar.mockResolvedValue([]);
    mocks.leerValorConfiguracionBar.mockResolvedValue([]);
  });

  it('conserva defaults cuando faltan valores o falla la lectura', async () => {
    await expect(getBarMlConfig()).resolves.toEqual({
      shotMl: DEFAULT_SHOT_ML,
      botellaMl: DEFAULT_BOTTLE_ML,
      shotsAlerta: DEFAULT_SHOTS_ALERTA,
      mermaShotsMl: DEFAULT_MERMA_SHOTS_ML
    });
    await expect(getAcompanamientoMaxMl()).resolves.toBe(DEFAULT_ACOMPANAMIENTO_MAX_ML);
    await expect(getTopeSimple()).resolves.toBe(10000);

    mocks.leerConfiguracionBar.mockRejectedValueOnce(new Error('sin conexión'));
    mocks.leerValorConfiguracionBar.mockRejectedValue(new Error('sin conexión'));
    await expect(getBarMlConfig()).resolves.toEqual({
      shotMl: DEFAULT_SHOT_ML,
      botellaMl: DEFAULT_BOTTLE_ML,
      shotsAlerta: DEFAULT_SHOTS_ALERTA,
      mermaShotsMl: DEFAULT_MERMA_SHOTS_ML
    });
    await expect(getAcompanamientoMaxMl()).resolves.toBe(DEFAULT_ACOMPANAMIENTO_MAX_ML);
    await expect(getTopeSimple()).resolves.toBe(10000);
  });

  it('normaliza valores válidos y conserva merma cero', async () => {
    mocks.leerConfiguracionBar.mockResolvedValue([
      { clave: 'shot_ml', valor: '60' },
      { clave: 'botella_ml', valor: '1000' },
      { clave: 'shots_alerta', valor: '3.8' },
      { clave: 'merma_shots_ml', valor: '0' }
    ]);
    mocks.leerValorConfiguracionBar
      .mockResolvedValueOnce([{ valor: '250.8' }])
      .mockResolvedValueOnce([{ valor: '0' }]);

    await expect(getBarMlConfig()).resolves.toEqual({
      shotMl: 60,
      botellaMl: 1000,
      shotsAlerta: 3,
      mermaShotsMl: 0
    });
    await expect(getAcompanamientoMaxMl()).resolves.toBe(250);
    await expect(getTopeSimple()).resolves.toBe(0);
  });
});
