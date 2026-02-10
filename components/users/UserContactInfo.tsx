import { memo } from 'react';
import { User as UserType } from '@/types/user';
import { AtSign, Phone, MapPin } from 'lucide-react';

interface UserContactInfoProps {
  user: UserType;
}

function UserContactInfoComponent({ user }: UserContactInfoProps) {
  return (
    <div className='space-y-1'>
      <div className='flex items-center space-x-2'>
        <AtSign className='text-gray-400 w-3 h-3 sm:w-4 sm:h-4' />
        <span className='text-xs sm:text-sm'>{user.email}</span>
      </div>
      <div className='flex items-center space-x-2'>
        <Phone className='text-gray-400 w-3 h-3 sm:w-4 sm:h-4' />
        <span className='text-xs sm:text-sm'>{user.phone}</span>
      </div>
      <div className='flex items-center space-x-2'>
        <MapPin className='text-gray-400 w-3 h-3 sm:w-4 sm:h-4' />
        <span className='text-xs sm:text-sm'>{user.address || 'Sin dirección'}</span>
      </div>
    </div>
  );
}

export const UserContactInfo = memo(UserContactInfoComponent);
