export interface SaleReceiptLine {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  detail?: string;
}

export interface SaleReceiptData {
  code?: string | null;
  date?: string | Date | null;
  customer?: string | null;
  location?: string | null;
  paymentMethod?: string | null;
  origin?: string | null;
  subtotal: number;
  tip: number;
  total: number;
  lines: SaleReceiptLine[];
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatMoney = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;

export function buildSaleReceiptHtml(receipt: SaleReceiptData): string {
  const date = receipt.date ? new Date(receipt.date).toLocaleString('es-CL') : '';
  const lines = receipt.lines
    .map(
      line => `
        <article class="item">
          <div class="item-title">${escapeHtml(line.name)}${line.detail ? ` · ${escapeHtml(line.detail)}` : ''}</div>
          <div class="item-row"><span>${line.quantity} × ${formatMoney(line.unitPrice)}</span><strong>${formatMoney(line.subtotal)}</strong></div>
        </article>`
    )
    .join('');
  const optionalDetails = [
    receipt.code && `<div><span>Ticket</span><strong>${escapeHtml(receipt.code)}</strong></div>`,
    date && `<div><span>Fecha</span><strong>${escapeHtml(date)}</strong></div>`,
    receipt.customer &&
      `<div><span>Cliente</span><strong>${escapeHtml(receipt.customer)}</strong></div>`,
    receipt.location &&
      `<div><span>Ubicación</span><strong>${escapeHtml(receipt.location)}</strong></div>`,
    receipt.origin &&
      `<div><span>Origen</span><strong>${escapeHtml(receipt.origin)}</strong></div>`,
    receipt.paymentMethod &&
      `<div><span>Pago</span><strong>${escapeHtml(receipt.paymentMethod)}</strong></div>`
  ]
    .filter(Boolean)
    .join('');

  return `<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Ticket ${escapeHtml(receipt.code || 'de venta')}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          * { box-sizing: border-box; }
          body { width: 74mm; margin: 0 auto; color: #111; font: 12px/1.4 Arial, sans-serif; }
          h1 { margin: 0; font-size: 17px; text-align: center; }
          .subtitle { margin: 2px 0 12px; text-align: center; font-size: 10px; }
          .details { display: grid; gap: 4px; padding: 8px 0; border-top: 1px dashed #555; border-bottom: 1px dashed #555; }
          .details div, .item-row, .total { display: flex; justify-content: space-between; gap: 8px; }
          .details strong { text-align: right; }
          .items { padding: 4px 0; }
          .item { padding: 7px 0; border-bottom: 1px dashed #aaa; }
          .item-title { font-weight: 700; overflow-wrap: anywhere; }
          .item-row { margin-top: 3px; }
          .totals { display: grid; gap: 5px; padding-top: 8px; border-top: 1px dashed #555; }
          .total { font-size: 15px; font-weight: 700; }
          footer { margin-top: 14px; text-align: center; font-size: 10px; }
          @media screen { body { padding: 8px; } }
        </style>
      </head>
      <body>
        <header><h1>Las Muñecas de Ramón</h1><p class="subtitle">Ticket de venta</p></header>
        <section class="details">${optionalDetails}</section>
        <section class="items">${lines}</section>
        <section class="totals">
          <div class="item-row"><span>Subtotal</span><strong>${formatMoney(receipt.subtotal)}</strong></div>
          ${receipt.tip > 0 ? `<div class="item-row"><span>Propina</span><strong>${formatMoney(receipt.tip)}</strong></div>` : ''}
          <div class="total"><span>TOTAL</span><span>${formatMoney(receipt.total)}</span></div>
        </section>
        <footer>Gracias por su preferencia</footer>
      </body>
    </html>`;
}

export function openSaleReceiptWindow(): Window | null {
  return window.open('', '_blank', 'width=420,height=720');
}

export function printSaleReceipt(target: Window, receipt: SaleReceiptData): void {
  target.document.open();
  target.document.write(buildSaleReceiptHtml(receipt));
  target.document.close();
  target.focus();
  target.setTimeout(() => {
    if (!target.closed) target.print();
  }, 250);
}

export function closeSaleReceiptWindow(target: Window | null): void {
  if (target && !target.closed) target.close();
}
