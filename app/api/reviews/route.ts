import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';

export const POST = withPublicRoute(async (request: Request) => {
  const { nombre, email, telefono, rating, comentario, servicio } = await request.json();
  if (!nombre || !rating || !comentario)
    return NextResponse.json(
      { success: false, message: 'Faltan datos requeridos' },
      { status: 400 }
    );

  const adminWhatsApp = await getAdminWhatsApp();
  const message = `⭐ *NUEVA RESEÑA RECIBIDA*\n\n👤 *Cliente:* ${nombre}\n${email ? `📧 Email: ${email}\n` : ''}${telefono ? `📱 Teléfono: ${telefono}\n` : ''}\n⭐ *Calificación:* ${rating}/5 estrellas\n\n${servicio ? `🎯 *Servicio:* ${servicio}\n` : ''}\n💬 *Comentario:*\n${comentario}\n\n_Reseña pendiente de aprobación_`;
  const whatsappUrl = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({ success: true, whatsappUrl, message: 'Reseña enviada correctamente' });
});
