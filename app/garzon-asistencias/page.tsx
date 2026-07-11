'use client';

import { AttendanceEmployeeList } from '@/components/attendance/AttendanceEmployeeList';

export default function GarzonAsistenciasPage() {
  return <AttendanceEmployeeList allowedRole='garzon' />;
}
