'use client';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AttendanceEmployeeList } from '@/components/attendance/AttendanceEmployeeList';

export default function AnfitrionaAsistenciasPage() {
  return (
    <BoneyardSkeleton name='anfitriona-asistencias-main' loading={false}>
      <AttendanceEmployeeList allowedRole='anfitriona' showHousingSummary />
    </BoneyardSkeleton>
  );
}
