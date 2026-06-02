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
        <td class="text-center">${formatMetodoPagoDetalle(venta.metodo_pago, venta.pagos_mixtos)}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(venta.total)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">Abierta por</div>
        <div class="info-value">${ctx.caja.cajero_nombre || 'N/A'}</div>
        <div>${formatFechaLarga(ctx.caja.fecha_apertura)} • ${formatSoloHora(ctx.caja.fecha_apertura)}</div>
      </div>
      ${
        ctx.caja.fecha_cierre
          ? `
      <div class="info-card">
        <div class="info-label">Cerrada por</div>
        <div class="info-value">${ctx.caja.cajero_cierre_nombre || 'N/A'}</div>
        <div>${formatFechaLarga(ctx.caja.fecha_cierre)} • ${formatSoloHora(ctx.caja.fecha_cierre)}</div>
      </div>
      `
          : ''
      }
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Habitación</th>
          <th class="text-center">Cant.</th>
          <th class="text-right">Precio</th>
          <th class="text-right">Propina</th>
          <th class="text-center">Hora</th>
          <th class="text-center">Método</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr class="summary-row">
          <td colspan="3">Total (${ctx.filteredVentas.length} ventas)</td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.filteredVentas.reduce((sum, v) => sum + Number(v.sub_total || 0), 0))}</td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.filteredVentas.reduce((sum, v) => sum + Number(v.propina || 0), 0))}</td>
          <td colspan="2"></td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.filteredVentas.reduce((sum, v) => sum + Number(v.total || 0), 0))}</td>
        </tr>
      </tfoot>
    </table>
  `;
};

const generateServiciosTableHTML = (ctx: CajaExportContext) => {
  const rows = (Array.isArray(ctx.filteredServicios) ? ctx.filteredServicios : [])
    .map(
      servicio => `
      <tr>
        <td>${servicio.cliente_nombre || 'N/A'}</td>
        <td>${servicio.anfitrionas_nombres || 'Sin asignar'}</td>
        <td>${servicio.habitacion_nombre || 'N/A'}</td>
        <td class="text-right">${formatCurrencyNoDecimals(servicio.precio_servicio)}</td>
        <td class="text-right">${formatCurrencyNoDecimals(servicio.precio_habitacion)}</td>
        <td class="text-right">${formatCurrencyNoDecimals(servicio.iva)}</td>
        <td class="text-center">${formatFechaLarga(servicio.fecha_crea)}</td>
        <td class="text-center">${formatMetodoPagoDetalle(servicio.metodo_pago, servicio.pagos_mixtos)}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(servicio.total)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Anfitrionas</th>
          <th>Habitación</th>
          <th class="text-right">Precio Servicio</th>
          <th class="text-right">Precio Habitación</th>
          <th class="text-right">IVA</th>
          <th class="text-center">Fecha</th>
          <th class="text-center">Pago</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr class="summary-row">
          <td colspan="3">Total (${ctx.filteredServicios.length} servicios)</td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.filteredServicios.reduce((sum, s) => sum + Number(s.precio_servicio || 0), 0))}</td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.filteredServicios.reduce((sum, s) => sum + Number(s.precio_habitacion || 0), 0))}</td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.filteredServicios.reduce((sum, s) => sum + Number(s.iva || 0), 0))}</td>
          <td colspan="2"></td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.filteredServicios.reduce((sum, s) => sum + Number(s.total || 0), 0))}</td>
        </tr>
      </tfoot>
    </table>
  `;
};

const generateRetirosTableHTML = (ctx: CajaExportContext) => {
  const rows = (Array.isArray(ctx.retiros) ? ctx.retiros : [])
    .map(
      retiro => `
      <tr>
        <td>${formatSoloHora(retiro.fecha_crea)}</td>
        <td>${retiro.motivo}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(retiro.monto)}</td>
      </tr>
    `
    )
    .join('');

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
      </tbody>
      <tfoot>
        <tr class="summary-row">
          <td colspan="2">Total (${ctx.retiros.length} retiros)</td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0))}</td>
        </tr>
      </tfoot>
    </table>
  `;
};

const generateResumenHTML = (ctx: CajaExportContext) => {
  return `
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">Abierta por</div>
        <div class="info-value">${ctx.caja.cajero_nombre || 'N/A'}</div>
        <div>${formatFechaLarga(ctx.caja.fecha_apertura)} • ${formatSoloHora(ctx.caja.fecha_apertura)}</div>
      </div>
      ${
        ctx.caja.fecha_cierre
          ? `
      <div class="info-card">
        <div class="info-label">Cerrada por</div>
        <div class="info-value">${ctx.caja.cajero_cierre_nombre || 'N/A'}</div>
        <div>${formatFechaLarga(ctx.caja.fecha_cierre)} • ${formatSoloHora(ctx.caja.fecha_cierre)}</div>
      </div>
      `
          : ''
      }
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="text-right">Monto</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Monto Apertura</td><td class="text-right">${formatCurrencyNoDecimals(ctx.caja.monto_apertura)}</td></tr>
        <tr><td>Ventas Tragos</td><td class="text-right">${formatCurrencyNoDecimals(ctx.ventasTragosChicas?.total_venta || 0)}</td></tr>
        <tr><td>Ventas Champaña</td><td class="text-right">${formatCurrencyNoDecimals(ctx.ventasChampagne?.total_venta || 0)}</td></tr>
        <tr><td>Ventas Barras</td><td class="text-right">${formatCurrencyNoDecimals(ctx.ventasBarras?.total_venta || 0)}</td></tr>
        <tr><td>Servicios</td><td class="text-right">${formatCurrencyNoDecimals(ctx.caja.servicios || 0)}</td></tr>
        <tr><td>Prepago Cargado</td><td class="text-right">${formatCurrencyNoDecimals(ctx.prepagoCargado)}</td></tr>
        <tr><td>Prepago Consumido</td><td class="text-right">${formatCurrencyNoDecimals(ctx.prepagoConsumido)}</td></tr>
        <tr><td>Ingreso Real a Caja</td><td class="text-right">${formatCurrencyNoDecimals(ctx.ingresosReales)}</td></tr>
        <tr><td>Efectivo neto</td><td class="text-right">${formatCurrencyNoDecimals(ctx.efectivoNeto)}</td></tr>
        <tr><td>Tarjeta</td><td class="text-right">${formatCurrencyNoDecimals(ctx.tarjetaCaja)}</td></tr>
        <tr><td>Transferencia</td><td class="text-right">${formatCurrencyNoDecimals(ctx.transferenciaCaja)}</td></tr>
        <tr><td>Subtotal antes de egresos</td><td class="text-right">${formatCurrencyNoDecimals(ctx.totalMetodosPago)}</td></tr>
        <tr><td>Devoluciones</td><td class="text-right" style="color: red;">-${formatCurrencyNoDecimals(ctx.caja.devoluciones || 0)}</td></tr>
        <tr><td>Anticipos</td><td class="text-right" style="color: red;">-${formatCurrencyNoDecimals(ctx.caja.anticipo || 0)}</td></tr>
        <tr><td>Retiros</td><td class="text-right" style="color: red;">-${formatCurrencyNoDecimals(ctx.retiros.reduce((sum, r) => sum + r.monto, 0))}</td></tr>
      </tbody>
      <tfoot>
        <tr class="summary-row" style="background-color: #e8f5e8; font-size: 14px;">
          <td>Total real</td>
          <td class="text-right">${formatCurrencyNoDecimals(ctx.totalReal)}</td>
        </tr>
      </tfoot>
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
        headers: ['#', 'Cliente', 'Habitación', 'Cantidad', 'SubTotal', 'Propina', 'Hora', 'Pago / Distribucion', 'Total'],
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
        headers: ['#', 'Cliente', 'Anfitrionas', 'Habitación', 'Total Habitación', 'IVA', 'Fecha', 'Pago / Distribución', 'Total'],
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
        body: ctx.retiros.map((r, i) => [ (i + 1).toString(), formatSoloHora(r.fecha_crea), r.motivo, r.monto ])
      };
    default:
      return {
        headers: ['#', 'Concepto', 'Monto'],
        body: [
          ['1', 'Monto Apertura', ctx.caja.monto_apertura],
          ['2', 'Ventas Tragos', ctx.ventasTragosChicas?.total_venta || 0],
          ['3', 'Ventas Champaña', ctx.ventasChampagne?.total_venta || 0],
          ['4', 'Ventas Barras', ctx.ventasBarras?.total_venta || 0],
          ['5', 'Servicios', ctx.caja.servicios || 0],
          ['6', 'Prepago Cargado', ctx.prepagoCargado],
          ['7', 'Prepago Consumido', ctx.prepagoConsumido],
          ['8', 'Ingreso Real a Caja', ctx.ingresosReales],
          ['9', 'Efectivo neto', ctx.efectivoNeto],
          ['10', 'Tarjeta', ctx.tarjetaCaja],
          ['11', 'Transferencia', ctx.transferenciaCaja],
          ['12', 'Subtotal antes de egresos', ctx.totalMetodosPago],
          ['13', 'Devoluciones', -(ctx.caja.devoluciones || 0)],
          ['14', 'Anticipos', -(ctx.caja.anticipo || 0)],
          ['15', 'Retiros', -ctx.retiros.reduce((sum, r) => sum + r.monto, 0)],
          ['16', 'Total real', ctx.totalReal]
        ]
      };
  }
};
