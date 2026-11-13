import { describe, expect, it } from 'vitest';
import { detalleBotellasAbiertas } from '@/components/bar/barOpenBottleDetails';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';
import type { SaleOption } from '@/types/sale-options';

const SHOT_ML = 50;

function presentacion(extra: Partial<BarStockItem> = {}): BarStockItem {
  return {
    id: 'pres-1',
    producto_id: 'prod-1',
    producto_nombre: 'Coca-Cola Original',
    producto_codigo: 'CC-1500',
    producto_foto: null,
    categoria_nombre: 'Bebidas analcohólicas',
    nombre: '1500 ml',
    codigo_barras: null,
    precio_compra: 1000,
    precio_venta: 2000,
    comision: 0,
    foto: null,
    stock: 3,
    stock_bar: 2,
    ml_botella: 1500,
    ml_shot: null,
    ml_shot_anfitriona: null,
    ...extra
  };
}

const botella = (mlRestante: number) => ({
  id: 'bot-1',
  codigo: 'BOT-1',
  codigo_barras: null,
  ml_restante: mlRestante
});

describe('detalleBotellasAbiertas', () => {
  it('cuenta las colaciones que salen de una analcohólica habilitada para colación', () => {
    const opciones: SaleOption[] = [
      { tipo: 'botella', precio: 0, comision: 0, colacion_habilitada: true, ml_colacion: 200 }
    ];

    const [detalle] = detalleBotellasAbiertas(
      [
        presentacion({
          opciones_venta: opciones,
          botellas_abiertas: [botella(600)]
        })
      ],
      SHOT_ML
    );

    // 600 ml abiertos con colaciones de 200 ml: tres colaciones. Los mismos
    // ml, medidos en cortos de 50 ml, son doce.
    expect(detalle.colacion_habilitada).toBe(true);
    expect(detalle.esBebidaAnalcoholica).toBe(true);
    expect(detalle.ml_colacion).toBe(200);
    expect(detalle.ml_disponibles).toBe(600);
    expect(detalle.colaciones_disponibles).toBe(3);
    expect(detalle.ml_cliente).toBe(SHOT_ML);
    expect(detalle.shots_disponibles).toBe(12);
    // La analcohólica no se vende por corto: solo se lee su medida.
    expect(detalle.venta_corto_habilitada).toBe(false);
  });

  it('cuenta colaciones y cortos cuando la analcohólica ofrece ambos', () => {
    const opciones: SaleOption[] = [
      { tipo: 'botella', precio: 0, comision: 0, colacion_habilitada: true, ml_colacion: 200 },
      { tipo: 'shot', precio: 1000, comision: 0 }
    ];

    const [detalle] = detalleBotellasAbiertas(
      [presentacion({ opciones_venta: opciones, botellas_abiertas: [botella(600)] })],
      SHOT_ML
    );

    // Los mismos 600 ml se leen en colaciones de 200 ml y en cortos de 50 ml.
    expect(detalle.colacion_habilitada).toBe(true);
    expect(detalle.ml_colacion).toBe(200);
    expect(detalle.colaciones_disponibles).toBe(3);
    expect(detalle.venta_corto_habilitada).toBe(true);
    expect(detalle.ml_cliente).toBe(SHOT_ML);
    expect(detalle.shots_disponibles).toBe(12);
  });

  it('no inventa colaciones en una analcohólica que se vende de a botella', () => {
    const opciones: SaleOption[] = [
      { tipo: 'botella', precio: 2000, comision: 0, colacion_habilitada: false, en_venta: true }
    ];

    const [detalle] = detalleBotellasAbiertas(
      [presentacion({ opciones_venta: opciones, botellas_abiertas: [botella(600)] })],
      SHOT_ML
    );

    // Sin colación habilitada no hay colaciones que contar, pero el corto
    // sigue leyéndose de los ml que quedan.
    expect(detalle.colacion_habilitada).toBe(false);
    expect(detalle.colaciones_disponibles).toBe(0);
    expect(detalle.venta_corto_habilitada).toBe(false);
    expect(detalle.shots_disponibles).toBe(12);
    expect(detalle.ml_disponibles).toBe(600);
  });

  it('usa la capacidad de la botella cuando la colación no define sus ml', () => {
    const opciones: SaleOption[] = [
      { tipo: 'botella', precio: 0, comision: 0, colacion_habilitada: true }
    ];

    const [detalle] = detalleBotellasAbiertas(
      [
        presentacion({
          opciones_venta: opciones,
          ml_botella: 1500,
          botellas_abiertas: [botella(1500)]
        })
      ],
      SHOT_ML
    );

    // Sin `ml_colacion` la porción es la botella entera: una sola colación.
    expect(detalle.ml_colacion).toBe(1500);
    expect(detalle.colaciones_disponibles).toBe(1);
  });

  it('calcula los cortos de cliente y de anfitriona en las licores', () => {
    const opciones: SaleOption[] = [{ tipo: 'botella', precio: 20000, comision: 5000 }];
    const [detalle] = detalleBotellasAbiertas(
      [
        presentacion({
          categoria_nombre: 'Whisky',
          producto_nombre: 'Macallan',
          opciones_venta: opciones,
          ml_shot: null,
          ml_shot_anfitriona: 25,
          botellas_abiertas: [botella(600)]
        })
      ],
      SHOT_ML
    );

    // Sin opción de corto la botella se vende entera, pero los ml por trago
    // siguen siendo los de la configuración.
    expect(detalle.venta_corto_habilitada).toBe(false);
    expect(detalle.esBebidaAnalcoholica).toBe(false);
    expect(detalle.ml_cliente).toBe(SHOT_ML);
    expect(detalle.ml_anfitriona).toBe(25);
    expect(detalle.shots_disponibles).toBe(12);
    expect(detalle.shots_anfitriona_disponibles).toBe(24);
  });

  it('cuenta los cortos de una licor que los ofrece', () => {
    const opciones: SaleOption[] = [
      { tipo: 'botella', precio: 20000, comision: 5000 },
      { tipo: 'shot', precio: 3000, comision: 0 }
    ];

    const [detalle] = detalleBotellasAbiertas(
      [
        presentacion({
          categoria_nombre: 'Whisky',
          producto_nombre: 'Macallan',
          opciones_venta: opciones,
          botellas_abiertas: [botella(600)]
        })
      ],
      SHOT_ML
    );

    expect(detalle.venta_corto_habilitada).toBe(true);
    expect(detalle.shots_disponibles).toBe(12);
  });

  it('no cuenta porciones cuando no hay ml configurado', () => {
    const [detalle] = detalleBotellasAbiertas(
      [
        presentacion({
          categoria_nombre: 'Whisky',
          producto_nombre: 'Macallan',
          opciones_venta: [],
          ml_shot: null,
          ml_shot_anfitriona: null,
          botellas_abiertas: [botella(600)]
        })
      ],
      0
    );

    expect(detalle.shots_disponibles).toBe(0);
    expect(detalle.shots_anfitriona_disponibles).toBe(0);
  });

  it('omite las presentaciones sin botella abierta', () => {
    expect(
      detalleBotellasAbiertas([presentacion({ ml_abierta: 0, botellas_abiertas: [] })], SHOT_ML)
    ).toHaveLength(0);
  });
});
