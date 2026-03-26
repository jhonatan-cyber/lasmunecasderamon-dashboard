import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';

export const GET = withAppApiWrapper(async () => {
  const count = await ServiceRequestRepository.getPendingCount();
  return NextResponse.json({ success: true, count });
});
