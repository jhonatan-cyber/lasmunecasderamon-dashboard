import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { getAuth } from '@/lib/auth/auth-app';

function generateRandomCode(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const role = user.role.toLowerCase();
  if (role !== 'administrador' && role !== 'cajero') {
    return NextResponse.json({ success: false, message: 'Acceso denegado' }, { status: 403 });
  }

  // Verificar si hay códigos en la tabla
  let res = await query<any[]>('SELECT codigo FROM codigos ORDER BY fecha_crea DESC LIMIT 1');
  
  // Si no hay códigos, crear uno automáticamente
  if (res.length === 0) {
    const newCode = generateRandomCode(8);
    const newId = crypto.randomUUID();
    
    await query(
      'INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, NOW(), ?)',
      [newId, newCode, 1]
    );
    
    return NextResponse.json({ success: true, codigo: newCode, created: true });
  }

  return NextResponse.json({ success: true, codigo: res[0].codigo });
});
