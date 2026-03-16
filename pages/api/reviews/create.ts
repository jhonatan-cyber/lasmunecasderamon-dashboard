import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { nombre, email, telefono, rating, comentario, servicio } = req.body;

    // Validar datos requeridos
    if (!nombre || !rating || !comentario) {
      return res.status(400).json({ message: 'Faltan datos requeridos' });
    }

    // Crear mensaje para WhatsApp
    const mensajeWhatsApp = `⭐ *NUEVA RESEÑA RECIBIDA*

👤 *Cliente:* ${nombre}
${email ? `📧 Email: ${email}` : ''}
${telefono ? `📱 Teléfono: ${telefono}` : ''}

⭐ *Calificación:* ${rating}/5 estrellas

${servicio ? `🎯 *Servicio:* ${servicio}` : ''}

💬 *Comentario:*
${comentario}

_Reseña pendiente de aprobación_`;

    // Crear URL de WhatsApp
    const whatsappUrl = `https://wa.me/59178491899?text=${encodeURIComponent(mensajeWhatsApp)}`;

    return res.status(200).json({
      success: true,
      whatsappUrl,
      message: 'Reseña enviada correctamente. El administrador la revisará.'
    });

  } catch (error) {
    console.error('Error creando review:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
