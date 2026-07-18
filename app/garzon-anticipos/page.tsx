'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AdvancesEmployeeList } from '@/components/advances/AdvancesEmployeeList';

export default function GarzonAnticiposPage() {
  return (
    <BoneyardSkeleton name="garzon-anticipos-main" loading={false}>
      <AdvancesEmployeeList allowedRole='garzon' />
    </BoneyardSkeleton>
  );
}
