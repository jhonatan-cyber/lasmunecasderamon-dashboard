import JsBarcode from 'jsbarcode';

/** The print document receives only codes, never inventory or purchase metadata. */
export function buildUnitLabels(doc: Document, codes: string[]) {
  doc.title = '';
  const style = doc.createElement('style');
  style.textContent = `
    @page { size: A4; margin: 10mm; }
    body { margin: 0; background: white; color: black; }
    main { display: flex; flex-wrap: wrap; align-content: flex-start; }
    .label { width: 50mm; height: 30mm; padding: 2mm; box-sizing: border-box;
      display: flex; align-items: center; justify-content: center;
      break-inside: avoid; page-break-inside: avoid; }
    svg { width: 100%; height: auto; max-height: 26mm; }
  `;
  doc.head.append(style);
  const labels = doc.createElement('main');
  for (const code of codes) {
    const label = doc.createElement('div');
    label.className = 'label';
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, code, {
      xmlDocument: doc,
      format: /^\d{13}$/.test(code) ? 'EAN13' : 'CODE128',
      displayValue: true,
      width: 2,
      height: 70,
      fontSize: 18,
      margin: 12,
      background: '#ffffff',
      lineColor: '#000000'
    });
    label.append(svg);
    labels.append(label);
  }
  doc.body.replaceChildren(labels);
}

export function printUnitLabels(codes: string[]) {
  if (!codes.length) return;
  const printWindow = window.open('', '_blank', 'width=850,height=650');
  if (!printWindow) throw new Error('Permite las ventanas emergentes para imprimir las etiquetas.');
  try {
    buildUnitLabels(printWindow.document, codes);
    printWindow.focus();
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => printWindow.print());
    });
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
