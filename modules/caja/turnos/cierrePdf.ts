import { jsPDF } from 'jspdf';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

type CierreCajaReportData = Record<string, unknown>;

const value = (data: CierreCajaReportData, key: string) => data[key];
const amount = (data: CierreCajaReportData, key: string) =>
  formatCurrencyCLP(Number(value(data, key) || 0));
const nameLabel = (input: unknown) =>
  typeof input === 'string' && input.trim() ? input.trim() : 'No registrado';
const dateLabel = (input: unknown): string => {
  if (!input) return 'Sin fecha';
  if (input instanceof Date && Number.isNaN(input.getTime())) return 'Fecha no válida';
  const text = input instanceof Date ? input.toISOString() : String(input).trim();
  // Un timestamp naive ya es la hora de pared de Santiago. El offset de hoy
  // no sirve para interpretar turnos de otra temporada de horario de verano.
  const naive = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?)?$/.exec(text);
  let businessDate: string;
  if (naive) {
    businessDate = `${naive[1]} ${naive[2] || '00:00'}`;
  } else {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return 'Fecha no válida';
    businessDate = getNowInBusinessTimezone(date);
  }
  const [year, month, day] = businessDate.slice(0, 10).split('-');
  return `${day}/${month}/${year} ${businessDate.slice(11, 16)}`;
};

type ReportRow = readonly [label: string, text: string];

/** Genera el arqueo de una caja, también mientras sigue abierta. */
export function generarPdfCierreCaja(data: CierreCajaReportData): Buffer {
  const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
  const left = 16;
  const right = 194;
  const width = right - left;
  const bottom = 277;
  const continuationTop = 36;
  const lineHeight = 5;
  const labelWidth = 91;
  const valueWidth = width - labelWidth - 8;
  let y = 0;
  let sectionTitle = '';

  const cajaLabel = `Caja ${String(value(data, 'caja_id') ?? 'Sin identificador')}`;
  const estado = String(value(data, 'estado') ?? 'Sin estado registrado');
  const abierta =
    value(data, 'caja_estado') === 1 ||
    value(data, 'estado') === 1 ||
    /abierta|pendiente/i.test(estado);
  const cerrada =
    !abierta &&
    (value(data, 'caja_estado') === 0 ||
      value(data, 'estado') === 0 ||
      /^(aprobada|cerrada)$/i.test(estado));
  const finalLabel = cerrada ? 'MONTO FINAL DE CIERRE' : 'MONTO DE CIERRE ESTIMADO';

  const wrap = (text: string, maxWidth: number, size: number, bold = false): string[] => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    return pdf.splitTextToSize(text, maxWidth) as string[];
  };
  const drawHeading = (text: string) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(40, 54, 82);
    pdf.text(text, left, y + 3);
    y += 11;
  };
  const newPage = (continueSection = false) => {
    pdf.addPage();
    pdf.setFillColor(23, 32, 56);
    pdf.rect(0, 0, 210, 28, 'F');
    pdf.setFillColor(99, 91, 255);
    pdf.rect(0, 0, 4, 28, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(210, 218, 232);
    pdf.text('LAS MUÑECAS DE RAMÓN', left, 10);
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.text('REPORTE DE CAJA (continuación)', left, 20);
    y = continuationTop;
    if (continueSection && sectionTitle) drawHeading(`${sectionTitle} (continuación)`);
  };
  const ensureSpace = (height: number, continueSection = false) => {
    if (y + height > bottom) newPage(continueSection);
  };
  const measureRow = ([label, text]: ReportRow) => {
    const labels = wrap(label, labelWidth, 10);
    const values = wrap(text, valueWidth, 10, true);
    return { labels, values, height: Math.max(labels.length, values.length) * lineHeight + 2 };
  };
  const row = (item: ReportRow) => {
    const { labels, values, height } = measureRow(item);
    ensureSpace(Math.min(height, bottom - continuationTop - 11), true);
    const count = Math.max(labels.length, values.length);
    for (let index = 0; index < count; index++) {
      ensureSpace(lineHeight, true);
      if (labels[index]) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(55, 65, 81);
        pdf.text(labels[index], left, y);
      }
      if (values[index]) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(55, 65, 81);
        pdf.text(values[index], right, y, { align: 'right' });
      }
      y += lineHeight;
    }
    y += 2;
  };
  const section = (title: string, rows: readonly ReportRow[]) => {
    const heights = rows.map(item => measureRow(item).height);
    const total = 11 + heights.reduce((sum, height) => sum + height, 0);
    // Secciones compactas juntas; las largas conservan título y primera fila.
    const required =
      total <= bottom - continuationTop
        ? total
        : 11 + Math.min(heights[0] || 7, bottom - continuationTop - 11);
    ensureSpace(required);
    sectionTitle = title;
    drawHeading(title);
    rows.forEach(row);
    y += 5;
  };

  const headerCaja = wrap(cajaLabel, 88, 9);
  const headerEstado = wrap(`ESTADO: ${estado.toUpperCase()}`, 82, 8, true);
  const headerHeight = 37 + Math.max(headerCaja.length, headerEstado.length) * 5;
  pdf.setFillColor(23, 32, 56);
  pdf.rect(0, 0, 210, headerHeight, 'F');
  pdf.setFillColor(99, 91, 255);
  pdf.rect(0, 0, 4, headerHeight, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(210, 218, 232);
  pdf.text('LAS MUÑECAS DE RAMÓN  ·  REPORTE ADMINISTRATIVO', left, 12);
  pdf.setFontSize(20);
  pdf.setTextColor(255, 255, 255);
  pdf.text('REPORTE DE CAJA', left, 24);
  headerCaja.forEach((line, index) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(210, 218, 232);
    pdf.text(line, left, 33 + index * 5);
  });
  headerEstado.forEach((line, index) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(line, right, 33 + index * 5, { align: 'right' });
  });
  y = headerHeight + 6;

  // Síntesis y desglose comparten importes: no volver a restar egresos neteados.
  const sales = Number(value(data, 'venta') || 0) + Number(value(data, 'servicio') || 0);
  const cash = Number(value(data, 'efectivo') || 0);
  const card = Number(value(data, 'tarjeta') || 0);
  const transfer = Number(value(data, 'transferencia') || 0);
  const cards = [
    { label: 'VENTAS + SERVICIOS', amount: sales },
    { label: 'EFECTIVO DEL TURNO', amount: cash },
    {
      label: cerrada ? 'MONTO DE CIERRE' : 'CIERRE ESTIMADO',
      amount: Number(value(data, 'monto_cierre_calculado') || 0)
    }
  ];
  const gap = 4;
  const cardWidth = (width - gap * 2) / 3;
  const cardLines = cards.map(item =>
    wrap(formatCurrencyCLP(item.amount), cardWidth - 10, 12, true)
  );
  const cardHeight = 17 + Math.max(...cardLines.map(lines => lines.length)) * 5;
  ensureSpace(cardHeight);
  cards.forEach((item, index) => {
    const x = left + index * (cardWidth + gap);
    pdf.setFillColor(246, 248, 252);
    pdf.setDrawColor(225, 230, 238);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(75, 85, 99);
    pdf.text(item.label, x + 5, y + 7);
    pdf.setFontSize(12);
    pdf.setTextColor(31, 41, 55);
    cardLines[index].forEach((line, lineIndex) => pdf.text(line, x + 5, y + 17 + lineIndex * 5));
  });
  y += cardHeight + 9;

  const payments = [
    { label: 'Efectivo', amount: cash, color: [5, 150, 105] as const },
    { label: 'Tarjeta', amount: card, color: [14, 116, 200] as const },
    { label: 'Transferencias', amount: transfer, color: [124, 58, 237] as const }
  ];
  sectionTitle = 'Distribución de dinero';
  ensureSpace(44);
  drawHeading(sectionTitle);
  const maxPayment = Math.max(1, ...payments.map(item => item.amount));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  const paymentValueWidth = Math.max(
    28,
    ...payments.map(item => pdf.getTextWidth(formatCurrencyCLP(item.amount)) + 3)
  );
  const barX = left + 37;
  const barMaxWidth = Math.max(1, width - 37 - paymentValueWidth - 4);
  payments.forEach(item => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(75, 85, 99);
    pdf.text(item.label, left, y + 4);
    pdf.setFillColor(235, 238, 244);
    pdf.roundedRect(barX, y, barMaxWidth, 5, 2, 2, 'F');
    if (item.amount > 0) {
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.roundedRect(barX, y, (item.amount / maxPayment) * barMaxWidth, 5, 2, 2, 'F');
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrencyCLP(item.amount), right, y + 4, { align: 'right' });
    y += 10;
  });
  y += 5;

  const products = Array.isArray(value(data, 'ventas_por_producto'))
    ? (value(data, 'ventas_por_producto') as Array<Record<string, unknown>>).slice(0, 5)
    : [];
  sectionTitle = 'Productos más vendidos';
  const productLines = products.map(product =>
    wrap(String(product.producto || 'Producto sin nombre'), 66, 8)
  );
  const productHeight = (lines: string[]) =>
    Math.min(lines.length * 4 + 5, bottom - continuationTop - 11);
  ensureSpace(11 + (productLines[0] ? productHeight(productLines[0]) : 9));
  drawHeading(sectionTitle);
  if (products.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(75, 85, 99);
    pdf.text('No hay productos registrados para este turno.', left, y);
    y += 9;
  } else {
    const maxProduct = Math.max(1, ...products.map(product => Number(product.monto || 0)));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    const productValueWidth = Math.max(
      28,
      ...products.map(
        product => pdf.getTextWidth(formatCurrencyCLP(Number(product.monto || 0))) + 7
      )
    );
    const productBarX = left + 70;
    const productBarWidth = Math.max(1, width - 70 - productValueWidth);
    products.forEach((product, index) => {
      const lines = productLines[index];
      ensureSpace(productHeight(lines), true);
      const amountValue = Number(product.monto || 0);
      pdf.setFillColor(235, 238, 244);
      pdf.roundedRect(productBarX, y, productBarWidth, 4, 1.5, 1.5, 'F');
      if (amountValue > 0) {
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(
          productBarX,
          y,
          (amountValue / maxProduct) * productBarWidth,
          4,
          1.5,
          1.5,
          'F'
        );
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(75, 85, 99);
      pdf.text(formatCurrencyCLP(amountValue), right, y + 3, { align: 'right' });
      lines.forEach(line => {
        ensureSpace(4, true);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(75, 85, 99);
        pdf.text(line, left, y + 3);
        y += 4;
      });
      y += 5;
    });
  }
  y += 5;

  section('Datos del turno', [
    ['Cajero responsable', nameLabel(value(data, 'cajero_nombre'))],
    ['Autorizó el cierre', cerrada ? nameLabel(value(data, 'resuelto_por')) : 'No autorizado'],
    ['Apertura', dateLabel(value(data, 'fecha_apertura'))],
    [
      'Cierre',
      abierta
        ? 'Sin cierre'
        : dateLabel(value(data, 'fecha_cierre') || value(data, 'fecha_resolucion'))
    ],
    ['Solicitado por', nameLabel(value(data, 'solicitado_por'))]
  ]);
  section('Movimiento del turno', [
    ['Ventas', amount(data, 'venta')],
    ['Servicios', amount(data, 'servicio')],
    ['Propinas', amount(data, 'propina')],
    ['Comisiones', amount(data, 'comision')],
    ['Anticipos', amount(data, 'anticipo')],
    ['IVA', amount(data, 'iva')]
  ]);
  section('Arqueo final', [
    ['Monto de apertura', amount(data, 'monto_apertura')],
    ['Efectivo neto del turno', amount(data, 'efectivo')],
    ['Tarjeta', amount(data, 'tarjeta')],
    ['Transferencias', amount(data, 'transferencia')],
    ['Devoluciones (ya descontadas)', amount(data, 'devolucion')],
    ['Retiros (ya descontados)', amount(data, 'retiro_total')],
    ['Saldos de clientes descontados', `-${amount(data, 'saldo_clientes_descontado')}`],
    ['Saldo que falta devolver a clientes', amount(data, 'saldo_clientes_por_devolver')]
  ]);
  section('Prepago de clientes', [
    ['Cargado durante el turno', amount(data, 'prepago_cargado')],
    ['Consumido', amount(data, 'prepago_consumido')],
    ['Saldo pendiente de clientes', amount(data, 'prepago_pendiente_clientes')]
  ]);

  sectionTitle = '';
  const totalLines = wrap(amount(data, 'monto_cierre_calculado'), 68, 15, true);
  const totalLabelLines = wrap(finalLabel, width - 83, 12, true);
  const totalHeight = 10 + Math.max(totalLines.length, totalLabelLines.length) * 6;
  ensureSpace(totalHeight + 5);
  pdf.setFillColor(31, 41, 55);
  pdf.roundedRect(left, y - 3, width, totalHeight, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  totalLabelLines.forEach((line, index) => pdf.text(line, left + 5, y + 7 + index * 6));
  pdf.setFontSize(15);
  totalLines.forEach((line, index) =>
    pdf.text(line, right - 5, y + 7 + index * 6, { align: 'right' })
  );
  y += totalHeight + 8;

  const motivo = String(value(data, 'motivo') || '').trim();
  if (motivo) {
    sectionTitle = 'Motivo del cierre';
    const lines = wrap(motivo, width, 10);
    ensureSpace(11 + Math.min(lines.length, 2) * lineHeight);
    drawHeading(sectionTitle);
    lines.forEach(line => {
      ensureSpace(lineHeight, true);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(55, 65, 81);
      pdf.text(line, left, y);
      y += lineHeight;
    });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(225, 230, 238);
    pdf.line(left, 282, right, 282);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(75, 85, 99);
    pdf.text('Las Muñecas de Ramón · Reporte de caja · CLP', left, 288);
    pdf.text(`Página ${page} de ${pageCount}`, right, 288, { align: 'right' });
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
