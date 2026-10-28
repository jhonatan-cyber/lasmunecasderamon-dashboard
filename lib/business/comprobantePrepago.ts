/**
 * Comprobante de prepago — documento imprimible que se emite al mover el saldo
 * de un cliente: consumo (servicios, ventas) o carga (reservas de quincho).
 *
 * Es lógica pura para poder probar el documento sin ventana de impresión: el
 * módulo de UI solo abre la impresora con el HTML que se genera acá.
 */
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { escaparHtml } from '@/lib/utils/htmlEscape';

/** Sentido del movimiento: descuenta saldo o lo acredita. */
export type MovimientoPrepago = 'consumo' | 'carga';

export interface LineaComprobantePrepago {
  concepto: string;
  detalle?: string | null;
  monto: number;
}

export interface DatosComprobantePrepago {
  movimiento: MovimientoPrepago;
  /** Título de la operación: «Servicio de habitación», «Reserva de quincho». */
  titulo: string;
  clienteNombre: string;
  clienteRun?: string | null;
  /** Fecha ya formateada para imprimir. */
  fecha: string;
  codigo?: string | null;
  lineas: LineaComprobantePrepago[];
  /** Total de la operación, aunque este cliente cubra solo una parte. */
  total: number;
  /** Parte del total movida con el prepago de este cliente. */
  montoPrepago: number;
  saldoAnterior: number;
  saldoResultante: number;
  atendidoPor?: string | null;
  nota?: string | null;
}

const ETIQUETAS: Record<
  MovimientoPrepago,
  { documento: string; accion: string; saldoFinal: string }
> = {
  consumo: {
    documento: 'Comprobante de consumo',
    accion: 'Consumido con prepago',
    saldoFinal: 'Saldo después del consumo'
  },
  carga: {
    documento: 'Comprobante de prepago',
    accion: 'Acreditado al prepago',
    saldoFinal: 'Saldo después de la carga'
  }
};

/** Cliente con su saldo al momento de emitir el comprobante. */
export interface ClientePrepagoComprobante {
  id: string;
  nombre: string;
  run?: string | null;
  saldo: number;
}

/** Destino del prepago: a qué cliente se le descuenta y cuánto. */
export interface DestinoPrepagoComprobante {
  cliente_id: string | number;
  monto: number;
}

/**
 * Un comprobante por cliente que aportó saldo, con su saldo antes, lo que se le
 * descontó y lo que le queda. Los destinos sin monto no emiten ticket.
 */
export function construirComprobantesDeConsumo(args: {
  destinos: DestinoPrepagoComprobante[];
  clientes: ClientePrepagoComprobante[];
  base: Omit<
    DatosComprobantePrepago,
    'clienteNombre' | 'clienteRun' | 'montoPrepago' | 'saldoAnterior' | 'saldoResultante'
  >;
}): DatosComprobantePrepago[] {
  return args.destinos
    .filter(destino => Math.round(Number(destino.monto) || 0) > 0)
    .map(destino => {
      const cliente = args.clientes.find(c => String(c.id) === String(destino.cliente_id));
      const saldoAnterior = Math.round(Number(cliente?.saldo ?? 0));
      const montoPrepago = Math.round(Number(destino.monto));

      return {
        ...args.base,
        clienteNombre: cliente?.nombre?.trim() || 'Cliente',
        clienteRun: cliente?.run ?? null,
        montoPrepago,
        saldoAnterior,
        saldoResultante: calcularSaldoResultante(args.base.movimiento, saldoAnterior, montoPrepago)
      };
    });
}

/** Saldo que queda tras el movimiento, sin permitir consumos que crucen el cero. */
export function calcularSaldoResultante(
  movimiento: MovimientoPrepago,
  saldoAnterior: number,
  monto: number
): number {
  const saldo = Math.round(Number(saldoAnterior) || 0);
  const movimientoMonto = Math.round(Number(monto) || 0);
  return movimiento === 'carga' ? saldo + movimientoMonto : Math.max(0, saldo - movimientoMonto);
}

function fila(etiqueta: string, valor: string, clase = ''): string {
  const claseValor = clase ? ` ${clase}` : '';
  return `<div class="row"><span class="label">${escaparHtml(etiqueta)}</span><span class="value${claseValor}">${escaparHtml(valor)}</span></div>`;
}

function lineasHTML(lineas: LineaComprobantePrepago[]): string {
  if (lineas.length === 0) return '';
  return lineas
    .map(
      linea => `
        <div class="row item">
          <span class="label">
            ${escaparHtml(linea.concepto)}
            ${linea.detalle ? `<br /><span class="sublabel">${escaparHtml(linea.detalle)}</span>` : ''}
          </span>
          <span class="value">${formatCurrencyCLP(linea.monto)}</span>
        </div>`
    )
    .join('');
}

/** Documento de un cliente. `logoUrl` puede ser absoluto o data URI. */
export function generarComprobantePrepagoHTML(
  datos: DatosComprobantePrepago,
  logoUrl: string
): string {
  const etiquetas = ETIQUETAS[datos.movimiento];
  const otroMedio = Math.round(datos.total) - Math.round(datos.montoPrepago);

  return `
    <div class="ticket">
      <div class="header">
        <img src="${escaparHtml(logoUrl)}" alt="Las Muñecas de Ramón" class="logo" />
        <p class="brand">Las Muñecas de Ramón</p>
        <p class="doc">${escaparHtml(etiquetas.documento)}</p>
        <p class="tipo">${escaparHtml(datos.titulo)}</p>
      </div>

      <div class="section">
        ${fila('Cliente', datos.clienteNombre)}
        ${datos.clienteRun ? fila('RUN', datos.clienteRun) : ''}
        ${fila('Fecha', datos.fecha)}
        ${datos.codigo ? fila('Código', datos.codigo) : ''}
        ${datos.atendidoPor ? fila('Atendido por', datos.atendidoPor) : ''}
      </div>

      <div class="section">
        <p class="section-title">Detalle</p>
        ${lineasHTML(datos.lineas)}
      </div>

      <div class="total"><span>Total ${escaparHtml(datos.titulo.toLowerCase())}</span><span>${formatCurrencyCLP(datos.total)}</span></div>

      <div class="prepago-box">
        ${fila('Saldo antes', formatCurrencyCLP(datos.saldoAnterior))}
        ${fila(etiquetas.accion, formatCurrencyCLP(datos.montoPrepago), 'movimiento')}
        ${otroMedio > 0 ? fila('Cubierto con otro medio', formatCurrencyCLP(otroMedio)) : ''}
        <div class="row saldo-final">
          <span class="label">${escaparHtml(etiquetas.saldoFinal)}</span>
          <span class="value">${formatCurrencyCLP(datos.saldoResultante)}</span>
        </div>
      </div>

      <p class="footer">
        ${datos.nota ? `${escaparHtml(datos.nota)}<br />` : ''}
        Documento generado automáticamente al mover el saldo prepago.
      </p>
    </div>`;
}

const ESTILOS = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 12px; background: #f8fafc; color: #111827; font-family: Arial, Helvetica, sans-serif; }
  .ticket { max-width: 420px; margin: 0 auto 18px; padding: 22px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; page-break-after: always; }
  .ticket:last-child { page-break-after: auto; margin-bottom: 0; }
  .header { text-align: center; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; }
  .logo { width: 78px; height: auto; margin: 0 auto 10px; display: block; }
  .brand { margin: 0; font-size: 19px; font-weight: 800; }
  .doc { margin: 6px 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; color: #9a3412; }
  .tipo { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
  .section { margin-top: 16px; }
  .section-title { margin: 0 0 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; color: #6b7280; }
  .row { display: flex; justify-content: space-between; gap: 14px; margin: 7px 0; font-size: 13px; }
  .row.item { align-items: flex-start; }
  .label { color: #4b5563; }
  .sublabel { color: #9ca3af; font-size: 11px; }
  .value { font-weight: 700; text-align: right; }
  .total { display: flex; justify-content: space-between; border-top: 1px dashed #d1d5db; margin-top: 12px; padding-top: 12px; font-size: 15px; font-weight: 800; }
  .prepago-box { margin-top: 14px; padding: 14px; border: 1px solid #fdba74; border-radius: 16px; background: linear-gradient(135deg, #fff7ed, #ffffff); }
  .prepago-box .movimiento { color: #c2410c; }
  .prepago-box .saldo-final { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #fdba74; font-size: 16px; }
  .prepago-box .saldo-final .value { font-size: 18px; font-weight: 800; color: #c2410c; }
  .footer { margin: 18px 0 0; text-align: center; font-size: 11px; line-height: 1.6; color: #64748b; }
  @media print {
    @page { size: 80mm auto; margin: 4mm; }
    body { background: #ffffff; padding: 0; }
    .ticket { max-width: none; margin: 0; padding: 0; border: 0; border-radius: 0; }
  }
`;

/** Los comprobantes de un cobro: una página por cliente. */
export function generarComprobantesPrepagoHTML(
  comprobantes: DatosComprobantePrepago[],
  logoUrl: string
): string {
  return `<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Comprobante de prepago</title>
        <style>${ESTILOS}</style>
      </head>
      <body>
        ${comprobantes
          .map(comprobante => generarComprobantePrepagoHTML(comprobante, logoUrl))
          .join('')}
      </body>
    </html>`;
}
