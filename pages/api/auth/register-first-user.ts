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
    console.log('🔍 [REGISTER] Iniciando registro del primer usuario...');
    console.log('📧 [REGISTER] Datos recibidos:', req.body);
    
    // Verificar si ya hay usuarios registrados
    console.log('🔍 [REGISTER] Verificando usuarios existentes...');
    const users = await query('SELECT COUNT(*) as count FROM usuarios WHERE estado = 1') as any[];
    const userCount = users[0]?.count || 0;
    console.log('📊 [REGISTER] Usuarios encontrados:', userCount);

    if (userCount > 0) {
      console.log('❌ [REGISTER] Ya existen usuarios registrados');
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
    const existingUser = await query('SELECT id_usuario FROM usuarios WHERE email = ?', [emailSinCodificar]) as any[];
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Obtener el ID del rol administrador
    console.log('🔍 [REGISTER] Buscando rol de administrador...');
    const adminRole = await query('SELECT id_rol FROM roles WHERE nombre = "Administrador"') as any[];
    console.log('📊 [REGISTER] Rol encontrado:', adminRole);
    
    if (adminRole.length === 0) {
      console.error('❌ [REGISTER] No se encontró el rol de administrador');
      return res.status(500).json({
        success: false,
        message: 'No se encontró el rol de administrador'
      });
    }

    const rolId = adminRole[0].id_rol;
    console.log('✅ [REGISTER] Rol ID:', rolId);

    // Encriptar la contraseña
    console.log('🔐 [REGISTER] Encriptando contraseña...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('✅ [REGISTER] Contraseña encriptada');

    // Crear el usuario administrador
    console.log('🔍 [REGISTER] Insertando usuario en la base de datos...');
    console.log('📋 [REGISTER] Datos a insertar:', { nombre, apellido, email: emailSinCodificar, rolId });
    
    const result = await query(
      `INSERT INTO usuarios (
        nombre, apellido, email, password, rol_id, estado,
        run, direccion, telefono, estado_civil, afp, aporte, sueldo
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, apellido, emailSinCodificar, hashedPassword, rolId,
        '00000000-0', // run por defecto
        'Dirección por defecto', // direccion por defecto
        '00000000', // telefono por defecto
        'Soltero', // estado_civil por defecto
        'AFP por defecto', // afp por defecto
        0, // aporte por defecto
        0 // sueldo por defecto
      ]
    ) as any;

    console.log('✅ [REGISTER] Usuario creado exitosamente:', { email: emailSinCodificar, userId: result.insertId });

    return res.status(201).json({
      success: true,
      message: 'Usuario administrador creado exitosamente',
      userId: result.insertId
    });

  } catch (error) {
    console.error('❌ [REGISTER] Error creando primer usuario:', error);
    console.error('❌ [REGISTER] Detalles del error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
