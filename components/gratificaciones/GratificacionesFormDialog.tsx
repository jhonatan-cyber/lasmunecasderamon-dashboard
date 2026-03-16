'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useEmployees } from '@/hooks/personal/useEmployees';
import { useGratificaciones } from '@/hooks/personal/useGratificaciones';
import { toast } from 'sonner';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { User as UserIcon } from 'lucide-react';

interface GratificacionesFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GratificacionesFormDialog({ open, onClose, onSuccess }: GratificacionesFormDialogProps) {
  const { data: employeesResponse } = useEmployees();
  const employees = employeesResponse?.data || [];
  const { createGratificacion } = useGratificaciones();
  const [selectedUser, setSelectedUser] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState('');

  const eligibleEmployees = (employees || []).filter((u: any) => {
    const isActive = u.status === 1 || u.status === undefined || u.status === null;
    return isActive;
  });

  const filteredEmployees = eligibleEmployees.filter((u: any) =>
    `${u.name} ${u.lastName} ${u.nick || ''}`.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const formatNumber = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getNumericValue = (formattedValue: string) => {
    return formattedValue.replace(/\./g, '');
  };

  const handleMontoChange = (value: string) => {
    setMonto(formatNumber(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericMonto = getNumericValue(monto);
    
    if (!selectedUser || !numericMonto) {
      toast.error('El usuario y el monto son requeridos');
      return;
    }

    const montoNum = parseFloat(numericMonto);
    const usuarioId = parseInt(String(selectedUser));

    if (isNaN(usuarioId)) {
      toast.error('El usuario seleccionado no es válido');
      return;
    }

    if (montoNum <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      await createGratificacion({
        usuario_id: usuarioId,
        monto: montoNum,
        descripcion: descripcion.trim()
      });

      toast.success('Gratificación creada exitosamente');
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error al crear gratificación:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear la gratificación');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUser('');
    setMonto('');
    setDescripcion('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-center text-lg sm:text-xl lg:text-2xl font-semibold'>
            Nueva Gratificación
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex flex-col h-full'>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-4 sm:space-y-6'>
              <div>
                <Label htmlFor='usuario' className='text-xs sm:text-sm font-medium'>
                  Empleado <span className='text-red-500'>*</span>
                </Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-full rounded-full">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="Selecciona un empleado" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 pb-0">
                      <Input
                        autoFocus
                        placeholder="Buscar empleado..."
                        value={searchEmployee}
                        onChange={e => setSearchEmployee(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    {filteredEmployees.length === 0 && (
                      <div className="px-4 py-2 text-gray-400 text-sm">
                        {eligibleEmployees.length === 0 ? "No hay empleados disponibles" : "Sin resultados"}
                      </div>
                    )}
                    {filteredEmployees.map((employee: any, index: number) => {
                      const employeeId = employee.id ?? employee.id_usuario ?? `emp-${index}`;
                      const displayNick = employee.nick || employee.nickname || '';
                      return (
                        <SelectItem key={employeeId} value={String(employeeId)}>
                          {employee.name} {employee.lastName} {displayNick ? `(${displayNick})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='monto' className='text-xs sm:text-sm font-medium'>
                  Monto <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='monto'
                  type='text'
                  inputMode='numeric'
                  value={monto}
                  onChange={(e) => handleMontoChange(e.target.value)}
                  placeholder='0'
                  className='mt-1 text-xs sm:text-sm'
                />
              </div>

              <div>
                <Label htmlFor='descripcion' className='text-xs sm:text-sm font-medium'>
                  Descripción
                </Label>
                <Textarea
                  id='descripcion'
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder='Ingresa una descripción opcional...'
                  className='mt-1 text-xs sm:text-sm'
                  rows={3}
                />
              </div>

              {monto && (
                <div className='p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 text-center'>
                  <div className='text-xs sm:text-sm text-blue-700'>
                    <strong className='font-bold text-xs sm:text-sm'>Monto a registrar:</strong>{' '}
                    {formatCurrencyNoDecimals(parseFloat(getNumericValue(monto)) || 0)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='flex-shrink-0 border-t px-6 py-4'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
              <Button
                type='button'
                onClick={handleClose}
                disabled={loading}
                variant='outline'
                size='sm'
                className='rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs sm:text-sm w-full sm:w-auto'
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={loading || !selectedUser || !monto}
                variant='outline'
                size='sm'
                className='rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 bg-black text-white text-xs sm:text-sm w-full sm:w-auto'
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
