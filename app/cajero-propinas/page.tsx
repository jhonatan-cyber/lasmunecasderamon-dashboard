'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { TipsEmployeeList } from '@/components/propinas/TipsEmployeeList';

export default function CajeroPropinasPage() {
  return (
    <BoneyardSkeleton name="cajero-propinas-main" loading={false}>
      <TipsEmployeeList allowedRole='cajero' />
    </BoneyardSkeleton>
  );
}
