'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { OvertimeEmployeeList } from '@/components/overtime/OvertimeEmployeeList';

export default function CajeroHorasExtrasPage() {
  return (
    <BoneyardSkeleton name="cajero-horas-extras-main" loading={false}>
      <OvertimeEmployeeList allowedRole='cajero' />
    </BoneyardSkeleton>
  );
}
