import { buildExportFilename } from '@/lib/utils/calendarUtils';
import { horaDeNegocio } from '@/lib/business/timezoneService';

/** Detalle de una colación del turno, tal como lo entrega la API de colaciones. */
export interface ColacionDetalle {
  trabajador: string;
  nick?: string | null;
  nombre_bebida?: string | null;
  ml_bebida: number;
  acompanamiento?: 'gaseosa' | 'soda' | null;
  acompanamiento_nombre?: string | null;
  registrado_por_nombre: string;
  fecha_crea: string;
}

/** Fila plana del archivo: una colación con su botella y sus ml. */
export interface FilaColacion {
  index: number;
  trabajador: string;
  nick: string;
  bebida: string;
  ml: number;
  acompanamiento: string;
  registrado: string;
  hora: string;
}

/**
 * Detalle visible del turno en filas exportables. Mismas reglas que la tabla:
 * la bebida sin nombre se muestra como «Corto» y el acompañamiento cae al tipo
 * configurado (gaseosa/soda) o a «—» cuando no lleva.
 */
export function filasColaciones(records: ColacionDetalle[]): FilaColacion[] {
  return records.map((row, index) => ({
    index: index + 1,
    trabajador: row.trabajador,
    nick: row.nick?.trim() || '—',
    bebida: row.nombre_bebida?.trim() || 'Corto',
    ml: Number(row.ml_bebida) || 0,
    acompanamiento: row.acompanamiento_nombre?.trim() || row.acompanamiento || '—',
    registrado: row.registrado_por_nombre,
    hora: horaDeNegocio(row.fecha_crea)
  }));
}

/**
 * Descarga el detalle de colaciones del turno como Excel: una fila por
 * colación (trabajador, botella, ml, acompañamiento, quién registró y hora)
 * más una fila final con el total de ml servidos.
 */
export async function exportarColacionesExcel(records: ColacionDetalle[]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const filas = filasColaciones(records);
  const totalMl = filas.reduce((total, fila) => total + fila.ml, 0);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Colaciones del turno');
  worksheet.columns = [
    { header: '#', key: 'index', width: 6 },
    { header: 'Trabajador', key: 'trabajador', width: 28 },
    { header: 'Nick', key: 'nick', width: 14 },
    { header: 'Bebida (botella)', key: 'bebida', width: 30 },
    { header: 'Ml', key: 'ml', width: 10 },
    { header: 'Acompañamiento (botella)', key: 'acompanamiento', width: 30 },
    { header: 'Registró', key: 'registrado', width: 26 },
    { header: 'Hora', key: 'hora', width: 12 }
  ];
  filas.forEach(fila => {
    worksheet.addRow(fila);
  });
  const totalRow = worksheet.addRow({ trabajador: 'Total', ml: totalMl });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildExportFilename('colaciones', 'xlsx');
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
