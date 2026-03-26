import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';

export const POST = withAppApiWrapper(async (request: Request) => {
  const { nombre, email, telefono, rating, comentario, servicio } = await request.json();
  if (!nombre || !rating || !comentario)
    return NextResponse.json(
      { success: false, message: 'Faltan datos requeridos' },
      { status: 400 }
    );

  const message = `⭐ *NUEVA RESEÑA RECIBIDA*\n\n👤 *Cliente:* ${nombre}\n${email ? `📧 Email: ${email}\n` : ''}${telefono ? `📱 Teléfono: ${telefono}\n` : ''}\n⭐ *Calificación:* ${rating}/5 estrellas\n\n${servicio ? `🎯 *Servicio:* ${servicio}\n` : ''}\n💬 *Comentario:*\n${comentario}\n\n_Reseña pendiente de aprobación_`;
  const whatsappUrl = `https://wa.me/59178491899?text=${encodeURIComponent(message)}`;

  return NextResponse.json({ success: true, whatsappUrl, message: 'Reseña enviada correctamente' });
});
