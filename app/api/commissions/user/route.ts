import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';

export const GET = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;

  const data = await CommissionRepository.list({ employeeId: user.id, status });
  return NextResponse.json({ success: true, data });
});
