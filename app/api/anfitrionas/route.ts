import { NextResponse } from 'next/server';
import { UserRepository } from '@/lib/repositories/UserRepository';

export async function GET() {
  try {
    const data = await UserRepository.getAnfitrionasActivas();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting anfitrionas', error: error.message }, { status: 500 });
  }
}
