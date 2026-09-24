'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AdvancesEmployeeList } from '@/components/advances/AdvancesEmployeeList';

export default function AnfitrionaAnticiposPage() {
  return (
    <BoneyardSkeleton name='anfitriona-anticipos-main' loading={false}>
      <AdvancesEmployeeList allowedRole='anfitriona' title='Listado de Anticipos' />
    </BoneyardSkeleton>
  );
}
