import { formatCurrencyNoDecimals, formatFechaLarga, formatSoloHora } from '@/lib/utils/formatters';

export interface CajaExportContext {
  caja: any;
  activeTab: string;
  estadoInfo: { label: string };
  filteredVentas: any[];
  filteredServicios: any[];
  retiros: any[];
  ventasTragosChicas: any;
  ventasChampagne: any;
  ventasBarras: any;
  totalCargoTarjeta?: number;
  prepagoCargado: number;
  prepagoConsumido: number;
  ingresosReales: number;
  efectivoNeto: number;
  tarjetaCaja: number;
  transferenciaCaja: number;
  totalMetodosPago: number;
  totalReal: number;
  distribucionDinero: Array<{ concepto: string; monto: number }>;
}

export const formatMetodoPagoDetalle = (metodoPago?: string | null, pagosMixtos?: any) => {
  if (metodoPago !== 'mixto') return metodoPago || 'efectivo';

  let pagos: any[] = [];
  if (Array.isArray(pagosMixtos)) {
    pagos = pagosMixtos;
  } else if (typeof pagosMixtos === 'string') {
    try {
      pagos = JSON.parse(pagosMixtos || '[]');
    } catch {
      pagos = [];
    }
  }

  const detalle = pagos
    .map((pago: any) => {
      const metodo = String(pago?.metodo || '').trim();
      const monto = Number(pago?.monto || 0);
      if (!metodo || monto <= 0) return null;
      return `${metodo}: ${formatCurrencyNoDecimals(monto)}`;
    })
    .filter(Boolean)
    .join(' + ');

  return detalle ? `Mixto (${detalle})` : 'Mixto';
};

const getTitle = (ctx: CajaExportContext) => {
  switch (ctx.activeTab) {
    case 'resumen':
      return `Resumen de Caja - ${new Date(ctx.caja.fecha_apertura).toLocaleDateString('es-CL')}`;
    case 'ventas':
      return `Ventas - ${formatFechaLarga(ctx.caja.fecha_apertura)}`;
    case 'servicios':
      return `Servicios - ${formatFechaLarga(ctx.caja.fecha_apertura)}`;
    case 'retiros':
      return `Retiros - ${formatFechaLarga(ctx.caja.fecha_apertura)}`;
    default:
      return `Detalles de Caja ${ctx.caja.id_caja}`;
  }
};

const generateDistribucionDineroHTML = (ctx: CajaExportContext) => {
  const rows = ctx.distribucionDinero
    .map(
      row => `
      <tr>
        <td>${row.concepto}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(row.monto)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Distribución del dinero</th>
          <th class="text-right">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

const generateVentasTableHTML = (ctx: CajaExportContext) => {
  const rows = (Array.isArray(ctx.filteredVentas) ? ctx.filteredVentas : [])
    .map(
      venta => `
      <tr>
        <td>${venta.cliente_nombre || 'General'}</td>
        <td>${venta.habitacion_nombre || (venta.habitacion_id ? 'Habitación' : 'Barra')}</td>
        <td class="text-center">${venta.item_count || 0} items</td>
        <td class="text-right">${formatCurrencyNoDecimals(venta.sub_total)}</td>
        <td class="text-right">${formatCurrencyNoDecimals(venta.propina)}</td>
        <td class="text-center">${formatSoloHora(venta.fecha_crea)}</td>
        <td>${formatMetodoPagoDetalle(venta.metodo_pago, venta.pagos_mixtos)}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(venta.total)}</td>
      </tr>
    `
    )
    .join('');

  const totalVentas = (Array.isArray(ctx.filteredVentas) ? ctx.filteredVentas : []).reduce(
    (sum, v) => sum + (v.total || 0),
    0
  );
  const totalPropinas = (Array.isArray(ctx.filteredVentas) ? ctx.filteredVentas : []).reduce(
    (sum, v) => sum + (v.propina || 0),
    0
  );

  return `
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Habitación/Lugar</th>
          <th class="text-center">Detalle</th>
          <th class="text-right">Subtotal</th>
          <th class="text-right">Propina</th>
          <th class="text-center">Hora</th>
          <th>Pago / Distribución</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="summary-row">
          <td colspan="3">TOTAL GENERAL (${ctx.filteredVentas.length} ventas)</td>
          <td colspan="2" class="text-right">Propinas: ${formatCurrencyNoDecimals(totalPropinas)}</td>
          <td colspan="2"></td>
          <td class="text-right">${formatCurrencyNoDecimals(totalVentas)}</td>
        </tr>
      </tbody>
    </table>
  `;
};

const generateServiciosTableHTML = (ctx: CajaExportContext) => {
  const rows = (Array.isArray(ctx.filteredServicios) ? ctx.filteredServicios : [])
    .map(
      serv => `
      <tr>
        <td>${serv.cliente_nombre || 'Particular'}</td>
        <td>${serv.anfitrionas_nombres || 'Sin asignar'}</td>
        <td>${serv.habitacion_nombre || 'N/A'}</td>
        <td class="text-right">${formatCurrencyNoDecimals(serv.total_habitacion || 0)}</td>
        <td class="text-right">${formatCurrencyNoDecimals(serv.iva || 0)}</td>
        <td class="text-center">${formatFechaLarga(serv.fecha_crea)}</td>
        <td>${formatMetodoPagoDetalle(serv.metodo_pago, serv.pagos_mixtos)}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(serv.total)}</td>
      </tr>
    `
    )
    .join('');

  const totalServ = (Array.isArray(ctx.filteredServicios) ? ctx.filteredServicios : []).reduce(
    (sum, s) => sum + (s.total || 0),
    0
  );

  return `
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Anfitrionas</th>
          <th>Habitación</th>
          <th class="text-right">Total Hab.</th>
          <th class="text-right">IVA</th>
          <th class="text-center">Fecha</th>
          <th>Pago / Distribución</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="summary-row">
          <td colspan="7">TOTAL SERVICIOS PRIVADOS (${ctx.filteredServicios.length} servicios)</td>
          <td class="text-right">${formatCurrencyNoDecimals(totalServ)}</td>
        </tr>
      </tbody>
    </table>
  `;
};

const generateRetirosTableHTML = (ctx: CajaExportContext) => {
  const rows = (Array.isArray(ctx.retiros) ? ctx.retiros : [])
    .map(
      ret => `
      <tr>
        <td class="text-center">${formatSoloHora(ret.fecha_crea)}</td>
        <td>${ret.motivo}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(ret.monto)}</td>
      </tr>
    `
    )
    .join('');

  const totalRetiros = (Array.isArray(ctx.retiros) ? ctx.retiros : []).reduce(
    (sum, r) => sum + (r.monto || 0),
    0
  );

  return `
    <table>
      <thead>
        <tr>
          <th class="text-center">Hora</th>
          <th>Motivo</th>
          <th class="text-right">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="summary-row">
          <td colspan="2">TOTAL RETIROS (${ctx.retiros.length} movimientos)</td>
          <td class="text-right">${formatCurrencyNoDecimals(totalRetiros)}</td>
        </tr>
      </tbody>
    </table>
  `;
};

// Los shots van como sub-línea informativa: su monto ya está dentro de las ventas
// (una botella del bar, un trago de chica o una champaña), así que no se suman al total.
const shotsDeCaja = (ctx: CajaExportContext) =>
  ctx.ventasBarras?.shots_cliente || ctx.ventasBarras?.shots_anfitriona
    ? [
        {
          label: 'Shots a clientes (ya en ventas)',
          value: Number(ctx.ventasBarras?.shots_cliente?.monto || 0)
        },
        {
          label: 'Shots a anfitrionas (ya en ventas)',
          value: Number(ctx.ventasBarras?.shots_anfitriona?.monto || 0)
        }
      ]
    : [];

const generateResumenHTML = (ctx: CajaExportContext) => {
  const tableData = [
    { label: 'Monto Apertura', value: ctx.caja.monto_apertura },
    { label: 'Ventas Tragos', value: ctx.ventasTragosChicas?.total_venta || 0 },
    { label: 'Ventas Champaña', value: ctx.ventasChampagne?.total_venta || 0 },
    { label: 'Ventas Barras', value: ctx.ventasBarras?.total_venta || 0 },
    ...shotsDeCaja(ctx),
    ...(ctx.totalCargoTarjeta ? [{ label: 'Cargo tarjeta', value: ctx.totalCargoTarjeta }] : []),
    { label: 'Servicios', value: ctx.caja.servicios || 0 },
    { label: 'Prepago Cargado', value: ctx.prepagoCargado },
    { label: 'Prepago Consumido', value: ctx.prepagoConsumido },
    { label: 'Ingreso Real a Caja', value: ctx.ingresosReales },
    { label: 'Efectivo neto', value: ctx.efectivoNeto },
    { label: 'Tarjeta', value: ctx.tarjetaCaja },
    { label: 'Transferencia', value: ctx.transferenciaCaja },
    { label: 'Subtotal antes de egresos', value: ctx.totalMetodosPago },
    { label: 'Devoluciones', value: -(ctx.caja.devoluciones || 0) },
    ...(ctx.caja.saldo_clientes_descontado
      ? [
          {
            label: 'Saldos de clientes descontados',
            value: -(ctx.caja.saldo_clientes_descontado || 0)
          }
        ]
      : []),
    ...(ctx.caja.saldo_clientes_por_devolver
      ? [
          {
            label: 'Falta devolver a clientes',
            value: ctx.caja.saldo_clientes_por_devolver
          }
        ]
      : []),
    { label: 'Anticipos (ya descontados del efectivo)', value: -(ctx.caja.anticipo || 0) },
    {
      label: 'Retiros (ya descontados del efectivo)',
      value: -ctx.retiros.reduce((sum, r) => sum + (r.monto || 0), 0)
    },
    { label: 'Total real', value: ctx.totalReal }
  ];

  const rows = tableData
    .map(
      item => `
      <tr class="${item.label === 'Total real' ? 'summary-row' : ''}">
        <td>${item.label}</td>
        <td class="text-right">${formatCurrencyNoDecimals(item.value)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="text-right">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

export const generatePrintContent = (ctx: CajaExportContext) => {
  const getTableHTML = () => {
    switch (ctx.activeTab) {
      case 'ventas':
        return generateVentasTableHTML(ctx);
      case 'servicios':
        return generateServiciosTableHTML(ctx);
      case 'retiros':
        return generateRetirosTableHTML(ctx);
      case 'resumen':
      default:
        return generateResumenHTML(ctx);
    }
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${getTitle(ctx)}</title>
        <style>
          @page { margin: 1cm; size: A4; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; margin: 0; padding: 20px; }
          .header { display: flex; align-items: center; justify-content: flex-start; gap: 20px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .logo { height: 50px; width: auto; }
          .header-content { flex: 1; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 14px; color: #666; margin-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .info-label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 5px; }
          .info-value { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f5f5f5; font-weight: bold; text-align: left; padding: 10px 8px; border: 1px solid #ddd; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .summary-row { background-color: #f9f9f9; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #666; }
          @media print { body { margin: 0; padding: 10px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/img/system/logo2.png" alt="Las Muñecas de Ramón" class="logo" />
          <div class="header-content">
            <div class="title">${getTitle(ctx)}</div>
            <div class="subtitle">Estado: ${ctx.estadoInfo.label}</div>
          </div>
        </div>
        ${ctx.activeTab !== 'resumen' ? generateDistribucionDineroHTML(ctx) : ''}
        ${getTableHTML()}
        <div class="footer">Generado el ${new Date().toLocaleString('es-CL')}</div>
      </body>
    </html>
  `;
};

export const getPDFData = (ctx: CajaExportContext) => {
  switch (ctx.activeTab) {
    case 'ventas':
      return {
        headers: [
          '#',
          'Cliente',
          'Habitación',
          'Cantidad',
          'SubTotal',
          'Propina',
          'Hora',
          'Pago / Distribucion',
          'Total'
        ],
        body: ctx.filteredVentas.map((v, i) => [
          (i + 1).toString(),
          v.cliente_nombre || 'General',
          v.habitacion_nombre || (v.habitacion_id ? 'Habitación' : 'Barra'),
          v.item_count || 0,
          v.sub_total || 0,
          v.propina || 0,
          formatSoloHora(v.fecha_crea),
          formatMetodoPagoDetalle(v.metodo_pago, v.pagos_mixtos),
          v.total || 0
        ])
      };
    case 'servicios':
      return {
        headers: [
          '#',
          'Cliente',
          'Anfitrionas',
          'Habitación',
          'Total Habitación',
          'IVA',
          'Fecha',
          'Pago / Distribución',
          'Total'
        ],
        body: ctx.filteredServicios.map((s, i) => [
          (i + 1).toString(),
          s.cliente_nombre || 'N/A',
          s.anfitrionas_nombres || 'Sin asignar',
          s.habitacion_nombre || 'N/A',
          s.total_habitacion || 0,
          s.iva || 0,
          formatFechaLarga(s.fecha_crea),
          formatMetodoPagoDetalle(s.metodo_pago, s.pagos_mixtos),
          s.total || 0
        ])
      };
    case 'retiros':
      return {
        headers: ['#', 'Hora', 'Motivo', 'Monto'],
        body: ctx.retiros.map((r, i) => [
          (i + 1).toString(),
          formatSoloHora(r.fecha_crea),
          r.motivo,
          r.monto
        ])
      };
    default: {
      const resumenRows: Array<[string, number]> = [
        ['Monto Apertura', ctx.caja.monto_apertura],
        ['Ventas Tragos', ctx.ventasTragosChicas?.total_venta || 0],
        ['Ventas Champaña', ctx.ventasChampagne?.total_venta || 0],
        ['Ventas Barras', ctx.ventasBarras?.total_venta || 0],
        ...shotsDeCaja(ctx).map(row => [row.label, row.value] as [string, number]),
        ['Servicios', ctx.caja.servicios || 0],
        ['Prepago Cargado', ctx.prepagoCargado],
        ['Prepago Consumido', ctx.prepagoConsumido],
        ['Ingreso Real a Caja', ctx.ingresosReales],
        ['Efectivo neto', ctx.efectivoNeto],
        ['Tarjeta', ctx.tarjetaCaja],
        ['Transferencia', ctx.transferenciaCaja],
        ['Subtotal antes de egresos', ctx.totalMetodosPago],
        ['Devoluciones', -(ctx.caja.devoluciones || 0)],
        ...(ctx.caja.saldo_clientes_descontado
          ? [
              ['Saldos de clientes descontados', -(ctx.caja.saldo_clientes_descontado || 0)] as [
                string,
                number
              ]
            ]
          : []),
        ...(ctx.caja.saldo_clientes_por_devolver
          ? [
              ['Falta devolver a clientes', ctx.caja.saldo_clientes_por_devolver] as [
                string,
                number
              ]
            ]
          : []),
        ['Anticipos (ya descontados del efectivo)', -(ctx.caja.anticipo || 0)],
        [
          'Retiros (ya descontados del efectivo)',
          -ctx.retiros.reduce((sum, r) => sum + r.monto, 0)
        ],
        ['Total real', ctx.totalReal]
      ];

      return {
        headers: ['#', 'Concepto', 'Monto'],
        body: resumenRows.map((row, index) => [String(index + 1), row[0], row[1]])
      };
    }
  }
};

export const exportToPDF = async (exportContext: CajaExportContext) => {
  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const html2canvas = (await import('html2canvas')).default;

    const doc = new jsPDF();
    const logoUrl = '/img/system/logo2.png';
    const logoResponse = await fetch(logoUrl);
    const logoBlob = await logoResponse.blob();
    const logoBase64 = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(logoBlob);
    });

    doc.addImage(logoBase64, 'PNG', 14, 8, 40, 20);
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('REPORTE DE CAJA', 160, 18, { align: 'right' });
    doc.setDrawColor(41, 41, 41);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const getDiaSemana = (fecha: string | Date): string => {
      const date = new Date(fecha);
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return dias[date.getDay()];
    };
    doc.text(
      `Fecha: ${getDiaSemana(exportContext.caja.fecha_apertura)}, ${formatFechaLarga(exportContext.caja.fecha_apertura)}`,
      14,
      40
    );
    doc.text(`Cajero: ${exportContext.caja.cajero_nombre}`, 14, 46);
    doc.text(
      `Pestaña: ${exportContext.activeTab.charAt(0).toUpperCase() + exportContext.activeTab.slice(1)}`,
      120,
      40
    );
    doc.text(`Estado: ${exportContext.estadoInfo.label}`, 120, 46);

    let chartsBottomY = 54;
    if (exportContext.activeTab === 'resumen') {
      const chartSlots: Array<{ id: string; x: number }> = [
        { id: 'chart-pie', x: 14 },
        { id: 'chart-products', x: 108 }
      ];

      for (const slot of chartSlots) {
        const element = document.getElementById(slot.id);
        if (!element) continue;
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false
        });
        // Contain-fit dentro de una caja de 90x70 para no distorsionar el gráfico.
        const scale = Math.min(90 / canvas.width, 70 / canvas.height);
        const w = canvas.width * scale;
        const h = canvas.height * scale;
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', slot.x + (90 - w) / 2, 54, w, h);
        chartsBottomY = Math.max(chartsBottomY, 54 + h);
      }
    }

    const startY = exportContext.activeTab === 'resumen' ? chartsBottomY + 6 : 62;
    let mainTableStartY = startY;

    if (exportContext.activeTab === 'resumen') {
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text('Distribucion del dinero', 14, startY);
      const cardsBottomY = drawResumenDistribucionCards(doc, startY + 4, exportContext);
      mainTableStartY = cardsBottomY + 10;
    }

    const tableData = getPDFData(exportContext);
    const { headers, body } = tableData;

    autoTable(doc, {
      head: [headers],
      body,
      startY: mainTableStartY,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [41, 41, 41],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
      columnStyles: {
        0: { cellWidth: 12 },
        7: { halign: 'right' },
        8: { halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    if (exportContext.activeTab === 'ventas' && exportContext.filteredVentas.length > 0) {
      const lastTable = (doc as any).lastAutoTable;
      const finalY = lastTable?.finalY || 100;
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      const totalVentasSum = exportContext.filteredVentas.reduce(
        (sum, v) => sum + (v.total || 0),
        0
      );
      const totalPropinasSum = exportContext.filteredVentas.reduce(
        (sum, v) => sum + (v.propina || 0),
        0
      );
      doc.text(`Total Ventas: $${totalVentasSum.toLocaleString('es-CL')}`, 14, finalY + 12);
      doc.text(`Total Propinas: $${totalPropinasSum.toLocaleString('es-CL')}`, 14, finalY + 19);
    }

    if (exportContext.activeTab === 'servicios' && exportContext.filteredServicios.length > 0) {
      const lastTable = (doc as any).lastAutoTable;
      const finalY = lastTable?.finalY || 100;
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      const totalServiciosSum = exportContext.filteredServicios.reduce(
        (sum, s) => sum + (s.total || 0),
        0
      );
      doc.text(`Total Servicios: $${totalServiciosSum.toLocaleString('es-CL')}`, 14, finalY + 12);
    }

    if (exportContext.activeTab !== 'resumen') {
      const lastTable = (doc as any).lastAutoTable;
      const distributionStartY = Math.min((lastTable?.finalY || startY) + 18, 250);

      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text('Distribución del dinero', 14, distributionStartY);

      autoTable(doc, {
        head: [['Concepto', 'Monto']],
        body: exportContext.distribucionDinero.map(row => [row.concepto, row.monto]),
        startY: distributionStartY + 4,
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [41, 41, 41],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          1: { halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} - Las Muñecas de Ramón - Generado: ${formatFechaLarga(new Date().toISOString())}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    const formatFechaCorta = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    };

    doc.save(
      `caja-${exportContext.activeTab}-${formatFechaCorta(exportContext.caja.fecha_apertura)}.pdf`
    );
  } catch (error) {
    import('@/lib/utils/logger').then(({ default: logger }) => {
      logger.captureException(error, { context: 'cajaExportUtils:exportToPDF' });
    });
  }
};

const drawResumenDistribucionCards = (doc: any, startY: number, ctx: CajaExportContext) => {
  const cards = [
    {
      title: 'EFECTIVO NETO',
      value: formatCurrencyNoDecimals(ctx.efectivoNeto),
      bg: [30, 41, 59],
      border: [51, 65, 85],
      label: [226, 232, 240],
      valueColor: [255, 255, 255]
    },
    {
      title: 'TARJETA',
      value: formatCurrencyNoDecimals(ctx.tarjetaCaja),
      bg: [30, 41, 59],
      border: [51, 65, 85],
      label: [226, 232, 240],
      valueColor: [255, 255, 255]
    },
    {
      title: 'TRANSFERENCIA',
      value: formatCurrencyNoDecimals(ctx.transferenciaCaja),
      bg: [30, 41, 59],
      border: [51, 65, 85],
      label: [226, 232, 240],
      valueColor: [255, 255, 255]
    },
    {
      title: 'TOTAL MEDIOS DE PAGO',
      value: formatCurrencyNoDecimals(ctx.totalMetodosPago),
      bg: [36, 28, 68],
      border: [124, 58, 237],
      label: [167, 139, 250],
      valueColor: [255, 255, 255]
    }
  ];

  const cardWidth = 43;
  const cardHeight = 18;
  const gap = 3;
  const startX = 14;

  cards.forEach((card, index) => {
    const x = startX + index * (cardWidth + gap);
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 3, 3, 'FD');

    doc.setFontSize(7);
    doc.setTextColor(card.label[0], card.label[1], card.label[2]);
    doc.text(card.title, x + 3, startY + 5.5);

    doc.setFontSize(12);
    doc.setTextColor(card.valueColor[0], card.valueColor[1], card.valueColor[2]);
    doc.text(card.value, x + 3, startY + 12.8);
  });

  return startY + cardHeight;
};
