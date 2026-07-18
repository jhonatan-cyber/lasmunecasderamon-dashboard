'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AdvancesEmployeeList } from '@/components/advances/AdvancesEmployeeList';

export default function CajeroAnticiposPage() {
  return (
    <BoneyardSkeleton name="cajero-anticipos-main" loading={false}>
      <AdvancesEmployeeList allowedRole='cajero' />
    </BoneyardSkeleton>
  );
}
