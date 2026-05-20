'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { getTodayDateKey, getCurrentTimeKey } from '@/lib/utils/calendarUtils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import UserSelect from '@/components/shared/selects/UserSelect';
import { ORDER_FIELD_INPUT_CLASS } from '@/components/orders/orderFieldStyles';

interface AsistenciaFormProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AsistenciaForm({ isOpen, onOpenChange, onSuccess }: AsistenciaFormProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      usuario_id: '',
      fecha: getTodayDateKey(),
      hora: getCurrentTimeKey().slice(0, 5),
      estado: 'presente'
    }
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!data.usuario_id) {
      toast.error('Debe seleccionar un empleado');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          estado: 'presente'
        })
      });

      const result = await res.json();

      if (result.success) {
        toast.success(result.message || 'Asistencia registrada exitosamente');
        form.reset({
          usuario_id: '',
          fecha: getTodayDateKey(),
          hora: getCurrentTimeKey().slice(0, 5),
          estado: 'presente'
        });
        onSuccess?.();
        if (onOpenChange) {
          onOpenChange(false);
        }
      } else {
        toast.error(result.message || 'Error al registrar asistencia');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset({
      usuario_id: '',
      fecha: getTodayDateKey(),
      hora: getCurrentTimeKey().slice(0, 5),
      estado: 'presente'
    });
    onOpenChange?.(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold'>Registrar Asistencia</DialogTitle>
          <DialogDescription className='sr-only'>
            Formulario para registrar asistencia manual
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='asistencia-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col h-full'
          >
            <div className='flex-1 overflow-y-auto p-6 space-y-4'>
              <FormField
                control={form.control}
                name='usuario_id'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <UserSelect
                        users={users}
                        value={field.value}
                        onChange={field.onChange}
                        label='Empleado'
                        placeholder={loading ? 'Cargando empleados...' : 'Selecciona un empleado'}
                        searchPlaceholder='Buscar empleado...'
                        onlyActive={true}
                        disabled={loading}
                        required={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='fecha'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className='flex flex-col'>
                          <label className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide'>
                            Fecha
                            <span className='ml-1 text-red-500'>*</span>
                          </label>
                          <Input type='date' {...field} className={ORDER_FIELD_INPUT_CLASS} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='hora'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className='flex flex-col'>
                          <label className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide'>
                            Hora
                            <span className='ml-1 text-red-500'>*</span>
                          </label>
                          <Input type='time' {...field} className={ORDER_FIELD_INPUT_CLASS} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
              <Button
                variant='outline'
                onClick={handleCancel}
                className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                form='asistencia-form'
                className='bg-black text-white dark:bg-black dark:text-white dark:hover:!bg-white dark:hover:!text-black rounded-full px-8 hover:!bg-white hover:!text-black transition-all hover:scale-105 border-2'
                disabled={submitting || loading}
              >
                {submitting ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>Guardando...</span>
                  </div>
                ) : (
                  <span>Guardar</span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
