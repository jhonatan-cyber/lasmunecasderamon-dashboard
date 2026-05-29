'use client';

import { Button } from '@/components/ui/button';
import { FileText as FilePdf, FileSpreadsheet as FileXls } from 'lucide-react';
import { useState } from 'react';
import { User } from '@/types/user';
import { toast } from 'sonner';
import { buildExportFilename, formatDateLabel } from '@/lib/utils/calendarUtils';
import logger from '@/lib/utils/logger';

interface ExportButtonsProps {
  users: User[];
}

export function ExportButtons({ users }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Lazy load ExcelJS solo cuando se necesita
      const ExcelJS = (await import('exceljs')).default;

      const data = users.map((user, index) => ({
        '#': index + 1,
        RUT: user.run || 'Sin RUT',
        Nombre: user.name || '',
        Apellido: user.lastName || '',
        Email: user.email || 'Sin email',
        Teléfono: user.phone || 'Sin teléfono',
        Rol: user.role || 'Sin rol',
        Estado: user.status === 1 ? 'Activo' : 'Inactivo',
        'Estado Civil': user.maritalStatus || 'Sin especificar',
        AFP: user.afp || 'Sin especificar',
        Sueldo: user.salary
          ? `${new Intl.NumberFormat('es-CL').format(user.salary)}`
          : 'Sin sueldo',
        'Fecha Creación': user.created_at ? formatDateLabel(user.created_at) : 'Sin fecha',
        'Última Modificación': user.updated_at ? formatDateLabel(user.updated_at) : 'Sin modificar'
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Usuarios');

      // Definir columnas
      worksheet.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'RUT', key: 'run', width: 20 },
        { header: 'Nombre', key: 'name', width: 20 },
        { header: 'Apellido', key: 'lastName', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Teléfono', key: 'phone', width: 18 },
        { header: 'Rol', key: 'role', width: 16 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Estado Civil', key: 'maritalStatus', width: 16 },
        { header: 'AFP', key: 'afp', width: 16 },
        { header: 'Sueldo', key: 'salary', width: 16 },
        { header: 'Fecha Creación', key: 'created_at', width: 16 },
        { header: 'Última Modificación', key: 'updated_at', width: 16 }
      ];

      data.forEach(row => {
        worksheet.addRow({
          index: row['#'],
          run: row.RUT,
          name: row.Nombre,
          lastName: row.Apellido,
          email: row.Email,
          phone: row['Teléfono'],
          role: row.Rol,
          status: row.Estado,
          maritalStatus: row['Estado Civil'],
          afp: row.AFP,
          salary: row.Sueldo,
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
      a.download = buildExportFilename('usuarios', 'xlsx');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Excel exportado correctamente');
    } catch (error) {
      logger.captureException(error, { context: 'ExportButtons:exportExcel' });
      toast.error('Error al exportar Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Lazy load jsPDF y autoTable solo cuando se necesita
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      const title = 'Listado de Usuarios';
      const headers = [['#', 'RUT', 'Nombre', 'Apellido', 'Email', 'Teléfono', 'Rol', 'Estado']];

      const data = users.map((user, index) => [
        (index + 1).toString(),
        user.run || 'Sin RUT',
        user.name || '',
        user.lastName || '',
        user.email || 'Sin email',
        user.phone || 'Sin teléfono',
        user.role || 'Sin rol',
        user.status === 1 ? 'Activo' : 'Inactivo'
      ]);

      // Título del documento
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);

      // Tabla de datos
      autoTable(doc, {
        head: headers,
        body: data,
        startY: 30,
        styles: {
          fontSize: 8,
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

      // Pie de página
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

      doc.save(buildExportFilename('usuarios', 'pdf'));
      toast.success('PDF exportado correctamente');
    } catch (error) {
      logger.captureException(error, { context: 'ExportButtons:exportPDF' });
      toast.error('Error al exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className='flex w-full sm:w-auto gap-2 flex-nowrap whitespace-nowrap'>
      <Button
        variant='outline'
        size='sm'
        onClick={exportToPDF}
        disabled={isExporting}
        className='flex-1 sm:flex-none gap-2 rounded-full whitespace-nowrap hover:text-red-600 hover:scale-105 transition-all duration-200 text-xs sm:text-sm'
      >
        <FilePdf className='h-3 w-3 sm:h-4 sm:w-4 text-red-500' />
        {isExporting ? 'Exportando...' : 'PDF'}
      </Button>
      <Button
        variant='outline'
        size='sm'
        onClick={exportToExcel}
        disabled={isExporting}
        className='flex-1 sm:flex-none gap-2 rounded-full whitespace-nowrap hover:text-green-600 hover:scale-105 transition-all duration-200 text-xs sm:text-sm'
      >
        <FileXls className='h-3 w-3 sm:h-4 sm:w-4 text-green-500' />
        {isExporting ? 'Exportando...' : 'Excel'}
      </Button>

      {/* Tabla oculta para la impresión */}
      <div style={{ display: 'none' }}>
        <div className='p-6'>
          <h1 className='text-3xl font-bold mb-6'>Listado de Usuarios</h1>
          <p className='text-base text-gray-600 mb-6'>Generado el {formatDateLabel(new Date())}</p>
          <table className='w-full text-base border-collapse'>
            <thead>
              <tr className='bg-gray-100'>
                <th className='py-3 px-4 text-center border w-16 text-lg'>#</th>
                <th className='py-3 px-4 text-left border text-lg'>RUT</th>
                <th className='py-3 px-4 text-left border text-lg'>Nombre</th>
                <th className='py-3 px-4 text-left border text-lg'>Apellido</th>
                <th className='py-3 px-4 text-left border text-lg'>Email</th>
                <th className='py-3 px-4 text-left border text-lg'>Teléfono</th>
                <th className='py-3 px-4 text-left border text-lg'>Rol</th>
                <th className='py-3 px-4 text-left border text-lg'>Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id} className='border-b hover:bg-gray-50'>
                  <td className='py-3 px-4 text-center border'>{index + 1}</td>
                  <td className='py-3 px-4 border'>{user.run || 'Sin RUN'}</td>
                  <td className='py-3 px-4 border'>{user.name || ''}</td>
                  <td className='py-3 px-4 border'>{user.lastName || ''}</td>
                  <td className='py-3 px-4 border'>{user.email || 'Sin email'}</td>
                  <td className='py-3 px-4 border'>{user.phone || 'Sin teléfono'}</td>
                  <td className='py-3 px-4 border'>{user.role || 'Sin rol'}</td>
                  <td className='py-3 px-4 border'>
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        user.status === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.status === 1 ? 'Activo' : 'Inactivo'}
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
