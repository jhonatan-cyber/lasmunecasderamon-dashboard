import { NextResponse } from 'next/server';
import { PermissionRepository } from '@/lib/repositories/PermissionRepository';

export async function GET() {
  try {
    const data = await PermissionRepository.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting permissions', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = await PermissionRepository.create(body);
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error creating permission', error: error.message }, { status: 400 });
  }
}
