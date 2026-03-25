import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No session' }, { status: 401 });

    return NextResponse.json({ success: true, user: userAuth });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
