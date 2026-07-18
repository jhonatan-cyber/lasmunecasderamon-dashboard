'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AttendanceEmployeeList } from '@/components/attendance/AttendanceEmployeeList';

export default function GarzonAsistenciasPage() {
  return (
    <BoneyardSkeleton name="garzon-asistencias-main" loading={false}>
      <AttendanceEmployeeList allowedRole='garzon' />
    </BoneyardSkeleton>
  );
}
