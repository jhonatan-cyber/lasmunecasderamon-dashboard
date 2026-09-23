import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listDevices } from '@/lib/kiosk/deviceAuth';

export const GET = withRoute({ auth: true, access: 'administrator' }, async () => {
  return NextResponse.json(
    { success: true, data: await listDevices() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
