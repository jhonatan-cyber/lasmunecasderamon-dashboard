import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';
import { query } from '@/lib/database/db';
import crypto from 'crypto';

// POST sin verificación de permisos - solo requiere autenticación
export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
  }

  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'userId es requerido' }, { status: 400 });
  }

  const users = await query<any[]>(
    'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1',
    [userId]
  );

  if (!users || users.length === 0) {
    return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
  }

  const qr_token = crypto.randomBytes(16).toString('hex');

  await query('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [qr_token, userId]);

  return NextResponse.json({ success: true, qr_token });
});
