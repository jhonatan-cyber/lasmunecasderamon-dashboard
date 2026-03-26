'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CajaWithUser, CajaRetiro } from '@/types/caja';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { Loader2 } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

// Función para obtener el día de la semana en español
const getDiaSemana = (fecha: string): string => {
    const dias = [
        'Domingo',
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
    ];
    const fechaObj = new Date(fecha);
    return dias[fechaObj.getDay()];
};

interface RetiroDineroDialogProps {
    caja: CajaWithUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRetirar: (data: CajaRetiro) => Promise<boolean>;
    loading: boolean;
}

export function RetiroDineroDialog({
    caja,
    open,
    onOpenChange,
    onRetirar,
    loading
}: RetiroDineroDialogProps) {
    const { user } = useCurrentUser();
    const [monto, setMonto] = useState('');
    const [motivo, setMotivo] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Función para formatear el monto con puntos de miles
    const formatMonto = (value: string) => {
        // Remover todo excepto números
        const numericValue = value.replace(/[^\d]/g, '');
        
        if (numericValue === '') return '';
        
        // Formatear con puntos de miles manualmente
        const number = parseInt(numericValue);
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Función para obtener el valor numérico sin formato
    const getNumericValue = (formattedValue: string) => {
        return parseInt(formattedValue.replace(/[^\d]/g, '') || '0');
    };

    const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const formatted = formatMonto(inputValue);
        const numericValue = getNumericValue(formatted);
        
        // Validar que no exceda el monto disponible
        if (caja && numericValue > 0) {
            const disponible = caja.monto_apertura + caja.efectivo - caja.devoluciones - (caja.anticipo || 0);
            if (numericValue > disponible) {
                // No actualizar si excede el disponible
                return;
            }
        }
        
        setMonto(formatted);
        // Limpiar error si existe
        if (errors.monto) {
            setErrors(prev => ({ ...prev, monto: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!caja || !user) {
            setErrors({ general: 'No hay caja seleccionada o usuario no autenticado' });
            return;
        }

        const montoNum = getNumericValue(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            setErrors({ monto: 'El monto debe ser un número mayor a 0' });
            return;
        }

        if (!motivo.trim()) {
            setErrors({ motivo: 'Debe ingresar un motivo para el retiro' });
            return;
        }

        const montoDisponible = caja.monto_apertura + caja.efectivo - caja.devoluciones - (caja.anticipo || 0);
        if (montoNum > montoDisponible) {
            setErrors({ monto: `El monto no puede ser mayor al disponible (${formatCurrencyCLP(montoDisponible)})` });
            return;
        }

        const success = await onRetirar({
            id_caja: caja.id_caja,
            monto: montoNum,
            motivo: motivo.trim(),
            usuario_id: user.id
        });

        if (success) {
            setMonto('');
            setMotivo('');
            onOpenChange(false);
        }
    };

    const handleClose = () => {
        setMonto('');
        setMotivo('');
        setErrors({});
        onOpenChange(false);
    };

    if (!caja) return null;

    const montoDisponible = caja.monto_apertura + caja.efectivo - caja.devoluciones - (caja.anticipo || 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>
                        Retirar Dinero - Caja {getDiaSemana(caja.fecha_apertura)}
                    </DialogTitle>
                </DialogHeader>

                <div className='space-y-4'>
                    {/* Resumen de la caja */}
                    <div className='bg-gray-50 p-1 px-2 rounded-lg space-y-2'>
                        <h4 className='font-medium text-sm'>Información de la caja:</h4>
                        <div className='grid grid-cols-2 gap-2 text-sm'>
                            <div>
                                <span className='text-gray-500'>Cajero:</span>
                                <span className='ml-2 mr-2 font-medium'>{caja.cajero_nombre}</span>
                            </div>
                            <div>
                                <span className='text-gray-500'>Apertura:</span>
                                <span className='ml-2 mr-2 font-medium'>
                                    {formatCurrencyCLP(caja.monto_apertura)}
                                </span>
                            </div>
                            <div>
                                <span className='text-gray-500'>Efectivo:</span>
                                <span className='ml-2 mr-2 font-medium'>
                                    {formatCurrencyCLP(caja.efectivo)}
                                </span>
                            </div>
                            <div>
                                <span className='text-gray-500'>Disponible:</span>
                                <span className='ml-2 mr-2 font-medium text-green-600'>
                                    {formatCurrencyCLP(montoDisponible)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className='space-y-4'>
                        {/* Monto a retirar */}
                        <div>
                            <Label htmlFor='monto' className='text-sm'>
                                Monto a Retirar ($)
                            </Label>
                            <Input
                                id='monto'
                                type='text'
                                value={monto}
                                onChange={handleMontoChange}
                                placeholder='0'
                                className='text-sm'
                                disabled={loading}
                            />
                            {errors.monto && (
                                <p className='text-xs text-red-600 mt-1'>{errors.monto}</p>
                            )}
                        </div>

                        {/* Motivo */}
                        <div>
                            <Label htmlFor='motivo' className='text-sm'>
                                Motivo del Retiro
                            </Label>
                            <Textarea
                                id='motivo'
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder='Ej: Pago a proveedor, Gastos operacionales, etc.'
                                rows={3}
                                className='text-sm'
                                disabled={loading}
                            />
                            {errors.motivo && (
                                <p className='text-xs text-red-600 mt-1'>{errors.motivo}</p>
                            )}
                        </div>

                        {/* Error general */}
                        {errors.general && (
                            <div className='text-xs text-red-600 text-center bg-red-50 p-2 rounded'>
                                {errors.general}
                            </div>
                        )}

                        {/* Buttons */}
                        <div className='flex justify-center gap-2 pt-4 text-center'>
                            <Button
                                type='button'
                                size='sm'
                                variant='outline'
                                className='rounded-full px-6 bg-black text-white hover:scale-110 transition-all duration-200'
                                onClick={handleClose}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type='submit'
                                disabled={loading}
                                size='sm'
                                variant='outline'
                                className='rounded-full px-6 bg-green-600 text-white hover:scale-110 transition-all duration-200'
                            >
                                {loading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                                Confirmar Retiro
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
