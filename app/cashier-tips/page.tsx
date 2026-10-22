'use client';

import { Skeleton as BoneyardSkeleton } from '@/components/shared/Skeleton';
import { TipsEmployeeList } from '@/components/tips/TipsEmployeeList';

export default function CajeroPropinasPage() {
  return (
    <BoneyardSkeleton name='cajero-propinas-main' loading={false}>
      <TipsEmployeeList allowedRole='cajero' />
    </BoneyardSkeleton>
  );
}
