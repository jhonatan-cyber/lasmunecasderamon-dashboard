import { beforeEach, describe, expect, it, vi } from 'vitest';

const presentationMocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  insert: vi.fn(),
  query: vi.fn(),
  sincronizarVencimientoProducto: vi.fn(),
  update: vi.fn(),
  withTransaction: vi.fn()
}));

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'pres-1',
  query: presentationMocks.query,
  withTransaction: presentationMocks.withTransaction
}));

vi.mock('@/lib/database/base-repository', () => ({
  BaseRepository: {
    findOne: presentationMocks.findOne,
    insert: presentationMocks.insert,
    update: presentationMocks.update
  }
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-11-28 00:00:00'
}));

vi.mock('@/modules/inventario/vencimientoProducto', () => ({
  sincronizarVencimientoProducto: presentationMocks.sincronizarVencimientoProducto
}));

import {
  mlDesdeNombrePresentacion,
  resolveBotellaMl,
  resolveBotellaMlVisible,
  resolveShotMl,
  resolveShotMlAnfitriona
} from '@/lib/business/shotMl';
import {
  actualizarPresentacion,
  crearPresentacion
} from '@/modules/inventario/presentaciones/repositorio';
import type { TransactionQuery } from '@/lib/database/db';

describe('resolveShotMl', () => {
  it('usa el ml del producto cuando está definido', () => {
    expect(resolveShotMl(75, 50)).toBe(75);
  });

  it('cae al valor global cuando el producto no define los suyos', () => {
    expect(resolveShotMl(null, 50)).toBe(50);
    expect(resolveShotMl(undefined, 50)).toBe(50);
    expect(resolveShotMl(0, 50)).toBe(50);
  });
});

describe('resolveShotMlAnfitriona', () => {
  it('usa el ml de anfitriona cuando está definido', () => {
    expect(resolveShotMlAnfitriona(40, 50)).toBe(40);
  });

  it('cae al ml de cliente cuando no hay valor propio', () => {
    expect(resolveShotMlAnfitriona(null, 50)).toBe(50);
    expect(resolveShotMlAnfitriona(undefined, 50)).toBe(50);
    expect(resolveShotMlAnfitriona(0, 50)).toBe(50);
  });
});

describe('mlDesdeNombrePresentacion', () => {
  it('lee el volumen del nombre con el que se nombra cada presentación', () => {
    expect(mlDesdeNombrePresentacion('1000 ml')).toBe(1000);
    expect(mlDesdeNombrePresentacion('750ml')).toBe(750);
    expect(mlDesdeNombrePresentacion('  330 ml  ')).toBe(330);
    expect(mlDesdeNombrePresentacion('Botella 710 ml')).toBe(710);
  });

  it('convierte litros a ml', () => {
    expect(mlDesdeNombrePresentacion('1 litro')).toBe(1000);
    expect(mlDesdeNombrePresentacion('1,5 litros')).toBe(1500);
    expect(mlDesdeNombrePresentacion('Botella 1 L')).toBe(1000);
  });

  it('convierte cc y onzas líquidas a ml', () => {
    expect(mlDesdeNombrePresentacion('1500 cc')).toBe(1500);
    expect(mlDesdeNombrePresentacion('24 oz')).toBe(710);
  });

  it('devuelve null cuando el nombre no declara un volumen', () => {
    expect(mlDesdeNombrePresentacion('Botella chica')).toBeNull();
    expect(mlDesdeNombrePresentacion('750')).toBeNull();
    expect(mlDesdeNombrePresentacion('')).toBeNull();
    expect(mlDesdeNombrePresentacion(null)).toBeNull();
    expect(mlDesdeNombrePresentacion(undefined)).toBeNull();
    // No cuela un texto que sólo empieza como una unidad ("1000 mlx").
    expect(mlDesdeNombrePresentacion('1000 mlx')).toBeNull();
  });
});

describe('resolveBotellaMl', () => {
  it('usa la capacidad de la presentación cuando la tiene guardada', () => {
    expect(resolveBotellaMl(1000, '750 ml', 750)).toBe(1000);
    expect(resolveBotellaMl(300, '1000 ml', 750)).toBe(300);
  });

  it('usa la del nombre antes que el default de Configuraciones', () => {
    // El caso del bar: "1000 ml" sin capacidad guardada se abría como botella de 750.
    expect(resolveBotellaMl(null, '1000 ml', 750)).toBe(1000);
    expect(resolveBotellaMl(undefined, '1000 ml', 750)).toBe(1000);
    expect(resolveBotellaMl(0, '1000 ml', 750)).toBe(1000);
    expect(resolveBotellaMl(null, 'Whisky 750 ml', 1000)).toBe(750);
  });

  it('cae a Configuraciones cuando ni la columna ni el nombre dicen el volumen', () => {
    expect(resolveBotellaMl(null, 'Botella chica', 750)).toBe(750);
    expect(resolveBotellaMl(null, null, 600)).toBe(600);
  });
});

describe('resolveBotellaMlVisible', () => {
  it('prioriza el valor indicado en el nombre de la presentación concreta', () => {
    expect(resolveBotellaMlVisible(500, '1500 ml', 'Danta naranja 2000 ml')).toBe(1500);
  });

  it('usa el volumen del producto antes de una capacidad de presentación desactualizada', () => {
    expect(resolveBotellaMlVisible(500, 'Botella', 'Danta naranja 1500ml')).toBe(1500);
  });

  it('usa la capacidad guardada de esa presentación si los nombres no declaran volumen', () => {
    expect(resolveBotellaMlVisible(500, 'Botella', 'Danta naranja')).toBe(500);
  });

  it('no inventa una capacidad si ninguna fuente la declara', () => {
    expect(resolveBotellaMlVisible(null, 'Botella', 'Danta naranja')).toBeNull();
  });
});

describe('capacidad de presentaciones al persistir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    presentationMocks.findOne.mockResolvedValue({
      id: 'pres-1',
      producto_id: 'prod-1',
      nombre: '1500 ml'
    });
    presentationMocks.query.mockResolvedValue([{ nombre: '2000 ml' }]);
  });

  it('guarda ml_botella desde el nombre al registrar una presentación', async () => {
    const trx = vi.fn() as unknown as TransactionQuery;

    await crearPresentacion(trx, { producto_id: 'prod-1', nombre: '1500 ml' });

    expect(presentationMocks.insert).toHaveBeenCalledWith(
      trx,
      'inventario_presentaciones',
      expect.objectContaining({ nombre: '1500 ml', ml_botella: 1500 })
    );
  });

  it('reemplaza la capacidad discordante al editar el nombre', async () => {
    await actualizarPresentacion('pres-1', { nombre: '2000 ml', ml_botella: 500 });

    expect(presentationMocks.update).toHaveBeenCalledWith(
      presentationMocks.query,
      'inventario_presentaciones',
      'id',
      'pres-1',
      expect.objectContaining({ nombre: '2000 ml', ml_botella: 2000 })
    );
  });

  it('mantiene la capacidad alineada aunque la API envíe ml_botella por separado', async () => {
    await actualizarPresentacion('pres-1', { ml_botella: 500 });

    expect(presentationMocks.update).toHaveBeenCalledWith(
      presentationMocks.query,
      'inventario_presentaciones',
      'id',
      'pres-1',
      expect.objectContaining({ ml_botella: 2000 })
    );
  });

  it('limpia ml_botella cuando el nombre editado no representa un volumen', async () => {
    await actualizarPresentacion('pres-1', { nombre: '6 unidades' });

    expect(presentationMocks.update).toHaveBeenCalledWith(
      presentationMocks.query,
      'inventario_presentaciones',
      'id',
      'pres-1',
      expect.objectContaining({ nombre: '6 unidades', ml_botella: null })
    );
  });
});
