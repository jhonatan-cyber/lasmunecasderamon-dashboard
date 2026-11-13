// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { jsPDF, jsPDFOptions } from 'jspdf';

interface TextDraw {
  text: string;
  x: number;
  y: number;
  page: number;
  width: number;
  align: string;
  fontSize: number;
  bold: boolean;
}
interface ShapeDraw {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  fill: string;
}
const capture = vi.hoisted(() => ({
  document: null as jsPDF | null,
  texts: [] as TextDraw[],
  shapes: [] as ShapeDraw[]
}));

// Espiar el motor instalado conserva sus métricas reales y también genera el PDF.
vi.mock('jspdf', async importOriginal => {
  Object.assign(window, { atob: globalThis.atob, btoa: globalThis.btoa });
  const actual = await importOriginal<typeof import('jspdf')>();
  class ObservedPdf extends actual.jsPDF {
    constructor(options?: jsPDFOptions) {
      super(options);
      capture.document = this;
      const text = this.text.bind(this);
      vi.spyOn(this, 'text').mockImplementation((...args: Parameters<jsPDF['text']>) => {
        const [content, x, y, options] = args;
        const lines = Array.isArray(content) ? content : [content];
        lines.forEach(line =>
          capture.texts.push({
            text: line,
            x,
            y,
            page: this.getCurrentPageInfo().pageNumber,
            width: this.getTextWidth(line),
            align: options?.align || 'left',
            fontSize: this.getFontSize(),
            bold: this.getFont().fontStyle === 'bold'
          })
        );
        return text(...args);
      });
      const fillColor = vi.spyOn(this, 'setFillColor');
      const roundedRect = this.roundedRect.bind(this);
      vi.spyOn(this, 'roundedRect').mockImplementation(
        (...args: Parameters<jsPDF['roundedRect']>) => {
          capture.shapes.push({
            x: args[0],
            y: args[1],
            width: args[2],
            height: args[3],
            page: this.getCurrentPageInfo().pageNumber,
            fill: fillColor.mock.calls.at(-1)?.slice(0, 3).join(',') || ''
          });
          return roundedRect(...args);
        }
      );
    }
  }
  return { ...actual, jsPDF: ObservedPdf };
});

import { generarPdfCierreCaja } from '@/modules/caja/turnos/cierrePdf';

const DATA = {
  caja_id: 'caja-12345678',
  estado: 'aprobada',
  cajero_nombre: 'Cajero de prueba',
  resuelto_por: 'María Autorizadora',
  fecha_apertura: '2026-10-08T20:00:00.000Z',
  fecha_cierre: '2026-10-09T05:00:00.000Z',
  solicitado_por: 'Cajero solicitante',
  venta: 120000,
  servicio: 30000,
  propina: 5000,
  comision: 10000,
  anticipo: 0,
  iva: 0,
  monto_apertura: 50000,
  efectivo: 70000,
  tarjeta: 40000,
  transferencia: 20000,
  devolucion: 3000,
  retiro_total: 2000,
  saldo_clientes_descontado: 5000,
  prepago_cargado: 0,
  prepago_consumido: 0,
  prepago_pendiente_clientes: 5000,
  ventas_por_producto: [
    { producto: 'Cóctel de prueba', unidades: 8, monto: 64000 },
    { producto: 'Bebida de prueba', unidades: 5, monto: 25000 }
  ],
  monto_cierre_calculado: 175000
};
const texts = () => capture.texts.map(draw => draw.text);
const rowValue = (label: string) => {
  const index = capture.texts.findIndex(draw => draw.text === label);
  expect(index).toBeGreaterThanOrEqual(0);
  const draw = capture.texts[index];
  return capture.texts.find(
    value => value.page === draw.page && value.y === draw.y && value.x === 194
  )?.text;
};
const assertPageBounds = () => {
  capture.texts.forEach(draw => {
    const start = draw.align === 'right' ? draw.x - draw.width : draw.x;
    const end = draw.align === 'right' ? draw.x : draw.x + draw.width;
    expect(start, draw.text).toBeGreaterThanOrEqual(15.9);
    expect(end, draw.text).toBeLessThanOrEqual(194.1);
    expect(draw.y, draw.text).toBeGreaterThan(0);
    expect(draw.y, draw.text).toBeLessThanOrEqual(draw.y === 288 ? 288 : 277);
  });
  capture.shapes.forEach(draw => {
    expect(draw.x).toBeGreaterThanOrEqual(16);
    expect(draw.x + draw.width).toBeLessThanOrEqual(194.1);
    expect(draw.y + draw.height).toBeLessThanOrEqual(277);
  });
};
const assertHeadingsHaveContent = () => {
  capture.texts.forEach((draw, index) => {
    if (!draw.bold || draw.fontSize !== 12 || draw.x !== 16 || draw.y < 36) return;
    const next = capture.texts[index + 1];
    expect(next, draw.text).toBeDefined();
    expect(next.page, draw.text).toBe(draw.page);
    expect(next.y, draw.text).toBeGreaterThan(draw.y);
    expect(next.y, draw.text).toBeLessThanOrEqual(277);
  });
};

beforeEach(() => {
  capture.document = null;
  capture.texts.length = 0;
  capture.shapes.length = 0;
});

describe('generarPdfCierreCaja', () => {
  it('genera dos páginas con datos reales, arqueo y gráficas proporcionales', () => {
    const pdf = generarPdfCierreCaja(DATA);
    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.3');
    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(capture.document?.getNumberOfPages()).toBe(2);
    expect(rowValue('Autorizó el cierre')).toBe('María Autorizadora');
    expect(rowValue('Solicitado por')).toBe('Cajero solicitante');
    expect(rowValue('Ventas')).toBe('$120.000');
    expect(rowValue('Servicios')).toBe('$30.000');
    expect(rowValue('Propinas')).toBe('$5.000');
    expect(rowValue('Comisiones')).toBe('$10.000');
    expect(rowValue('Devoluciones (ya descontadas)')).toBe('$3.000');
    expect(rowValue('Retiros (ya descontados)')).toBe('$2.000');
    expect(rowValue('Saldos de clientes descontados')).toBe('-$5.000');
    expect(texts()).toContain('$150.000');
    expect(texts().filter(text => text === '$175.000')).toHaveLength(2);
    expect(texts()).toContain('MONTO FINAL DE CIERRE');
    const cash = capture.shapes.find(shape => shape.fill === '5,150,105');
    const card = capture.shapes.find(shape => shape.fill === '14,116,200');
    const transfer = capture.shapes.find(shape => shape.fill === '124,58,237');
    expect(cash).toBeDefined();
    expect(card?.width).toBeCloseTo((cash!.width * 40000) / 70000);
    expect(transfer?.width).toBeCloseTo((cash!.width * 20000) / 70000);
    const products = capture.shapes.filter(shape => shape.fill === '79,70,229');
    expect(products).toHaveLength(2);
    expect(products[1].width).toBeCloseTo((products[0].width * 25000) / 64000);
    assertPageBounds();
    assertHeadingsHaveContent();
  });

  it.each([
    ['2026-10-08T20:00:00.000Z', '08/10/2026 17:00'],
    [new Date('2026-10-08T20:00:00.000Z'), '08/10/2026 17:00'],
    ['2026-10-09T02:00:00Z', '08/10/2026 23:00'],
    ['2026-06-08T20:00:00Z', '08/06/2026 16:00'],
    ['2026-10-08T17:00:00-03:00', '08/10/2026 17:00'],
    ['2026-10-08 17:00:00', '08/10/2026 17:00'],
    ['2026-10-08T17:00:00.123', '08/10/2026 17:00'],
    ['2026-06-08 16:00:00', '08/06/2026 16:00']
  ])('respeta Santiago para la apertura %s', (fecha, expected) => {
    generarPdfCierreCaja({ ...DATA, fecha_apertura: fecha });
    expect(rowValue('Apertura')).toBe(expected);
    expect(rowValue('Cierre')).toBe('09/10/2026 02:00');
  });

  it('no inventa nombres, autorización ni fecha de cierre en cajas abiertas', () => {
    generarPdfCierreCaja({
      ...DATA,
      estado: 'Pendiente de autorización',
      resuelto_por: 'Dato obsoleto',
      solicitado_por: null,
      cajero_nombre: null
    });
    expect(rowValue('Autorizó el cierre')).toBe('No autorizado');
    expect(rowValue('Cierre')).toBe('Sin cierre');
    expect(rowValue('Solicitado por')).toBe('No registrado');
    expect(rowValue('Cajero responsable')).toBe('No registrado');
    expect(texts()).not.toContain('Administrador');
    expect(texts()).not.toContain('Dato obsoleto');
    expect(texts()).toContain('CIERRE ESTIMADO');
    expect(texts().join(' ')).toContain('MONTO DE CIERRE ESTIMADO');
    expect(texts()).not.toContain('MONTO FINAL DE CIERRE');
  });

  it('prefiere la fecha real de cierre y conserva la resolución como respaldo', () => {
    generarPdfCierreCaja({ ...DATA, fecha_resolucion: '2026-10-10 12:30:00' });
    expect(rowValue('Cierre')).toBe('09/10/2026 02:00');
    capture.texts.length = 0;
    generarPdfCierreCaja({ ...DATA, fecha_cierre: null, fecha_resolucion: '2026-10-10 12:30:00' });
    expect(rowValue('Cierre')).toBe('10/10/2026 12:30');
  });

  it('muestra ausencia de datos sin afirmar una autorización', () => {
    generarPdfCierreCaja({ estado: 'Cerrada', usuario_id_cierre: 'id-no-es-nombre' });
    expect(rowValue('Autorizó el cierre')).toBe('No registrado');
    expect(rowValue('Apertura')).toBe('Sin fecha');
    expect(texts()).not.toContain('id-no-es-nombre');
    expect(texts()).toContain('No hay productos registrados para este turno.');
    assertPageBounds();
  });

  it('no convierte fechas inválidas en la hora actual', () => {
    generarPdfCierreCaja({ ...DATA, fecha_apertura: 'no-es-fecha', fecha_cierre: new Date(NaN) });
    expect(rowValue('Apertura')).toBe('Fecha no válida');
    expect(rowValue('Cierre')).toBe('Fecha no válida');
  });

  it('envuelve nombres completos y productos sin perder texto ni solapar columnas', () => {
    const cajero = 'Responsable con nombre compuesto y varios apellidos '.repeat(60).trim();
    const autoriza = 'Persona que autoriza con nombre y apellidos extensos '.repeat(4).trim();
    const producto = 'Cóctel de la casa con ingredientes y presentación especial '.repeat(8).trim();
    generarPdfCierreCaja({
      ...DATA,
      cajero_nombre: cajero,
      resuelto_por: autoriza,
      solicitado_por: cajero,
      ventas_por_producto: [{ producto, monto: 64000 }]
    });
    const values = capture.texts
      .filter(draw => draw.x === 194 && draw.fontSize === 10)
      .map(draw => draw.text)
      .join(' ');
    expect(values).toContain(cajero);
    expect(values).toContain(autoriza);
    const productText = capture.texts
      .filter(draw => draw.x === 16 && draw.fontSize === 8 && draw.y >= 36)
      .map(draw => draw.text)
      .join(' ');
    expect(productText).toContain(producto);
    capture.texts
      .filter(draw => draw.x === 194 && draw.fontSize === 10)
      .forEach(draw => {
        expect(draw.width).toBeLessThanOrEqual(79.1);
      });
    assertPageBounds();
    assertHeadingsHaveContent();
  });

  it('pagina un motivo extenso íntegro con cabeceras, títulos y numeración total', () => {
    const lines = Array.from(
      { length: 220 },
      (_, index) =>
        `Observación ${String(index + 1).padStart(3, '0')}: revisión del cierre y arqueo.`
    );
    generarPdfCierreCaja({ ...DATA, motivo: lines.join('\n') });
    const pageCount = capture.document!.getNumberOfPages();
    expect(pageCount).toBeGreaterThan(4);
    expect(
      capture.texts.filter(draw => draw.text.startsWith('Observación ')).map(draw => draw.text)
    ).toEqual(lines);
    const reasonPages = new Set(
      capture.texts.filter(draw => draw.text.startsWith('Observación ')).map(draw => draw.page)
    );
    expect(reasonPages.size).toBeGreaterThan(3);
    for (let page = 1; page <= pageCount; page++) {
      expect(capture.texts).toContainEqual(
        expect.objectContaining({ text: `Página ${page} de ${pageCount}`, page, y: 288 })
      );
      if (page > 1)
        expect(capture.texts).toContainEqual(
          expect.objectContaining({ text: 'REPORTE DE CAJA (continuación)', page })
        );
    }
    expect(texts()).toContain('Motivo del cierre (continuación)');
    assertPageBounds();
    assertHeadingsHaveContent();
  });
});
