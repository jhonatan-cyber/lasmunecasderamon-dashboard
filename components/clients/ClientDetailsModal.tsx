'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useGenericFetch } from '@/hooks/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Loader2, ShoppingBag, Waves, CreditCard, ArrowUpCircle } from 'lucide-react';
import { Client } from '@/types/client';

interface ClientDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

interface HistoryItem {
  id: string;
  category: 'SERVICIO' | 'CONSUMO' | 'CARGA';
  monto: number;
  metodo_pago: string;
  fecha_crea: string;
  atendido_por: string;
  mesero?: string;
  detalle?: {
    habitacion?: string;
    tiempo?: number;
    anfitrionas?: string[];
    productos?: { nombre: string; cantidad: number }[];
  };
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'SERVICIO': return <Waves className="w-4 h-4 text-blue-500" />;
    case 'CONSUMO': return <ShoppingBag className="w-4 h-4 text-orange-500" />;
    case 'CARGA': return <ArrowUpCircle className="w-4 h-4 text-green-500" />;
    default: return <CreditCard className="w-4 h-4 text-gray-500" />;
  }
};

function formatDate(dateString?: string) {
  if (!dateString) return 'Sin fecha';
  return format(new Date(dateString), 'PPPpp', { locale: es });
}

function formatShortDate(dateString: string) {
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
}

function ClientDetails({ client, onClose }: { client: Client; onClose: () => void; }) {
  const { data: history = [], isLoading } = useGenericFetch<HistoryItem>(
    client ? `/api/clients/history?cliente_id=${client.id}` : '',
    {
      initialFetch: !!client,
      transform: (res) => (res.success ? res.data : [])
    }
  );

  if (!client) return null;

  return (
    <div className='w-full'>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold dark:text-white'>
          {client.name} {client.lastName}
        </h2>
      </div>

      <div className='space-y-8 max-h-[70vh] overflow-y-auto pr-2 px-1 pb-10'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b dark:border-gray-800'>
          <div className='space-y-3'>
            <h3 className='font-semibold text-gray-700 dark:text-gray-200 text-md'>Información Personal</h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <p className='text-xs text-gray-500 mb-1'>RUN</p>
                <p className='font-medium text-sm'>{client.run || 'No especificado'}</p>
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Teléfono</p>
                <p className='font-medium text-sm'>{client.phone || 'No especificado'}</p>
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Saldo Prepago</p>
                <p className='font-bold text-lg text-green-600 font-mono'>
                  ${Number(client.saldo || 0).toLocaleString('es-CL')}
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Estado</p>
                <Badge
                  className={
                    client.status === 1 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }
                >
                  {client.status === 1 ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>

          <div className='space-y-3'>
            <h3 className='font-semibold text-gray-700 dark:text-gray-200 text-md'>Registro</h3>
            <div className='grid grid-cols-1 gap-4'>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Creado el</p>
                <p className='font-medium text-sm'>{formatDate(client.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-bold text-gray-800 dark:text-gray-100 text-lg'>Historial de Actividad y Prepago</h3>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-600" />}
          </div>

          {isLoading ? (
            <div className='flex flex-col items-center py-10 text-gray-400 space-y-4'>
              <Loader2 className='w-8 h-8 animate-spin' />
              <p>Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <div className='text-center py-10 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm'>
              No hay movimientos registrados para este cliente.
            </div>
          ) : (
            <div className='rounded-xl border dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950 shadow-sm overflow-x-auto'>
              <Table>
                <TableHeader className='bg-gray-50 dark:bg-gray-900/50'>
                  <TableRow>
                    <TableHead className='w-[140px] text-xs uppercase font-bold text-gray-500 dark:text-gray-400'>Fecha</TableHead>
                    <TableHead className='w-[100px] text-xs uppercase font-bold text-gray-500 dark:text-gray-400'>Tipo</TableHead>
                    <TableHead className='text-xs uppercase font-bold text-gray-500 dark:text-gray-400'>Detalles</TableHead>
                    <TableHead className='text-xs uppercase font-bold text-gray-500 dark:text-gray-400'>Personal</TableHead>
                    <TableHead className='text-right text-xs uppercase font-bold text-gray-500 dark:text-gray-400'>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id} className='hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors'>
                      <TableCell className='text-xs font-mono text-gray-600 dark:text-gray-400'>{formatShortDate(item.fecha_crea)}</TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {getCategoryIcon(item.category)}
                          <span className='text-xs font-bold dark:text-gray-200'>{item.category}</span>
                        </div>
                        <p className='text-[10px] text-gray-400 dark:text-gray-500 capitalize'>{item.metodo_pago}</p>
                      </TableCell>
                      <TableCell>
                        <div className='text-xs space-y-1'>
                          {item.category === 'CARGA' && <p className='text-green-600 font-medium italic'>Abono a saldo prepago</p>}
                          {item.detalle?.habitacion && (
                            <Badge variant='outline' className='text-[10px] bg-blue-50/50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'>
                              Hab: {item.detalle.habitacion}{item.detalle.tiempo ? ` (${item.detalle.tiempo} min)` : ''}
                            </Badge>
                          )}
                          {item.detalle?.productos && item.detalle.productos.length > 0 && (
                            <div className='flex flex-wrap gap-1 mt-1'>
                              {item.detalle.productos.map((p, idx) => (
                                <span key={idx} className='bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800 px-1.5 py-0.5 rounded text-[10px]'>
                                  {p.nombre} x{p.cantidad}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.detalle?.anfitrionas && item.detalle.anfitrionas.length > 0 && (
                            <div className='flex flex-wrap gap-1 mt-1 items-center'>
                              <span className='text-[10px] text-gray-400 dark:text-gray-500'>Anfitrionas:</span>
                              {item.detalle.anfitrionas.map((nick, idx) => (
                                <Badge key={idx} variant='secondary' className='px-1 py-0 h-4 text-[9px] bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'>
                                  {nick}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='text-[10px] space-y-0.5 text-gray-500 dark:text-gray-400'>
                          <p><span className='font-semibold text-gray-700 dark:text-gray-300'>Procesó:</span> {item.atendido_por}</p>
                          {item.mesero && <p><span className='font-semibold text-gray-700 dark:text-gray-300'>Mesero:</span> {item.mesero}</p>}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-bold font-mono text-sm ${item.category === 'CARGA' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {item.category === 'CARGA' ? '+' : '-'}${item.monto.toLocaleString('es-CL')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ClientDetailsModal({ isOpen, onOpenChange, client }: ClientDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl w-[95vw] sm:w-[90vw] h-fit max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden'>
        <DialogHeader>
          <DialogTitle className='text-lg sm:text-xl'>Detalles del Cliente</DialogTitle>
        </DialogHeader>
        {client && <ClientDetails client={client} onClose={() => onOpenChange(false)} />}
        <div className='border-t pt-4 mt-2 bg-gray-50 dark:bg-slate-900/50 -m-4 sm:-m-6 p-4 sm:p-6 rounded-b-xl flex justify-center w-full'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-full w-full sm:w-auto px-8 py-2 dark:hover:bg-white dark:hover:text-black hover:scale-105 transition-all'
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

