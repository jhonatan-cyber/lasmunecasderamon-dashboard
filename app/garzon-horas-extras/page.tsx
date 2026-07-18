'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { OvertimeEmployeeList } from '@/components/overtime/OvertimeEmployeeList';

export default function GarzonHorasExtrasPage() {
  return (
    <BoneyardSkeleton name="garzon-horas-extras-main" loading={false}>
      <OvertimeEmployeeList allowedRole='garzon' />
    </BoneyardSkeleton>
  );
}
