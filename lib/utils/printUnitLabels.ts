import JsBarcode from 'jsbarcode';

/** Datos que puede imprimir una etiqueta: nunca stock, precios ni datos de la compra. */
export interface PrintableLabel {
  code: string;
  producto_nombre?: string | null;
  presentacion_nombre?: string | null;
}

/** Se acepta solo el código (etiquetas antiguas) o el código con su producto y presentación. */
export type PrintableLabelInput = string | PrintableLabel;

const nombre = (input: PrintableLabelInput): PrintableLabel =>
  typeof input === 'string' ? { code: input } : input;

const LABEL_STYLE = `
    @page { size: A4; margin: 10mm; }
    body { margin: 0; background: white; color: black; }
    main { display: flex; flex-wrap: wrap; align-content: flex-start; }
    .label { width: 50mm; height: 30mm; padding: 1.5mm 2mm; box-sizing: border-box;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.6mm; overflow: hidden; text-align: center;
      break-inside: avoid; page-break-inside: avoid; }
    .label .texto { max-width: 100%; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; }
    .label .producto { font: 700 8pt/1.1 Arial, Helvetica, sans-serif; }
    .label .presentacion { font: 7pt/1.1 Arial, Helvetica, sans-serif; }
    svg { width: 100%; height: auto; max-height: 15mm; }
  `;

function texto(doc: Document, className: string, value: string) {
  const span = doc.createElement('span');
  span.className = `texto ${className}`;
  span.textContent = value;
  return span;
}

export function buildUnitLabels(doc: Document, labels: PrintableLabelInput[]) {
  doc.title = '';
  const style = doc.createElement('style');
  style.textContent = LABEL_STYLE;
  doc.head.append(style);
  const contenedor = doc.createElement('main');
  for (const input of labels) {
    const label = nombre(input);
    const caja = doc.createElement('div');
    caja.className = 'label';
    // Solo se agrega lo que se conoce: sin producto/presentación la etiqueta queda como antes.
    const producto = label.producto_nombre?.trim();
    const presentacion = label.presentacion_nombre?.trim();
    if (producto) caja.append(texto(doc, 'producto', producto));
    if (presentacion) caja.append(texto(doc, 'presentacion', presentacion));
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, label.code, {
      xmlDocument: doc,
      format: /^\d{13}$/.test(label.code) ? 'EAN13' : 'CODE128',
      displayValue: true,
      width: 2,
      height: 50,
      fontSize: 14,
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000'
    });
    caja.append(svg);
    contenedor.append(caja);
  }
  doc.body.replaceChildren(contenedor);
}

export function printUnitLabels(labels: PrintableLabelInput[]) {
  if (!labels.length) return;
  const printWindow = window.open('', '_blank', 'width=850,height=650');
  if (!printWindow) throw new Error('Permite las ventanas emergentes para imprimir las etiquetas.');
  try {
    buildUnitLabels(printWindow.document, labels);
    printWindow.focus();
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => printWindow.print());
    });
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
