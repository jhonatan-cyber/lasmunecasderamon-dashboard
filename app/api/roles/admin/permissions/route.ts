import { NextResponse } from 'next/server';
import { RoleRepository } from '@/lib/repositories/RoleRepository';

export async function GET() {
  try {
    const data = await RoleRepository.getAdminPermissions();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting permissions', error: error.message }, { status: 500 });
  }
}
