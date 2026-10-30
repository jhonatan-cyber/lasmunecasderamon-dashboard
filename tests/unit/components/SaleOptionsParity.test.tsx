import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  SettingsSaleOptionsEditor,
  type SettingsSaleOptionsHandle
} from '@/components/settings/SettingsSaleOptionsEditor';
import { TransferModal, type BarStockItem } from '@/components/bar/TransferModal';
import type { SaleOption } from '@/types/sale-options';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/**
 * Paridad de la ficha de producto: Configuración → Bar y comisiones contra el
 * modal de transferencia.
 *
 * Las dos pantallas comparten `SaleTypeEditor`, pero la colación y los checks
 * viven duplicados en cada una (`SettingsSaleOptionsEditor` y `TransferModal`).
 * Este test compara el inventario de controles que ve el usuario para que una
 * opción nueva no aparezca en una sola pantalla, que es justo cómo divergieron
 * los campos de colación antes.
 */

const compacto = (texto: string) => texto.replace(/\s+/g, ' ').trim();

function nombreAccesible(control: Element): string {
  const aria = control.getAttribute('aria-label');
  if (aria?.trim()) return compacto(aria);
  const ids = control.getAttribute('aria-labelledby');
  if (ids)
    return compacto(
      ids
        .split(/\s+/)
        .map(id => document.getElementById(id)?.textContent ?? '')
        .join(' ')
    );
  const id = control.getAttribute('id');
  if (id) {
    const etiqueta = document.querySelector(`label[for="${id}"]`);
    if (etiqueta?.textContent) return compacto(etiqueta.textContent);
  }
  return compacto(control.closest('label')?.textContent ?? '');
}

/** Controles editables de la configuración de venta, con su nombre visible. */
function opcionesDe(raiz: HTMLElement): string[] {
  return Array.from(
    raiz.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="checkbox"]), select, textarea, [role="checkbox"]'
    )
  )
    .map(nombreAccesible)
    .filter(Boolean)
    .sort();
}

/**
 * Controles exclusivos de la transferencia. El check «Vender con anfitriona»
 * decide si la bebida se ofrece con anfitriona al mover stock; en la ficha de
 * Configuración esa decisión se expresa dejando el precio en 0, por lo que no
 * se replica allí.
 */
const SOLO_TRANSFERENCIA = ['Vender con anfitriona'];

/** Rótulos del selector «Tipo de venta» tal como los lee el usuario. */
function tiposDeVenta(raiz: HTMLElement): string[] {
  const grupo = raiz.querySelector('[aria-label="Tipos de venta"]');
  if (!grupo) return [];
  return Array.from(grupo.querySelectorAll('button'))
    .map(boton => compacto(boton.textContent ?? ''))
    .filter(Boolean);
}

const botella = (extra: Partial<SaleOption> = {}): SaleOption => ({
  tipo: 'botella',
  precio: 50000,
  comision: 5000,
  ...extra
});

const corto = (extra: Partial<SaleOption> = {}): SaleOption => ({
  tipo: 'shot',
  precio: 3000,
  comision: 0,
  ...extra
});

interface Escenario {
  opciones: SaleOption[];
  categoria?: string;
  precio: string;
  comision: string;
  mlCliente?: number;
  mlAnfitriona?: number;
  item?: Partial<BarStockItem>;
}

function itemCon({ opciones, categoria, item }: Escenario): BarStockItem {
  return {
    id: 'pres-1',
    producto_id: 'prod-1',
    producto_nombre: 'Whisky',
    producto_codigo: 'W1',
    producto_foto: null,
    categoria_nombre: categoria ?? 'Destilados',
    nombre: '750 ml',
    codigo_barras: null,
    precio_compra: 10000,
    precio_venta: 50000,
    comision: 5000,
    foto: null,
    stock: 5,
    stock_bar: 2,
    opciones_venta: opciones,
    ...item
  };
}

/**
 * Renderiza la ficha de Configuración y el modal de transferencia con los mismos
 * datos y devuelve el inventario de campos, comparando ambos lados.
 */
function comparar(escenario: Escenario): { campos: string[]; tipos: string[] } {
  const ref = createRef<SettingsSaleOptionsHandle>();
  const settings = render(
    <SettingsSaleOptionsEditor
      ref={ref}
      options={escenario.opciones}
      categoria={escenario.categoria}
      precio={escenario.precio}
      comision={escenario.comision}
      mlCliente={escenario.mlCliente}
      mlAnfitriona={escenario.mlAnfitriona}
      maxAnfitrionas=''
      onMaxAnfitrionasChange={vi.fn()}
      saving={false}
      onPrecio={vi.fn()}
      onComision={vi.fn()}
    />
  );
  const enSettings = opcionesDe(settings.container);
  const tiposSettings = tiposDeVenta(settings.container);
  cleanup();

  render(<TransferModal open item={itemCon(escenario)} onOpenChange={vi.fn()} onDone={vi.fn()} />);
  // Con configuración guardada el modal arranca en lectura; se comparan los
  // editores, que es donde se eligen las opciones.
  const modificar = screen.queryByRole('button', { name: 'Modificar precios' });
  if (modificar) fireEvent.click(modificar);
  const seccion = screen
    .getByRole('heading', { name: 'Configuración de venta' })
    .closest('section');
  if (!seccion) throw new Error('El modal no tiene la sección Configuración de venta');
  const enTransferencia = opcionesDe(seccion as HTMLElement).filter(
    campo => !SOLO_TRANSFERENCIA.includes(campo)
  );
  const tiposTransferencia = tiposDeVenta(seccion as HTMLElement);

  expect({
    soloEnSettings: enSettings.filter(campo => !enTransferencia.includes(campo)),
    soloEnTransferencia: enTransferencia.filter(campo => !enSettings.includes(campo))
  }).toEqual({ soloEnSettings: [], soloEnTransferencia: [] });
  // El selector «Tipo de venta» dice exactamente lo mismo en ambas pantallas.
  expect(tiposTransferencia).toEqual(tiposSettings);

  return { campos: enSettings, tipos: tiposSettings };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ success: true, data: [] }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('paridad de la ficha de producto con la transferencia', () => {
  it('coincide en un producto clásico con botella y cortos apagados', () => {
    const { campos } = comparar({ opciones: [botella()], precio: '50.000', comision: '5.000' });

    expect(campos).toEqual(
      expect.arrayContaining([
        'Bebida analcohólica por botella',
        'Comisión',
        'Habilitar bebida para colación',
        'Máximo de anfitrionas',
        'Precio de botella con anfitriona',
        'Precio de botella sin anfitriona'
      ])
    );
    // Sin colación habilitada ninguno de los dos lados pide ml.
    expect(campos).not.toContain('Ml de la colación');
    expect(campos).not.toContain('Ml de acompañamiento');
  });

  it('pide los mismos ml de colación cuando la botella la habilita sin cortos', () => {
    const { campos } = comparar({
      opciones: [botella({ colacion_habilitada: true })],
      precio: '50.000',
      comision: '5.000'
    });

    expect(campos).toEqual(expect.arrayContaining(['Ml de la colación', 'Ml de acompañamiento']));
  });

  it('hereda los ml del corto de anfitriona en ambas pantallas', () => {
    const { campos } = comparar({
      opciones: [
        botella({ colacion_habilitada: true }),
        corto({
          ml_acompanamiento_anfitriona: 150,
          precios_anfitriona: [{ precio: 4000, comision: 500 }]
        })
      ],
      precio: '50.000',
      comision: '5.000',
      mlCliente: 50,
      mlAnfitriona: 70,
      item: { ml_shot: 50, ml_shot_anfitriona: 70 }
    });

    // Con la herencia disponible no se repiten los inputs de ml.
    expect(campos).not.toContain('Ml de la colación');
    expect(campos).not.toContain('Ml de acompañamiento');
    expect(campos).toEqual(
      expect.arrayContaining([
        'Ml bebida analcohólica anfitriona',
        'Ml corto anfitriona',
        'Ml corto cliente',
        'Precio corto anfitriona',
        'Precio corto cliente'
      ])
    );
  });

  it('en bebidas analcohólicas solo pide los ml de la colación en ambos lados', () => {
    const { campos } = comparar({
      opciones: [botella({ precio: 2000, comision: 0, colacion_habilitada: true })],
      categoria: 'Bebidas analcohólicas',
      precio: '2.000',
      comision: ''
    });

    expect(campos).toEqual(
      expect.arrayContaining(['Ml de la colación', 'Habilitar bebida para cover de clientes'])
    );
    expect(campos).not.toContain('Ml de acompañamiento');
    expect(campos).not.toContain('Máximo de anfitrionas');
  });

  it('al habilitar cortos expone los mismos campos de precio, comisión y ml', () => {
    const { campos } = comparar({
      opciones: [botella(), corto({ precios_anfitriona: [{ precio: 4000, comision: 500 }] })],
      precio: '50.000',
      comision: '5.000'
    });

    expect(campos).toEqual(
      expect.arrayContaining([
        'Comisión corto anfitriona',
        'Ml corto anfitriona',
        'Ml corto cliente',
        'Precio corto anfitriona',
        'Precio corto cliente'
      ])
    );
  });

  it('rotula el tipo de venta por corto con los mismos ml en ambas pantallas', () => {
    const { tipos } = comparar({
      opciones: [botella(), corto()],
      precio: '50.000',
      comision: '5.000',
      mlCliente: 50,
      mlAnfitriona: 70,
      item: { ml_shot: 50, ml_shot_anfitriona: 70 }
    });

    expect(tipos).toEqual(['Botella', 'Corto · 50 ml · Anf 70 ml']);
  });
});
