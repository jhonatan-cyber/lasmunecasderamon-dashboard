/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  try {
    // Verificar si ya hay usuarios activos registrados
    const users = (await query('SELECT COUNT(*) as count FROM usuarios WHERE estado = 1')) as any[];
    const userCount = users[0]?.count || 0;
    if (userCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Ya existen usuarios registrados. No se puede crear el primer usuario.'
      });
    }

    const { nombre, apellido, email, password } = req.body;

    // Validaciones
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Mantener el email tal como se escribió sin codificar
    const emailSinCodificar = email.trim();

    // Verificar que el email no esté en uso
    const existingUser = (await query('SELECT id_usuario FROM usuarios WHERE email = ?', [
      emailSinCodificar
    ])) as any[];
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Verificar si existe al menos un rol
    const roles = (await query('SELECT COUNT(*) as count FROM roles')) as any[];
    const roleCount = roles[0]?.count || 0;

    let rolId: string;

    if (roleCount === 0) {
      // Si no hay roles, crear automáticamente el rol Administrador con un UUID
      const adminRoleId = generateUUID();
      await query(
        'INSERT INTO roles (id_rol, nombre, descripcion, estado) VALUES (?, ?, ?, 1)',
        [adminRoleId, 'Administrador', 'Rol administrador creado automáticamente', 1]
      );
      rolId = adminRoleId;
    } else {
      // Obtener el ID del rol administrador si ya existe
      const adminRole = (await query(
        'SELECT id_rol FROM roles WHERE nombre = "Administrador" LIMIT 1'
      )) as any[];

      if (adminRole.length === 0) {
        const adminRoleId = generateUUID();
        await query(
          'INSERT INTO roles (id_rol, nombre, descripcion, estado) VALUES (?, ?, ?, 1)',
          [adminRoleId, 'Administrador', 'Rol administrador creado automáticamente', 1]
        );
        rolId = adminRoleId;
      } else {
        rolId = adminRole[0].id_rol;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generar UUID explícito para el primer usuario
    const userId = generateUUID();

    await query(
      `INSERT INTO usuarios (
        id_usuario, nombre, apellido, email, password, rol_id, estado,
        run, direccion, telefono, estado_civil, afp, aporte, sueldo
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        nombre,
        apellido,
        emailSinCodificar,
        hashedPassword,
        rolId,
        '00000000-0', 
        'Dirección por defecto', 
        '00000000', 
        'Soltero', 
        'Afp', 
        0, 
        0 
      ]
    );
    return res.status(201).json({
      success: true,
      message: 'Usuario administrador creado exitosamente',
      userId
    });
  } catch (error) {
    console.error('[register-first-user] Error al crear primer usuario:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

