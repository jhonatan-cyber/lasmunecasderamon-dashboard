import { NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export async function GET() {
  try {
    const stats = await StatsRepository.getCajaGeneralStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
