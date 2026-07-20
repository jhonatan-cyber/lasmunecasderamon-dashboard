'use client';

import { Button } from '@/components/ui/button';
import { RoleFilter } from '@/hooks/personal';

interface Props {
  roleFilter: RoleFilter;
  setRoleFilter: (r: RoleFilter) => void;
}

export default function PayrollRoleButtons({ roleFilter, setRoleFilter }: Props) {
  return (
    <div className='overflow-x-auto'>
      <div className='flex items-center gap-2 w-max mx-auto px-1 py-0.5'>
        <Button
          size='sm'
          variant={roleFilter === 'all' ? 'default' : 'outline-solid'}
          className='rounded-full shrink-0'
          onClick={() => setRoleFilter('all')}
        >
          Todos
        </Button>
        <Button
          size='sm'
          variant={roleFilter === 'anfitriona' ? 'default' : 'outline-solid'}
          className='rounded-full shrink-0'
          onClick={() => setRoleFilter('anfitriona')}
        >
          Anfitrionas
        </Button>
        <Button
          size='sm'
          variant={roleFilter === 'garzon' ? 'default' : 'outline-solid'}
          className='rounded-full shrink-0'
          onClick={() => setRoleFilter('garzon')}
        >
          Garzones
        </Button>
        <Button
          size='sm'
          variant={roleFilter === 'cajero' ? 'default' : 'outline-solid'}
          className='rounded-full shrink-0'
          onClick={() => setRoleFilter('cajero')}
        >
          Cajeros
        </Button>
      </div>
    </div>
  );
}
