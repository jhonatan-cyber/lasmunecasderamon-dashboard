import { NextResponse } from 'next/server';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      all: searchParams.get('all') || undefined,
      caja_id: searchParams.get('caja_id') || undefined,
      limit: searchParams.get('limit') || undefined,
      page: searchParams.get('page') || undefined
    };
    const data = await ServiceRepository.getAll(params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting services', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const result = await ServiceRepository.create(body, user.id.toString());
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error creating service' }, { status: 400 });
  }
}
