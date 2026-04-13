import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import CustomerSelect from '@/components/shared/selects/CustomerSelect';
import RoomSelect from '@/components/shared/selects/RoomSelect';
import PaymentMethodSelect from '@/components/shared/selects/PaymentMethodSelect';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface NewSaleConfigurationProps {
  clientes: any[];
  selectedCliente: string;
  setSelectedCliente: (val: string) => void;
  requiresRoom: boolean;
  habitaciones: any[];
  selectedHabitacion: string;
  handleHabitacionChange: (id: string) => void;
  manualTime: string;
  setManualTime: (val: string) => void;
  metodoPago: string;
  setMetodoPago: (val: string) => void;
  propina: number;
  enableTip: boolean;
  setEnableTip: (val: boolean) => void;
}

export const NewSaleConfiguration = ({
  clientes,
  selectedCliente,
  setSelectedCliente,
  requiresRoom,
  habitaciones,
  selectedHabitacion,
  handleHabitacionChange,
  manualTime,
  setManualTime,
  metodoPago,
  setMetodoPago,
  propina,
  enableTip,
  setEnableTip
}: NewSaleConfigurationProps) => {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2'>
      <div className='space-y-1'>
        <Label className='text-xs text-gray-400 font-bold uppercase tracking-wider'>Cliente</Label>
        <CustomerSelect clientes={clientes} value={selectedCliente} onChange={setSelectedCliente} />
      </div>

      {requiresRoom && (
        <>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
              Habitación
            </Label>
            <RoomSelect
              habitaciones={habitaciones}
              value={selectedHabitacion}
              onChange={handleHabitacionChange}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
              Tiempo (min)
            </Label>
            <Select value={manualTime} onValueChange={setManualTime}>
              <SelectTrigger className='rounded-full h-11 border-gray-200 focus:ring-2 focus:ring-black transition-all'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map(t => (
                  <SelectItem key={t} value={t.toString()}>
                    {t} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className='space-y-1'>
        <Label className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
          Método de Pago
        </Label>
        <PaymentMethodSelect value={metodoPago} onChange={setMetodoPago} />
      </div>

      <div className='space-y-1'>
        <Label className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
          Propina Sugerida (10%)
        </Label>
        <div className='flex items-center gap-3 bg-gray-50/50 p-1 rounded-full border border-gray-100'>
          <Input
            value={formatCurrencyNoDecimals(propina)}
            readOnly
            className='bg-transparent border-none rounded-full h-9 font-bold text-gray-700'
          />
          <div className='pr-2'>
            <Checkbox
              checked={enableTip}
              onCheckedChange={c => setEnableTip(c === true)}
              className='w-5 h-5 rounded-md border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black'
            />
          </div>
        </div>
      </div>
    </div>
  );
};
