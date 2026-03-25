import { NextResponse } from 'next/server';
import { AuthRepository } from '@/lib/repositories/AuthRepository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await AuthRepository.registerFirstUser(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error interno' }, { status: 400 });
  }
}
