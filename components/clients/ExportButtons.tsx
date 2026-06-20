'use client';

import { Button } from '@/components/ui/button';
import { FileSpreadsheet as FileXls, FileText as FilePdf } from 'lucide-react';
import { useState } from 'react';
import { Client } from '@/types/client';
import { toast } from 'sonner';
import { buildExportFilename, formatDateLabel } from '@/lib/utils/calendarUtils';
import logger from '@/lib/utils/logger';

interface ExportButtonsProps {
  clients: Client[];
}

export function ExportButtons({ clients }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const ExcelJS = (await import('exceljs')).default;

      const data = clients.map((client, index) => ({
        '#': index + 1,
        RUN: client.run || 'Sin RUN',
        Nombre: client.name || '',
        Apellido: client.lastName || '',
        Teléfono: client.phone || 'Sin teléfono',
        Estado: client.status === 1 ? 'Activo' : 'Inactivo',
        'Fecha Creación': client.created_at ? formatDateLabel(client.created_at) : 'Sin fecha',
        'Última Modificación': client.updated_at
          ? formatDateLabel(client.updated_at)
          : 'Sin modificar'
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Clientes');

      worksheet.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'RUN', key: 'run', width: 20 },
        { header: 'Nombre', key: 'name', width: 20 },
        { header: 'Apellido', key: 'lastName', width: 20 },
        { header: 'Teléfono', key: 'phone', width: 18 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Fecha Creación', key: 'created_at', width: 16 },
        { header: 'Última Modificación', key: 'updated_at', width: 16 }
      ];

      data.forEach(row => {
        worksheet.addRow({
          index: row['#'],
          run: row.RUN,
          name: row.Nombre,
          lastName: row.Apellido,
          phone: row['Teléfono'],
          status: row.Estado,
          created_at: row['Fecha Creación'],
          updated_at: row['Última Modificación']
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildExportFilename('clientes', 'xlsx');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Excel exportado correctamente');
    } catch (error) {
      logger.captureException(error, { context: 'ExportButtons:exportToExcel' });
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
      const title = 'Listado de Clientes';
      const headers = [['#', 'RUN', 'Nombre', 'Apellido', 'Teléfono', 'Estado']];

      const data = clients.map((client, index) => [
        (index + 1).toString(),
        client.run || 'Sin RUN',
        client.name || '',
        client.lastName || '',
        client.phone || 'Sin teléfono',
        client.status === 1 ? 'Activo' : 'Inactivo'
      ]);

      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 30,
        styles: {
          fontSize: 10,
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

      doc.save(buildExportFilename('clientes', 'pdf'));
      toast.success('PDF exportado correctamente');
    } catch (error) {
      logger.captureException(error, { context: 'ExportButtons:exportToPDF' });
      toast.error('Error al exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
      <Button
        variant='outline'
        size='sm'
        onClick={exportToPDF}
        disabled={isExporting}
        className='gap-2 rounded-full hover:text-red-600 hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
      >
        <FilePdf className='h-3 w-3 sm:h-4 sm:w-4 text-red-500' />
        {isExporting ? 'Exportando...' : 'PDF'}
      </Button>
      <Button
        variant='outline'
        size='sm'
        onClick={exportToExcel}
        disabled={isExporting}
        className='gap-2 rounded-full hover:text-green-600 hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
      >
        <FileXls className='h-3 w-3 sm:h-4 sm:w-4 text-green-500' />
        {isExporting ? 'Exportando...' : 'Excel'}
      </Button>

      {}
      <div style={{ display: 'none' }}>
        <div className='p-6'>
          <h1 className='text-3xl font-bold mb-6'>Listado de Clientes</h1>
          <p className='text-base text-gray-600 mb-6'>Generado el {formatDateLabel(new Date())}</p>
          <table className='w-full text-base border-collapse'>
            <thead>
              <tr className='bg-gray-100'>
                <th className='py-3 px-4 text-center border w-16 text-lg'>#</th>
                <th className='py-3 px-4 text-left border text-lg'>RUN</th>
                <th className='py-3 px-4 text-left border text-lg'>Nombre</th>
                <th className='py-3 px-4 text-left border text-lg'>Apellido</th>
                <th className='py-3 px-4 text-left border text-lg'>Teléfono</th>
                <th className='py-3 px-4 text-left border text-lg'>Estado</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={client.id} className='border-b hover:bg-gray-50'>
                  <td className='py-3 px-4 text-center border'>{index + 1}</td>
                  <td className='py-3 px-4 border'>{client.run || 'Sin RUN'}</td>
                  <td className='py-3 px-4 border'>{client.name || ''}</td>
                  <td className='py-3 px-4 border'>{client.lastName || ''}</td>
                  <td className='py-3 px-4 border'>{client.phone || 'Sin teléfono'}</td>
                  <td className='py-3 px-4 border'>
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        client.status === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {client.status === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
