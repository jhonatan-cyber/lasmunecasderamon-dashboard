import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUnitLabels } from '@/lib/utils/printUnitLabels';
afterEach(() => vi.restoreAllMocks());

describe('documento de etiquetas', () => {
  it('genera barras reales y texto del codigo, sin contenido del inventario', () => {
    // jsdom lacks canvas text measurement; barcode encoding and SVG stay real.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: (text: string) => ({ width: text.length * 10 })
    } as CanvasRenderingContext2D);
    const doc = document.implementation.createHTMLDocument('Inventario Compra C-0001');
    doc.body.textContent = 'Sin compra asociada';
    buildUnitLabels(doc, ['5901234123457', 'LM-000001']);
    expect(doc.querySelectorAll('svg')).toHaveLength(2);
    expect(doc.querySelectorAll('svg rect').length).toBeGreaterThan(20);
    expect(doc.body.textContent?.replace(/\s/g, '')).toBe('5901234123457LM-000001');
    expect(doc.title).toBe('');
  });
});
