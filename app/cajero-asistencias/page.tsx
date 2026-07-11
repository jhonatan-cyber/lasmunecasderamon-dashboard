'use client';

import { AttendanceEmployeeList } from '@/components/attendance/AttendanceEmployeeList';

export default function CajeroAsistenciasPage() {
  return <AttendanceEmployeeList allowedRole='cajero' />;
}
