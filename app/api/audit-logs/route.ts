import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuditService } from '@/lib/services/AuditService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get('limit') || '50');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;
  const data = await AuditService.getLatest(limit);
  return NextResponse.json({ success: true, data });
});
