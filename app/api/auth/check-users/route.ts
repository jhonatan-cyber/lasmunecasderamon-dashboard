import { NextResponse } from 'next/server';
import { AuthRepository } from '@/lib/repositories/AuthRepository';

export async function GET() {
  try {
    const hasUsers = await AuthRepository.checkUsers();
    return NextResponse.json({ success: true, hasUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno', error: error.message }, { status: 500 });
  }
}
