import { NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export async function GET() {
  try {
    const data = await StatsRepository.getLoggedUsers();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting logged users', error: error.message }, { status: 500 });
  }
}
