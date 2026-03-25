import { NextResponse } from 'next/server';
import { ServiceRequestRepository } from '@/lib/repositories/ServiceRequestRepository';

export async function GET() {
  try {
    const count = await ServiceRequestRepository.getPendingCount();
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
