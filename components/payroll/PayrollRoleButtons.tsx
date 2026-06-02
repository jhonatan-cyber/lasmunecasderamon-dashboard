"use client";

import { Button } from "@/components/ui/button";
import { RoleFilter } from '@/hooks/personal';

interface Props {
  roleFilter: RoleFilter;
  setRoleFilter: (r: RoleFilter) => void;
}

export default function PayrollRoleButtons({ roleFilter, setRoleFilter }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        size="sm"
        variant={roleFilter === 'all' ? 'default' : 'outline'}
        className="rounded-full"
        onClick={() => setRoleFilter('all')}
      >
        Todos
      </Button>
      <Button
        size="sm"
        variant={roleFilter === 'anfitriona' ? 'default' : 'outline'}
        className="rounded-full"
        onClick={() => setRoleFilter('anfitriona')}
      >
        Anfitrionas
      </Button>
      <Button
        size="sm"
        variant={roleFilter === 'garzon' ? 'default' : 'outline'}
        className="rounded-full"
        onClick={() => setRoleFilter('garzon')}
      >
        Garzones
      </Button>
      <Button
        size="sm"
        variant={roleFilter === 'cajero' ? 'default' : 'outline'}
        className="rounded-full"
        onClick={() => setRoleFilter('cajero')}
      >
        Cajeros
      </Button>
    </div>
  );
}



