import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AccountService } from '@/lib/services/AccountService';

export const PATCH = withAppAuth(
  async (_request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const data = await AccountService.stopTimer(id, user.id.toString());
    return NextResponse.json({ success: true, message: 'Temporizador finalizado', data });
  }
);
