import { NextResponse } from 'next/server';
import { UserRepository } from '@/lib/repositories/UserRepository';

export async function GET() {
  try {
    const data = await UserRepository.getAvailableAnfitrionas();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting available anfitrionas', error: error.message }, { status: 500 });
  }
}
