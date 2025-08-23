import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middleware/auth";
import { query } from "@/lib/db";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const userId = parseInt(id as string);

  if (isNaN(userId)) {
    return res.status(400).json({ 
      success: false, 
      message: "ID de usuario inválido" 
    });
  }

  if (req.method === "GET") {
    try {
      // Obtener datos completos del usuario
      const users = await query(
        `SELECT u.*, r.nombre as role_name, r.id_rol 
         FROM usuarios u 
         LEFT JOIN roles r ON u.rol_id = r.id_rol 
         WHERE u.id_usuario = ?`,
        [userId]
      ) as any[];

      if (!Array.isArray(users) || users.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Usuario no encontrado" 
        });
      }

      const user = users[0];
      
             // Formatear los datos del usuario para el frontend
       const userData = {
         id: user.id_usuario,
         run: user.run,
         nick: user.nick,
         nombre: user.nombre,
         apellido: user.apellido,
         direccion: user.direccion,
         telefono: user.telefono,
         estado_civil: user.estado_civil,
         afp: user.afp,
         aporte: user.aporte,
         sueldo: user.sueldo,
         descuento: user.descuento,
         email: user.email,
         password: '', // No devolver la contraseña por seguridad
         rol_id: user.id_rol, // Se mantiene internamente para la base de datos
         foto: user.foto,
         role: user.role_name, // Nombre del rol para mostrar
         estado: user.estado,
         fecha_crea: user.fecha_crea
       };

      return res.status(200).json({ 
        success: true, 
        user: userData 
      });
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      return res.status(500).json({ 
        success: false, 
        message: "Error interno del servidor" 
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const {
        run, nick, nombre, apellido, direccion, telefono,
        estado_civil, afp, aporte, sueldo, descuento, email, password, rol_id
      } = req.body;

      // Validar campos requeridos
      const requiredFields = ['run', 'nick', 'nombre', 'apellido'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        });
      }

      // Verificar si el usuario existe
      const existingUser = (await query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [
        userId
      ])) as any[];

      if (existingUser.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Preparar la consulta de actualización
      let updateQuery = `
        UPDATE usuarios SET 
          run = ?, nick = ?, nombre = ?, apellido = ?, 
          direccion = ?, telefono = ?, estado_civil = ?, 
          afp = ?, aporte = ?, sueldo = ?, descuento = ?
      `;
      
      let params = [
        run, nick, nombre, apellido, direccion, telefono,
        estado_civil, afp, aporte, sueldo, descuento || null
      ];

      // Agregar rol_id si se proporciona
      if (rol_id) {
        updateQuery += ', rol_id = ?';
        params.push(rol_id);
      }

      // Agregar email si se proporciona
      if (email) {
        updateQuery += ', email = ?';
        params.push(email);
      }

      // Agregar password si se proporciona
      if (password) {
        updateQuery += ', password = ?';
        params.push(password);
      }

      updateQuery += ' WHERE id_usuario = ?';
      params.push(userId);

      await query(updateQuery, params);

      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    message: `Método ${req.method} no permitido` 
  });
}

export default withAuth(handler);
