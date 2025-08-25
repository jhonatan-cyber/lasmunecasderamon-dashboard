import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  try {
    // Verificar si ya hay usuarios registrados

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

    // Obtener el ID del rol administrador

    const adminRole = (await query(
      'SELECT id_rol FROM roles WHERE nombre = "Administrador"'
    )) as any[];

    if (adminRole.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No se encontró el rol de administrador'
      });
    }

    const rolId = adminRole[0].id_rol;

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = (await query(
      `INSERT INTO usuarios (
        nombre, apellido, email, password, rol_id, estado,
        run, direccion, telefono, estado_civil, afp, aporte, sueldo
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        apellido,
        emailSinCodificar,
        hashedPassword,
        rolId,
        '00000000-0', // run por defecto
        'Dirección por defecto', // direccion por defecto
        '00000000', // telefono por defecto
        'Soltero', // estado_civil por defecto
        'Afp', // afp por defecto
        0, // aporte por defecto
        0 // sueldo por defecto
      ]
    )) as any;



    return res.status(201).json({
      success: true,
      message: 'Usuario administrador creado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
