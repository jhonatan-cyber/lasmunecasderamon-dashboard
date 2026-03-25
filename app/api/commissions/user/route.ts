import { NextResponse } from 'next/server';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const data = await CommissionRepository.list({ 
      employeeId: user.id, 
      status 
    });
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}
