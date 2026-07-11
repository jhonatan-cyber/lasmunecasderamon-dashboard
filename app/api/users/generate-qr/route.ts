import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { ValidationError } from '@/lib/errors/errors';
import { sendNotificationToAll } from '@/lib/api/sseService';
import crypto from 'crypto';

export const POST = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { userId } = await request.json();

  if (!userId) throw new ValidationError('userId es requerido');

  const users = await query<any[]>(
    'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1',
    [userId]
  );

  if (!users || users.length === 0)
    return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });

  const qr_token = crypto.randomBytes(16).toString('hex');
  await query('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [qr_token, userId]);

  sendNotificationToAll('qr_token_updated', { userId });

  return NextResponse.json({ success: true, qr_token });
});
