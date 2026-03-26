import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { User, DollarSign } from 'lucide-react';
import { useAdvanceForm } from '@/hooks/personal/useAdvanceForm';

interface AdvanceFormProps {
  open: boolean;
  onSubmit: (data: { usuario_id: string; monto: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
  hideButtons?: boolean;
}

export function AdvanceForm({ open, onSubmit, onCancel, isLoading = false, error, hideButtons = false }: AdvanceFormProps) {
  const { users, loadingUsers, selectedUser, setSelectedUser, monto, setMonto, handleSubmit } =
    useAdvanceForm({ open, onSubmit });

  return (
    <form id='advance-form' onSubmit={handleSubmit} className='space-y-4 sm:space-y-6'>
      <div>
        <Label className='text-sm sm:text-base'>Usuario</Label>
        <div className='relative'>
          <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loadingUsers || isLoading}>
            <SelectTrigger className='w-full text-sm sm:text-base pl-10 rounded-full'>
              <User className='absolute left-3 h-4 w-4 text-gray-400' />
              <SelectValue placeholder='Selecciona un usuario' />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={String(u.id)} className='text-sm sm:text-base'>
                  {u.name} {u.lastName} ({u.nick})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className='text-sm sm:text-base'>Monto</Label>
        <div className='relative'>
          <Input type='number' min={1} value={monto} onChange={e => setMonto(e.target.value)}
            placeholder='Monto de anticipo' className='pl-10 text-sm sm:text-base' disabled={isLoading} />
          <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
        </div>
      </div>
      {error && <div className='text-red-500 text-sm'>{error}</div>}
      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4'>
          <Button size='sm' variant='outline' type='button' onClick={onCancel} disabled={isLoading}
            className='w-full sm:w-auto rounded-full px-6 py-2 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'>
            Cancelar
          </Button>
          <Button type='submit' disabled={isLoading || !selectedUser || !monto} size='sm' variant='outline'
            className='w-full sm:w-auto rounded-full px-6 py-2 bg-black text-white hover:scale-105 transition-all duration-200'>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      )}
    </form>
  );
}
