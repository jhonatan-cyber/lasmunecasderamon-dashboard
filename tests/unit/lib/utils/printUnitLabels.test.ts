import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUnitLabels } from '@/lib/utils/printUnitLabels';

afterEach(() => vi.restoreAllMocks());

/** jsdom lacks canvas text measurement; barcode encoding and SVG stay real. */
function mockCanvas() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    font: '',
    measureText: (text: string) => ({ width: text.length * 10 })
  } as CanvasRenderingContext2D);
}

const textoPlano = (el: Element | null) => el?.textContent?.replace(/\s/g, '') ?? null;

describe('documento de etiquetas', () => {
  it('genera barras reales y texto del codigo, sin contenido del inventario', () => {
    mockCanvas();
    const doc = document.implementation.createHTMLDocument('Inventario Compra C-0001');
    doc.body.textContent = 'Sin compra asociada';
    buildUnitLabels(doc, ['5901234123457', 'LM-000001']);
    expect(doc.querySelectorAll('svg')).toHaveLength(2);
    expect(doc.querySelectorAll('svg rect').length).toBeGreaterThan(20);
    expect(doc.body.textContent?.replace(/\s/g, '')).toBe('5901234123457LM-000001');
    expect(doc.title).toBe('');
  });

  it('pone el nombre del producto y la presentación antes del código de barras', () => {
    mockCanvas();
    const doc = document.implementation.createHTMLDocument('Etiquetas');
    buildUnitLabels(doc, [
      { code: '5901234123457', producto_nombre: 'Black Label', presentacion_nombre: '750 ml' },
      { code: 'LM-000001' }
    ]);

    const etiquetas = doc.querySelectorAll('.label');
    expect(etiquetas).toHaveLength(2);
    expect(etiquetas[0].querySelector('.producto')?.textContent).toBe('Black Label');
    expect(etiquetas[0].querySelector('.presentacion')?.textContent).toBe('750 ml');
    expect(textoPlano(etiquetas[0])).toBe('BlackLabel750ml5901234123457');
    // El SVG va al final: primero se lee de qué producto es la etiqueta.
    expect(etiquetas[0].lastElementChild?.tagName.toLowerCase()).toBe('svg');
  });

  it('mantiene la etiqueta con solo su código cuando no hay nombres', () => {
    mockCanvas();
    const doc = document.implementation.createHTMLDocument('Etiquetas');
    buildUnitLabels(doc, ['LM-000001']);
    const etiqueta = doc.querySelector('.label')!;
    expect(etiqueta.querySelector('.producto')).toBeNull();
    expect(etiqueta.querySelector('.presentacion')).toBeNull();
    expect(etiqueta.querySelector('svg')).not.toBeNull();
  });

  it('ignora nombres en blanco en vez de imprimir una línea vacía', () => {
    mockCanvas();
    const doc = document.implementation.createHTMLDocument('Etiquetas');
    buildUnitLabels(doc, [
      { code: 'LM-000002', producto_nombre: '   ', presentacion_nombre: null }
    ]);
    const etiqueta = doc.querySelector('.label')!;
    expect(etiqueta.querySelector('.producto')).toBeNull();
    expect(etiqueta.querySelector('.presentacion')).toBeNull();
  });
});
