import { memo } from 'react';
import { User as UserType } from '@/types/user';
import { Label } from '@radix-ui/react-label';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

interface UserFinancialInfoProps {
  user: UserType;
}

function UserFinancialInfoComponent({ user }: UserFinancialInfoProps) {
  return (
    <div className='space-y-1'>
      <div className='flex items-start justify-start space-x-2'>
        <Label className='text-xs sm:text-sm text-gray-600'>Sueldo</Label>
        <span className='text-xs sm:text-sm font-medium'>
          {formatCurrencyNoDecimals(user.salary)}
        </span>
      </div>
      <div className='flex items-start justify-start space-x-2'>
        <Label className='text-xs sm:text-sm text-gray-600'>Aporte AFP</Label>
        <span className='text-xs sm:text-sm font-medium'>
          {formatCurrencyNoDecimals(user.contributions)}
        </span>
      </div>
      <div className='flex items-start justify-start space-x-2'>
        <Label className='text-xs sm:text-sm text-gray-600'>Descuento habitacion</Label>
        <span className='text-xs sm:text-sm font-medium'>
          {user.discount && user.discount > 0
            ? formatCurrencyNoDecimals(user.discount)
            : 'Sin descuento'}
        </span>
      </div>
    </div>
  );
}

export const UserFinancialInfo = memo(UserFinancialInfoComponent);
