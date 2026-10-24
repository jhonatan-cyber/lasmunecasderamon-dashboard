'use client';
import { Client } from '@/types/client';
import { formatDateLabel } from '@/lib/utils/calendarUtils';
import { EntityExportButtons, type ExportColumn } from '@/components/shared/ExportButtons';

const columns: ExportColumn<Client>[] = [
  {
    key: 'index',
    header: '#',
    width: 6,
    align: 'center',
    value: (_client, index) => index + 1
  },
  { key: 'run', header: 'RUN', width: 20, value: client => client.run || 'Sin RUN' },
  { key: 'name', header: 'Nombre', width: 20, value: client => client.name || '' },
  { key: 'lastName', header: 'Apellido', width: 20, value: client => client.lastName || '' },
  { key: 'phone', header: 'Teléfono', width: 18, value: client => client.phone || 'Sin teléfono' },
  {
    key: 'status',
    header: 'Estado',
    width: 12,
    value: client => (client.status === 1 ? 'Activo' : 'Inactivo'),
    renderCell: client => (
      <span
        className={`px-3 py-1.5 rounded-full text-sm ${
          client.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {client.status === 1 ? 'Activo' : 'Inactivo'}
      </span>
    )
  },
  {
    key: 'created_at',
    header: 'Fecha Creación',
    width: 16,
    value: client => (client.created_at ? formatDateLabel(client.created_at) : 'Sin fecha'),
    inPdf: false,
    inTable: false
  },
  {
    key: 'updated_at',
    header: 'Última Modificación',
    width: 16,
    value: client => (client.updated_at ? formatDateLabel(client.updated_at) : 'Sin modificar'),
    inPdf: false,
    inTable: false
  }
];

interface ClientExportButtonsProps {
  clients: Client[];
}

export function ClientExportButtons({ clients }: ClientExportButtonsProps) {
  return (
    <EntityExportButtons
      items={clients}
      slug='clientes'
      worksheetName='Clientes'
      title='Listado de Clientes'
      columns={columns}
      logContext='clients'
      containerClassName='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'
      buttonClassName='text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
    />
  );
}
