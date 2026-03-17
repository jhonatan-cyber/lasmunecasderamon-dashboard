import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query, generateUUID } from '@/lib/db';
import { getSystemTimezone } from '@/lib/timezoneService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({ success: false, message: 'Código QR no proporcionado' });
    }

    const currentUser = getCurrentUser(req);
    let targetUser: any = null;
    let isSystemCode = false;

    // 1. Intentar buscar como QR individual
    const users = await query(
      'SELECT id_usuario, nombre, apellido, rol_id FROM usuarios WHERE qr_token = ? AND estado = 1',
      [qr_data]
    ) as any[];

    if (Array.isArray(users) && users.length > 0) {
      targetUser = users[0];
    } else {
      // 2. Si no es un QR individual, verificar si es el "Código de Asistencia" compartido (Header)
      const systemCodes = await query(
        'SELECT codigo FROM codigos ORDER BY fecha_crea DESC LIMIT 1'
      ) as any[];

      if (Array.isArray(systemCodes) && systemCodes.length > 0 && systemCodes[0].codigo === qr_data) {
        // En este caso, el usuario que registra es el mismo que está autenticado
        if (!currentUser) {
          return res.status(401).json({ success: false, message: 'Sesión no válida para este tipo de registro' });
        }
        
        const loggedUsers = await query(
          'SELECT id_usuario, nombre, apellido, rol_id FROM usuarios WHERE id_usuario = ? AND estado = 1',
          [currentUser.id]
        ) as any[];

        if (loggedUsers.length > 0) {
          targetUser = loggedUsers[0];
          isSystemCode = true;
        }
      }
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Código inválido, expirado o ya utilizado' });
    }

    const userId = targetUser.id_usuario;
    const crypto = await import('crypto');

    // 3. Regenerar el secreto utilizado inmediatamente (Sola lectura y cambia)
    if (isSystemCode) {
      // Regenerar código compartido de 4-6 dígitos
      const newSystemCode = Math.floor(1000 + Math.random() * 9000).toString();
      await query('DELETE FROM codigos');
      await query('INSERT INTO codigos (codigo) VALUES (?)', [newSystemCode]);
    } else {
      // Regenerar token QR individual
      const newToken = crypto.randomBytes(16).toString('hex');
      await query('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [newToken, userId]);
    }

    // 4. Verificar hora actual — después de las 23:00 no se registra asistencia
    const tz = getSystemTimezone();
    const horaLocal = parseInt(
      new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date())
    );

    if (horaLocal >= 23) {
      return res.status(200).json({
        success: false,
        message: 'El horario de registro de asistencia ya cerró (después de las 23:00).'
      });
    }

    // 5. Verificar si ya tiene asistencia hoy
    const asistenciaExistente = await query(
      'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = CURDATE()',
      [userId]
    ) as any[];

    if (Array.isArray(asistenciaExistente) && asistenciaExistente.length > 0) {
      return res.status(200).json({ 
        success: true, 
        message: `El código era válido, pero ${targetUser.nombre} ya tiene asistencia registrada hoy. El código ha sido renovado.`,
        alreadyRegistered: true
      });
    }

    // 5. Obtener fecha y hora actual (Chile/Bolivia)
    const ahora = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', { 
      timeZone: getSystemTimezone(), 
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    const parts = formatter.formatToParts(ahora);
    const getVal = (type: string) => parts.find(p => p.type === type)?.value;
    
    const fechaActual = `${getVal('year')}-${getVal('month')}-${getVal('day')}`;
    const horaActual = `${getVal('hour')}:${getVal('minute')}:${getVal('second')}`;

    // 7. Marcar en_local = 1 en el login activo del usuario
    await query(
      'UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: `Asistencia registrada con éxito para ${targetUser.nombre} ${targetUser.apellido}. El código ha sido renovado.`,
      user: {
        id: userId,
        nombre: targetUser.nombre,
        apellido: targetUser.apellido
      }
    });

  } catch (error) {
    console.error('Error al registrar asistencia por QR:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Podríamos restringir quién puede usar este endpoint (ej: solo Anfitrionas/Cajeros)
// Pero si el QR es secreto y único para cada usuario, que un usuario "escanee a otro"
// podría ser una forma de apoyo. Sin embargo, por seguridad, mejor restringir.
export default withAuth(handler);
