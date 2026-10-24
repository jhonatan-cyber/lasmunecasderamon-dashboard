'use client';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';

import { Button } from '@/components/ui/button';
import { FileSpreadsheet as FileXls, FileText as FilePdf } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { buildExportFilename, formatDateLabel } from '@/lib/utils/calendarUtils';
import logger from '@/lib/utils/logger';

export interface ExportColumn<TRow> {
  /** Clave de la columna en el archivo Excel. */
  key: string;
  /** Encabezado en Excel, PDF y tabla de impresión. */
  header: string;
  /** Ancho de la columna en Excel. */
  width: number;
  /** Valor de la celda. */
  value: (row: TRow, index: number) => string | number;
  /** Alineación de la columna (por defecto a la izquierda). */
  align?: 'center' | 'left';
  /** Incluir la columna en el PDF (por defecto sí). */
  inPdf?: boolean;
  /** Incluir la columna en la tabla oculta de impresión (por defecto sí). */
  inTable?: boolean;
  /** Renderizado propio en la tabla de impresión (p. ej. badge de estado). */
  renderCell?: (row: TRow, index: number) => ReactNode;
}

interface ExportButtonsProps<TRow extends { id: string | number }> {
  /** Filas a exportar. */
  items: TRow[];
  /** Nombre base de los archivos ('clientes', 'usuarios', ...). */
  slug: string;
  /** Nombre de la hoja dentro del libro Excel. */
  worksheetName: string;
  /** Título del PDF y de la tabla oculta de impresión. */
  title: string;
  /** Definición de columnas compartida entre Excel, PDF e impresión. */
  columns: ExportColumn<TRow>[];
  /** Identificador de entidad para el logger ('clients', 'users', ...). */
  logContext: string;
  /** Tamaño de fuente de la tabla del PDF (10 por defecto). */
  pdfFontSize?: number;
  containerClassName?: string;
  buttonClassName?: string;
}

export function EntityExportButtons<TRow extends { id: string | number }>({
  items,
  slug,
  worksheetName,
  title,
  columns,
  logContext,
  pdfFontSize = 10,
  containerClassName = 'flex flex-col sm:flex-row gap-2 w-full sm:w-auto',
  buttonClassName = ''
}: ExportButtonsProps<TRow>) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const ExcelJS = (await import('exceljs')).default;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(worksheetName);

      worksheet.columns = columns.map(column => ({
        header: column.header,
        key: column.key,
        width: column.width
      }));

      items.forEach((row, index) => {
        worksheet.addRow(
          Object.fromEntries(columns.map(column => [column.key, column.value(row, index)]))
        );
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildExportFilename(slug, 'xlsx');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Excel exportado correctamente');
    } catch (error) {
      logger.captureException(error, { context: `ExportButtons:${logContext}:exportToExcel` });
      toast.error('Error al exportar Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      const pdfColumns = columns.filter(column => column.inPdf !== false);
      const headers = [pdfColumns.map(column => column.header)];
      const data = items.map((row, index) =>
        pdfColumns.map(column => String(column.value(row, index)))
      );

      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 30,
        styles: {
          fontSize: pdfFontSize,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [22, 22, 22],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 30 }
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Generado el: ${formatDateLabel(new Date())}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      doc.save(buildExportFilename(slug, 'pdf'));
      toast.success('PDF exportado correctamente');
    } catch (error) {
      logger.captureException(error, { context: `ExportButtons:${logContext}:exportToPDF` });
      toast.error('Error al exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const tableColumns = columns.filter(column => column.inTable !== false);

  return (
    <div className={containerClassName}>
      <Button
        variant='outline'
        size='sm'
        onClick={exportToPDF}
        disabled={isExporting}
        className={`${buttonClassName} gap-2 rounded-full hover:text-red-600 hover:scale-105 transition-all duration-200`}
      >
        <FilePdf className='h-3 w-3 sm:h-4 sm:w-4 text-red-500' />
        {isExporting ? 'Exportando...' : 'PDF'}
      </Button>
      <Button
        variant='outline'
        size='sm'
        onClick={exportToExcel}
        disabled={isExporting}
        className={`${buttonClassName} gap-2 rounded-full hover:text-green-600 hover:scale-105 transition-all duration-200`}
      >
        <FileXls className='h-3 w-3 sm:h-4 sm:w-4 text-green-500' />
        {isExporting ? 'Exportando...' : 'Excel'}
      </Button>

      {}
      <div style={{ display: 'none' }}>
        <div className='p-6'>
          <h1 className='text-3xl font-bold mb-6'>{title}</h1>
          <p className='text-base text-gray-600 mb-6'>Generado el {formatDateLabel(new Date())}</p>
          <Table className='w-full border-collapse'>
            <TableHeader>
              <TableRow>
                {tableColumns.map(column => (
                  <TableHead
                    key={column.key}
                    className={
                      column.align === 'center'
                        ? 'text-center border w-16 text-lg'
                        : 'text-left border text-lg'
                    }
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, index) => (
                <TableRow key={row.id} className='border-b'>
                  {tableColumns.map(column => (
                    <TableCell
                      key={column.key}
                      className={column.align === 'center' ? 'text-center border' : 'border'}
                    >
                      {column.renderCell ? column.renderCell(row, index) : column.value(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
