/* eslint-disable */
import { Client } from '@/types/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientDetailsProps {
  client: Client | null;
  onClose: () => void;
}

export function ClientDetails({ client, onClose }: ClientDetailsProps) {
  if (!client) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Sin fecha';
    return format(new Date(dateString), 'PPPpp', { locale: es });
  };

  return (
    <div className='w-full max-w-xl mx-auto'>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold'>
          {client.name} {client.lastName}
        </h2>
      </div>

      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-3'>
            <h3 className='font-semibold text-gray-700 text-md'>Información Personal</h3>
            <div className='space-y-3'>
              <div>
                <p className='text-xs text-gray-500 mb-1'>ID</p>
                <p className='font-medium text-sm font-mono'>{client.id}</p>
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-1'>RUN</p>
                <p className='font-medium text-sm'>{client.run || 'No especificado'}</p>
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Teléfono</p>
                <p className='font-medium text-sm'>{client.phone || 'No especificado'}</p>
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Estado</p>
                <Badge
                  variant={client.status === 1 ? 'default' : 'secondary'}
                  className={
                    client.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }
                >
                  {client.status === 1 ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>

          <div className='space-y-3'>
            <h3 className='font-semibold text-gray-700 text-md'>Registro</h3>
            <div className='space-y-3'>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Creado</p>
                <p className='font-medium text-sm'>{formatDate(client.created_at)}</p>
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Última actualización</p>
                <p className='font-medium text-sm'>{formatDate(client.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
