import { jsPDF } from 'jspdf';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

type CierreCajaReportData = Record<string, unknown>;

const value = (data: CierreCajaReportData, key: string) => data[key];
const amount = (data: CierreCajaReportData, key: string) =>
  formatCurrencyCLP(Number(value(data, key) || 0));
const dateLabel = (input: unknown) => {
  if (!input) return '—';
  const date = input instanceof Date ? input : new Date(String(input));
  return Number.isNaN(date.getTime())
    ? String(input).replace('T', ' ').slice(0, 16)
    : new Intl.DateTimeFormat('es-BO', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/La_Paz'
      }).format(date);
};

function addReportVisuals(pdf: jsPDF, data: CierreCajaReportData, left: number, right: number) {
  const width = right - left;
  const sales = Number(value(data, 'venta') || 0) + Number(value(data, 'servicio') || 0);
  const cash = Number(value(data, 'efectivo') || 0);
  const card = Number(value(data, 'tarjeta') || 0);
  const transfer = Number(value(data, 'transferencia') || 0);
  const close = Number(value(data, 'monto_cierre_calculado') || 0);

  const cards = [
    { label: 'VENTAS + SERVICIOS', amount: sales, color: [79, 70, 229] as const },
    { label: 'EFECTIVO EN CAJA', amount: cash, color: [5, 150, 105] as const },
    { label: 'MONTO DE CIERRE', amount: close, color: [14, 116, 200] as const }
  ];
  const gap = 4;
  const cardWidth = (width - gap * 2) / 3;
  cards.forEach((card, index) => {
    const x = left + index * (cardWidth + gap);
    pdf.setFillColor(246, 248, 252);
    pdf.setDrawColor(225, 230, 238);
    pdf.roundedRect(x, 48, cardWidth, 22, 2, 2, 'FD');
    pdf.setFillColor(card.color[0], card.color[1], card.color[2]);
    pdf.roundedRect(x, 48, 2, 22, 1, 1, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(105, 115, 132);
    pdf.text(card.label, x + 5, 55);
    pdf.setFontSize(12);
    pdf.setTextColor(31, 41, 55);
    pdf.text(formatCurrencyCLP(card.amount), x + 5, 65);
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(40, 54, 82);
  pdf.text('Distribución de dinero', left, 82);
  const payments = [
    { label: 'Efectivo', amount: cash, color: [5, 150, 105] as const },
    { label: 'Tarjeta', amount: card, color: [14, 116, 200] as const },
    { label: 'Transferencias', amount: transfer, color: [124, 58, 237] as const }
  ];
  const maxPayment = Math.max(1, ...payments.map(item => item.amount));
  const barX = left + 37;
  const barMaxWidth = width - 66;
  payments.forEach((item, index) => {
    const y = 90 + index * 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(75, 85, 99);
    pdf.text(item.label, left, y + 4);
    pdf.setFillColor(235, 238, 244);
    pdf.roundedRect(barX, y, barMaxWidth, 5, 2, 2, 'F');
    if (item.amount > 0) {
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.roundedRect(barX, y, Math.max(2, (item.amount / maxPayment) * barMaxWidth), 5, 2, 2, 'F');
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrencyCLP(item.amount), right, y + 4, { align: 'right' });
  });

  const products = Array.isArray(value(data, 'ventas_por_producto'))
    ? (value(data, 'ventas_por_producto') as Array<Record<string, unknown>>).slice(0, 5)
    : [];
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(40, 54, 82);
  pdf.text('Productos más vendidos', left, 127);
  if (products.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(110, 120, 138);
    pdf.text('No hay productos registrados para este turno.', left, 135);
    return;
  }

  const maxProduct = Math.max(1, ...products.map(product => Number(product.monto || 0)));
  const productBarX = left + 70;
  const productBarWidth = width - 98;
  products.forEach((product, index) => {
    const y = 133 + index * 9;
    const name = String(product.producto || 'Producto sin nombre');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(75, 85, 99);
    pdf.text(pdf.splitTextToSize(name, 66)[0] || name, left, y + 3.8);
    pdf.setFillColor(235, 238, 244);
    pdf.roundedRect(productBarX, y, productBarWidth, 4, 1.5, 1.5, 'F');
    const amountValue = Number(product.monto || 0);
    if (amountValue > 0) {
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(
        productBarX,
        y,
        Math.max(2, (amountValue / maxProduct) * productBarWidth),
        4,
        1.5,
        1.5,
        'F'
      );
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrencyCLP(amountValue), right, y + 3.8, { align: 'right' });
  });
}

/** Genera el arqueo final de una caja en un PDF que Twilio pueda adjuntar. */
export function generarPdfCierreCaja(data: CierreCajaReportData): Buffer {
  const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
  const left = 16;
  const right = 194;
  let y = 18;

  const pageIfNeeded = (height = 8) => {
    if (y + height > 280) {
      pdf.addPage();
      y = 18;
    }
  };
  const heading = (text: string) => {
    pageIfNeeded(13);
    y += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(40, 54, 82);
    pdf.text(text, left, y);
    y += 8;
  };
  const row = (label: string, text: string) => {
    pageIfNeeded();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(55, 65, 81);
    pdf.text(label, left, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(text || '—', right, y, { align: 'right' });
    y += 7;
  };

  pdf.setFillColor(23, 32, 56);
  pdf.rect(0, 0, 210, 42, 'F');
  pdf.setFillColor(99, 91, 255);
  pdf.rect(0, 0, 4, 42, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(167, 178, 203);
  pdf.text('LAS MUÑECAS DE RAMÓN  ·  REPORTE ADMINISTRATIVO', left, 12);
  pdf.setFontSize(20);
  pdf.setTextColor(255, 255, 255);
  pdf.text('REPORTE DE CAJA', left, 24);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(210, 218, 232);
  pdf.text(`Caja ${String(value(data, 'caja_id') || '').slice(0, 12)}`, left, 33);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`ESTADO: ${String(value(data, 'estado') || 'aprobada').toUpperCase()}`, right, 33, {
    align: 'right'
  });
  y = 47;
  addReportVisuals(pdf, data, left, right);
  y = 184;

  heading('Datos del turno');
  row('Cajero responsable', String(value(data, 'cajero_nombre') || 'Sin asignar'));
  row('Autorizó el cierre', String(value(data, 'resuelto_por') || 'Administrador'));
  row('Apertura', dateLabel(value(data, 'fecha_apertura')));
  row('Cierre', dateLabel(value(data, 'fecha_resolucion') || value(data, 'fecha_cierre')));
  row('Solicitado por', String(value(data, 'solicitado_por') || '—'));

  heading('Movimiento del turno');
  row('Ventas', amount(data, 'venta'));
  row('Servicios', amount(data, 'servicio'));
  row('Propinas', amount(data, 'propina'));
  row('Comisiones', amount(data, 'comision'));
  row('Anticipos', amount(data, 'anticipo'));
  row('IVA', amount(data, 'iva'));

  heading('Arqueo final');
  row('Monto de apertura', amount(data, 'monto_apertura'));
  row('Efectivo', amount(data, 'efectivo'));
  row('Tarjeta', amount(data, 'tarjeta'));
  row('Transferencias', amount(data, 'transferencia'));
  row('Devoluciones', `-${amount(data, 'devolucion')}`);
  row('Retiros', `-${amount(data, 'retiro_total')}`);
  row('Saldos de clientes descontados', `-${amount(data, 'saldo_clientes_descontado')}`);
  row('Saldo que falta devolver a clientes', amount(data, 'saldo_clientes_por_devolver'));

  heading('Prepago de clientes');
  row('Cargado durante el turno', amount(data, 'prepago_cargado'));
  row('Consumido', amount(data, 'prepago_consumido'));
  row('Saldo pendiente de clientes', amount(data, 'prepago_pendiente_clientes'));

  pageIfNeeded(24);
  y += 3;
  pdf.setFillColor(31, 41, 55);
  pdf.roundedRect(left, y - 6, right - left, 16, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('MONTO FINAL DE CIERRE', left + 5, y + 4);
  pdf.setFontSize(15);
  pdf.text(amount(data, 'monto_cierre_calculado'), right - 5, y + 4, { align: 'right' });
  y += 19;

  const motivo = String(value(data, 'motivo') || '').trim();
  if (motivo) {
    heading('Motivo del cierre');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(55, 65, 81);
    const lines = pdf.splitTextToSize(motivo, right - left);
    pageIfNeeded(lines.length * 5 + 3);
    pdf.text(lines, left, y);
  }

  return Buffer.from(pdf.output('arraybuffer'));
}
