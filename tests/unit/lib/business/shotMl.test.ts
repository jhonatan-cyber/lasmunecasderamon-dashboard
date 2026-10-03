import { describe, expect, it } from 'vitest';
import {
  mlDesdeNombrePresentacion,
  resolveBotellaMl,
  resolveShotMl,
  resolveShotMlAnfitriona
} from '@/lib/business/shotMl';

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
