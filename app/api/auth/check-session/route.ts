import { NextResponse } from 'next/server';
import { AuthRepository } from '@/lib/repositories/AuthRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No session' }, { status: 401 });

    const result = await AuthRepository.checkSession(userAuth.id.toString());
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
