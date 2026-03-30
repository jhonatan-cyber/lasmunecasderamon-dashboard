import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface CuentaHeaderProps {
  loading?: boolean;
  onRefresh?: () => void;
}

export function CuentaHeader({ }: CuentaHeaderProps = {}) {
  const router = useRouter();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();

  const handleCreateAccount = () => {
    if (!hasOpenCaja) {
      toast.error(
        'No se puede crear una nueva cuenta sin caja abierta. Por favor, abra una caja primero.'
      );
      return;
    }
    router.push('/accounts/new');
  };

  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
      <div>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Cuentas</h1>
        <p className='text-sm sm:text-base text-gray-600'>
          Gestiona las cuentas de clientes y sus consumos
        </p>
      </div>
      <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
        <PermissionGuard module='accounts' action='create' fallback={null}>
          <Button
            onClick={handleCreateAccount}
            disabled={cajaLoading || !hasOpenCaja}
            size='sm'
            variant='outline'
            className={`w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 transition-all duration-200 text-sm sm:text-base border-2 ${hasOpenCaja
              ? 'bg-black text-white hover:bg-white hover:text-black hover:scale-105 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
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
                <Plus className='mr-2 h-4 w-4' />
                Nuevo
              </>
            ) : (
              <>
                <AlertCircle className='mr-2 h-4 w-4' />
                Sin Caja Abierta
              </>
            )}
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}
