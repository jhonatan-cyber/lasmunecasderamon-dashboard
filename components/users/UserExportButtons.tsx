'use client';
import { User } from '@/types/user';
import { formatDateLabel } from '@/lib/utils/calendarUtils';
import { EntityExportButtons, type ExportColumn } from '@/components/shared/ExportButtons';

const columns: ExportColumn<User>[] = [
  {
    key: 'index',
    header: '#',
    width: 6,
    align: 'center',
    value: (_user, index) => index + 1
  },
  { key: 'run', header: 'RUT', width: 20, value: user => user.run || 'Sin RUT' },
  { key: 'name', header: 'Nombre', width: 20, value: user => user.name || '' },
  { key: 'lastName', header: 'Apellido', width: 20, value: user => user.lastName || '' },
  { key: 'email', header: 'Email', width: 30, value: user => user.email || 'Sin email' },
  { key: 'phone', header: 'Teléfono', width: 18, value: user => user.phone || 'Sin teléfono' },
  { key: 'role', header: 'Rol', width: 16, value: user => user.role || 'Sin rol' },
  {
    key: 'status',
    header: 'Estado',
    width: 12,
    value: user => (user.status === 1 ? 'Activo' : 'Inactivo'),
    renderCell: user => (
      <span
        className={`px-3 py-1.5 rounded-full text-sm ${
          user.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {user.status === 1 ? 'Activo' : 'Inactivo'}
      </span>
    )
  },
  {
    key: 'maritalStatus',
    header: 'Estado Civil',
    width: 16,
    value: user => user.maritalStatus || 'Sin especificar',
    inPdf: false,
    inTable: false
  },
  {
    key: 'afp',
    header: 'AFP',
    width: 16,
    value: user => user.afp || 'Sin especificar',
    inPdf: false,
    inTable: false
  },
  {
    key: 'salary',
    header: 'Sueldo',
    width: 16,
    value: user =>
      user.salary ? `${new Intl.NumberFormat('es-CL').format(user.salary)}` : 'Sin sueldo',
    inPdf: false,
    inTable: false
  },
  {
    key: 'created_at',
    header: 'Fecha Creación',
    width: 16,
    value: user => (user.created_at ? formatDateLabel(user.created_at) : 'Sin fecha'),
    inPdf: false,
    inTable: false
  },
  {
    key: 'updated_at',
    header: 'Última Modificación',
    width: 16,
    value: user => (user.updated_at ? formatDateLabel(user.updated_at) : 'Sin modificar'),
    inPdf: false,
    inTable: false
  }
];

interface UserExportButtonsProps {
  users: User[];
}

export function UserExportButtons({ users }: UserExportButtonsProps) {
  return (
    <EntityExportButtons
      items={users}
      slug='usuarios'
      worksheetName='Usuarios'
      title='Listado de Usuarios'
      columns={columns}
      logContext='users'
      pdfFontSize={8}
      containerClassName='flex w-full sm:w-auto gap-2 flex-nowrap whitespace-nowrap'
      buttonClassName='flex-1 sm:flex-none whitespace-nowrap text-xs sm:text-sm'
    />
  );
}
