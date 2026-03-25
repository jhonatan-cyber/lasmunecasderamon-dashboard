import { NextResponse } from 'next/server';
import { RoleRepository } from '@/lib/repositories/RoleRepository';

export async function GET() {
  try {
    const data = await RoleRepository.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting roles', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = await RoleRepository.create(body);
    return NextResponse.json({ success: true, message: 'Role created', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error creating role', error: error.message }, { status: 400 });
  }
}
