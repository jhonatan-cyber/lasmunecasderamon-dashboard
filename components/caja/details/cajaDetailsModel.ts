import type { CajaExportContext } from '@/components/caja/cajaExportUtils';
import {
  efectivoBaseCaja,
  efectivoNetoCaja,
  egresosPendientesCaja,
  saldosClientesDe,
  totalCaja
} from '@/lib/business/cajaEfectivo';

/**
 * Números derivados de la caja que consumen la barra de estadísticas, los
 * charts, los detalles financieros y el contexto de exportación (print/PDF).
 * Antes este bloque vivía inline en el render de `CajaDetails`.
 */
export interface CajaDetailsNumbers {
  totalPropinas: number;
  totalVentas: number;
  totalCargoTarjeta: number;
  totalIngresos: number;
  ingresosReales: number;
  efectivoCaja: number;
  efectivoTotal: number;
  efectivoNeto: number;
  tarjetaCaja: number;
  transferenciaCaja: number;
  prepagoCargado: number;
  prepagoConsumido: number;
  prepagoPendienteClientes: number;
  /** Saldos de clientes que se descontaron del efectivo en este cierre. */
  saldoClientesDescontado: number;
  /** Monto con que quedó cerrada la caja (0 mientras sigue abierta). */
  montoCierre: number;
  totalEgresos: number;
  /** Lo que falta descontar del cajón (devoluciones + saldos): ya no incluye retiros ni
   * anticipos, que descuentan `cajas.efectivo` al registrarse. */
  egresosCaja: number;
  totalMetodosPago: number;
  totalReal: number;
  distribucionDinero: Array<{ concepto: string; monto: number }>;
}

/** Cómo se muestran las tres fuentes de ventas (charts, propinas, totales). */
export interface VentasFuentes {
  ventasTragosChicas: any;
  ventasChampagne: any;
  ventasBarras: any;
}

const num = (value: unknown): number => Number(value || 0);

/** Suma una clave numérica sobre las tres fuentes de ventas. */
const sumarFuente = (
  fuentes: VentasFuentes,
  key: 'propinas' | 'total_venta' | 'cargo_tarjeta'
): number =>
  num(fuentes.ventasTragosChicas?.[key]) +
  num(fuentes.ventasChampagne?.[key]) +
  num(fuentes.ventasBarras?.[key]);

/** Monto total de los retiros de la caja. */
export const retirosTotal = (retiros: any[]): number =>
  (retiros || []).reduce((sum, r) => sum + num(r.monto), 0);

export function buildCajaDetailsNumbers(
  caja: any,
  cajaActual: any,
  fuentes: VentasFuentes,
  retiros: any[]
): CajaDetailsNumbers {
  const totalPropinas = sumarFuente(fuentes, 'propinas');
  const totalVentas = sumarFuente(fuentes, 'total_venta');
  const totalCargoTarjeta = sumarFuente(fuentes, 'cargo_tarjeta');
  const totalIngresos = totalVentas + totalCargoTarjeta + num(caja?.servicios);
  const ingresosReales = num(caja?.efectivo) + num(caja?.tarjeta) + num(caja?.transferencia);
  const efectivoCaja = num(caja?.efectivo);
  const efectivoTotal = efectivoBaseCaja(caja);
  const tarjetaCaja = num(caja?.tarjeta);
  const transferenciaCaja = num(caja?.transferencia);
  const prepagoCargado = num(cajaActual?.prepago_cargado);
  const prepagoConsumido = num(cajaActual?.prepago_consumido);
  const prepagoPendienteClientes = num(cajaActual?.prepago_pendiente_clientes);
  // **Sin doble descuento**: el cálculo del cajón vive en `lib/business/cajaEfectivo` y
  // lo comparten la tarjeta, el detalle, el diálogo de retiro y el monto de cierre.
  const saldoClientesDescontado = saldosClientesDe(caja);
  const montoCierre = num(caja?.monto_cierre);
  const egresosCajaValor = egresosPendientesCaja(caja);
  // «Egresos del turno» es otra vista: qué salió del negocio en el día (devoluciones,
  // anticipos, retiros y saldos). Va en el resumen de ingresos/egresos, no en el cajón.
  const totalEgresos =
    num(caja?.devoluciones) + num(caja?.anticipo) + retirosTotal(retiros) + saldoClientesDescontado;
  const efectivoNeto = efectivoNetoCaja(caja);
  const totalMetodosPago = efectivoTotal + tarjetaCaja + transferenciaCaja;
  const totalReal = totalCaja(caja);

  return {
    totalPropinas,
    totalVentas,
    totalCargoTarjeta,
    totalIngresos,
    ingresosReales,
    efectivoCaja,
    efectivoTotal,
    efectivoNeto,
    tarjetaCaja,
    transferenciaCaja,
    prepagoCargado,
    prepagoConsumido,
    prepagoPendienteClientes,
    saldoClientesDescontado,
    montoCierre,
    totalEgresos,
    egresosCaja: egresosCajaValor,
    totalMetodosPago,
    totalReal,
    distribucionDinero: [
      { concepto: 'Efectivo neto', monto: efectivoNeto },
      { concepto: 'Tarjeta', monto: tarjetaCaja },
      { concepto: 'Transferencia', monto: transferenciaCaja },
      { concepto: 'Subtotal antes de egresos', monto: totalMetodosPago }
    ]
  };
}

/** Chip del estado de la caja en el título. */
export const getEstadoInfo = (estado: unknown): { label: string; color: string } =>
  estado === 1
    ? { label: 'En curso', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
    : { label: 'Cerrada', color: 'bg-slate-500/10 text-slate-600 border-slate-200' };

/** Contexto que comparten Imprimir y Exportar PDF (shape de `CajaExportContext`). */
export function buildCajaExportContext(args: {
  caja: any;
  activeTab: string;
  estadoInfo: { label: string };
  filteredVentas: any[];
  filteredServicios: any[];
  retiros: any[];
  fuentes: VentasFuentes;
  numeros: CajaDetailsNumbers;
}): CajaExportContext {
  const {
    caja,
    activeTab,
    estadoInfo,
    filteredVentas,
    filteredServicios,
    retiros,
    fuentes,
    numeros
  } = args;
  return {
    caja,
    activeTab,
    estadoInfo,
    filteredVentas,
    filteredServicios,
    retiros,
    ventasTragosChicas: fuentes.ventasTragosChicas,
    ventasChampagne: fuentes.ventasChampagne,
    ventasBarras: fuentes.ventasBarras,
    totalCargoTarjeta: numeros.totalCargoTarjeta,
    prepagoCargado: numeros.prepagoCargado,
    prepagoConsumido: numeros.prepagoConsumido,
    ingresosReales: numeros.ingresosReales,
    efectivoNeto: numeros.efectivoNeto,
    tarjetaCaja: numeros.tarjetaCaja,
    transferenciaCaja: numeros.transferenciaCaja,
    totalMetodosPago: numeros.totalMetodosPago,
    totalReal: numeros.totalReal,
    distribucionDinero: numeros.distribucionDinero
  };
}

/** Imprime el HTML generado por `generatePrintContent` vía Blob URL (CSP-safe). */
export function printHtml(printContent: string): void {
  const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
      URL.revokeObjectURL(url);
    };
    // Fallback if onload doesn't fire (e.g., already loaded)
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/** Día de la semana en español para el título del modal. */
export const getDiaSemana = (fecha: string | Date): string => {
  const date = new Date(fecha);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[date.getDay()];
};
