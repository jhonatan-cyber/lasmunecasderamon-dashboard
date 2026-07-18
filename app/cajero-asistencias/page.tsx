'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AttendanceEmployeeList } from '@/components/attendance/AttendanceEmployeeList';

export default function CajeroAsistenciasPage() {
  return (
    <BoneyardSkeleton name="cajero-asistencias-main" loading={false}>
      <AttendanceEmployeeList allowedRole='cajero' />
    </BoneyardSkeleton>
  );
}
