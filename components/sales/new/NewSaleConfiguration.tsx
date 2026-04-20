import { Label } from '@/components/ui/label';
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

const fieldWrapperClass = 'flex flex-col gap-1.5';
const fieldLabelClass =
  'block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400';

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
    <div className='grid grid-cols-1 items-end gap-6 px-2 sm:grid-cols-2 lg:grid-cols-4'>
      <div className={fieldWrapperClass}>
        <CustomerSelect clientes={clientes} value={selectedCliente} onChange={setSelectedCliente} />
      </div>

      {requiresRoom && (
        <>
          <div className={fieldWrapperClass}>
            <RoomSelect
              habitaciones={habitaciones}
              value={selectedHabitacion}
              onChange={handleHabitacionChange}
            />
          </div>
          <div className={fieldWrapperClass}>
            <Label className={fieldLabelClass}>Tiempo (min)</Label>
            <Select value={manualTime} onValueChange={setManualTime}>
              <SelectTrigger className='h-11 rounded-full border-gray-200 transition-all focus:ring-2 focus:ring-black dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-white'>
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

      <div className={fieldWrapperClass}>
        <PaymentMethodSelect value={metodoPago} onChange={setMetodoPago} />
      </div>
      <div className={fieldWrapperClass}>
        <Label className={fieldLabelClass}>Propina Sugerida (10%)</Label>
        <div
          role='button'
          tabIndex={0}
          onClick={() => setEnableTip(!enableTip)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setEnableTip(!enableTip);
            }
          }}
          className='flex h-11 items-center justify-between gap-3 rounded-full border border-gray-200 bg-gray-50/80 px-3 text-left transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/80 dark:hover:bg-neutral-800'
          aria-pressed={enableTip}
        >
          <div className='min-w-0'>
            <span className='block text-sm font-bold text-gray-800 dark:text-neutral-100'>
              {formatCurrencyNoDecimals(propina)}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400'>
              {enableTip ? 'Activa' : 'Inactiva'}
            </span>
            <Checkbox
              checked={enableTip}
              onClick={event => event.stopPropagation()}
              onCheckedChange={c => setEnableTip(c === true)}
              className='h-5 w-5 rounded-md border-gray-300 dark:border-neutral-500 data-[state=checked]:border-black data-[state=checked]:bg-black dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
            />
          </div>
        </div>
      </div>
    </div>
  );
};
