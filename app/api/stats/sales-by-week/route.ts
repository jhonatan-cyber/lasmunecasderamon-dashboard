import { NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const data = await StatsRepository.getSalesByWeek(offset);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting sales by week', error: error.message }, { status: 500 });
  }
}
