import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegisterFirstUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  registerData: any;
  setRegisterData: (data: any) => void;
  onRegister: () => void;
  loading: boolean;
}

export const RegisterFirstUserModal = ({
  isOpen,
  onClose,
  registerData,
  setRegisterData,
  onRegister,
  loading
}: RegisterFirstUserModalProps) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl'>
        <div className='text-center mb-6'>
          <div className='w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4'>
            <span className='text-2xl'>👑</span>
          </div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
            Crear Administrador
          </h2>
          <p className='text-gray-600 dark:text-gray-400'>
            Crea el primer usuario administrador del sistema
          </p>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            onRegister();
          }}
          className='space-y-4'
        >
          <div>
            <Label htmlFor='ci' className='text-sm font-medium text-gray-700 dark:text-gray-200'>
              RUN (CI)
            </Label>
            <Input
              id='ci'
              type='text'
              value={registerData.ci}
              onChange={e => setRegisterData({ ...registerData, ci: e.target.value })}
              className='mt-1'
              required
              placeholder='Número de identificación'
            />
            <p className='text-[10px] text-blue-500 mt-1'>
              * El RUN se utilizará también como su contraseña de acceso.
            </p>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='nombre' className='text-sm font-medium text-gray-700 dark:text-gray-200'>
                Nombre
              </Label>
              <Input
                id='nombre'
                type='text'
                value={registerData.nombre}
                onChange={e => setRegisterData({ ...registerData, nombre: e.target.value })}
                className='mt-1'
                required
              />
            </div>
            <div>
              <Label htmlFor='apellido' className='text-sm font-medium text-gray-700 dark:text-gray-200'>
                Apellido
              </Label>
              <Input
                id='apellido'
                type='text'
                value={registerData.apellido}
                onChange={e => setRegisterData({ ...registerData, apellido: e.target.value })}
                className='mt-1'
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor='email' className='text-sm font-medium text-gray-700 dark:text-gray-200'>
              Usuario (Email)
            </Label>
            <Input
              id='email'
              type='text'
              value={registerData.email}
              onChange={e => setRegisterData({ ...registerData, email: e.target.value })}
              className='mt-1'
              required
            />
          </div>

          <Button
            type='submit'
            className='w-full bg-green-600 hover:bg-green-700 text-white rounded-full'
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Administrador'}
          </Button>
          <Button
            type='button'
            variant='ghost'
            className='w-full'
            onClick={onClose}
          >
            Cancelar
          </Button>
        </form>
      </div>
    </div>
  );
};
