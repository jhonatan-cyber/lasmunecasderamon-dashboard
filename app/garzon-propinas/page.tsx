'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { TipsEmployeeList } from '@/components/propinas/TipsEmployeeList';

export default function GarzonPropinasPage() {
  return (
    <BoneyardSkeleton name="garzon-propinas-main" loading={false}>
      <TipsEmployeeList allowedRole='garzon' />
    </BoneyardSkeleton>
  );
}
