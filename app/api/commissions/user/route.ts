import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CommissionService } from '@/lib/services/CommissionService';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const data = await CommissionService.list({ employeeId: user.id, status });
    return NextResponse.json({ success: true, data });
  }
);
