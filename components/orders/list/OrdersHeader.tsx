import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface OrdersHeaderProps {
  hasOpenCaja: boolean | null;
  cajaLoading: boolean;
  onCreateOrder: () => void;
}

export const OrdersHeader = ({ hasOpenCaja, cajaLoading, onCreateOrder }: OrdersHeaderProps) => {
  return (
    <div className='flex items-center justify-between mb-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Gestión de Órdenes</h1>
        <p className='text-gray-600'>Administra todas las órdenes del sistema</p>
      </div>
      <div className='flex gap-2'>
        <PermissionGuard module='orders' action='create' fallback={null}>
          <Button
            onClick={onCreateOrder}
            disabled={cajaLoading || !hasOpenCaja}
            className={`rounded-full px-6 py-2 transition-all duration-200 ${
              hasOpenCaja
                ? 'bg-black text-white hover:bg-white/90 hover:text-black hover:scale-105 shadow-md shadow-gray-200'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {cajaLoading ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2' />
                Verificando...
              </>
            ) : hasOpenCaja ? (
              <>
                <Plus className='h-4 w-4 mr-2' />
                Nuevo Pedido
              </>
            ) : (
              <>
                <AlertCircle className='h-4 w-4 mr-2' />
                Sin Caja
              </>
            )}
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
};
