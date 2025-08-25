import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Configurar para que Next.js no parseé automáticamente el body
export const config = {
  api: {
    bodyParser: false
  }
};

// Función para generar email a partir del nick
const generateEmail = (nick: string): string => {
  return `${nick}@lasmuñecasderamon.com`;
};

// Función para generar password encriptado a partir del run
const generatePassword = async (run: string): Promise<string> => {
  return await bcrypt.hash(run, 10);
};

// Función simple para parsear FormData
const parseFormData = async (req: NextApiRequest): Promise<any> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
          reject(new Error('No boundary found'));
          return;
        }

        const parts = body.split(`--${boundary}`);
        const fields: any = {};

        parts.forEach(part => {
          if (part.trim() && !part.includes('--')) {
            const lines = part.split('\r\n');
            let fieldName = '';
            let fieldValue = '';

            lines.forEach(line => {
              if (line.startsWith('Content-Disposition: form-data; name=')) {
                fieldName = line.split('name=')[1].replace(/"/g, '');
              } else if (line.trim() && !line.startsWith('Content-')) {
                fieldValue = line.trim();
              }
            });

            if (fieldName) {
              fields[fieldName] = fieldValue;
            }
          }
        });

        resolve(fields);
      } catch (error) {
        reject(error);
      }
    });
  });
};

const mapUserFromDB = (row: any) => ({
  id: row.id_usuario,
  run: row.run,
  nick: row.nick,
  name: row.nombre,
  lastName: row.apellido,
  email: row.email,
  phone: row.telefono,
  address: row.direccion,
  maritalStatus: row.estado_civil,
  role: row.rol_nombre,
  roleId: row.id_rol,
  afp: row.afp,
  salary: row.sueldo,
  contributions: row.aporte,
  discount: row.descuento,
  status: row.estado,
  foto: row.foto,
  created_at: row.fecha_crea,
  updated_at: row.fecha_mod,
  deleted_at: row.fecha_baja
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { anfitrionas } = req.query;

    if (anfitrionas === '1') {
      // Obtener solo anfitrionas
      const anfitrionasData = (await query(
        `SELECT u.*, r.nombre as rol_nombre, r.id_rol FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.estado = 1 AND r.nombre = 'anfitriona'`
      )) as any[];

      return res.status(200).json({
        success: true,
        data: anfitrionasData.map(mapUserFromDB)
      });
    }

    // Obtener todos los usuarios (activos e inactivos)
    const usuarios = (await query(
      `SELECT u.*, r.nombre as rol_nombre, r.id_rol FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol`
    )) as any[];

    return res.status(200).json({
      success: true,
      data: usuarios.map(mapUserFromDB)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let fields: any = {};

    // Determinar si es FormData o JSON
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Es FormData, usar función personalizada para parsear

      fields = await parseFormData(req);
    } else {
      fields = req.body;
    }

    const {
      run,
      nick,
      nombre,
      apellido,
      direccion,
      telefono,
      estado_civil,
      afp,
      rol_id,
      sueldo,
      aporte,
      descuento
    } = fields;

    // Validaciones
    if (
      !run ||
      !nick ||
      !nombre ||
      !apellido ||
      !direccion ||
      !telefono ||
      !estado_civil ||
      !afp ||
      !rol_id ||
      !sueldo ||
      !aporte
    ) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar si el RUN ya existe
    const existingUser = (await query('SELECT id_usuario FROM usuarios WHERE run = ?', [
      run
    ])) as any[];

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El RUN ya está registrado'
      });
    }

    // Validar que no haya campos undefined antes de la consulta
    const params = [
      run,
      nick,
      nombre,
      apellido,
      direccion,
      telefono,
      estado_civil,
      afp,
      rol_id,
      sueldo,
      aporte,
      descuento || null // descuento es opcional
    ];

    // Verificar que no haya undefined en los parámetros
    const undefinedParams = params
      .map((param, index) => ({ param, index }))
      .filter(({ param }) => param === undefined);
    if (undefinedParams.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos undefined detectados: ${undefinedParams.map(p => p.index).join(', ')}`
      });
    }

    // Generar email y password automáticamente
    const email = generateEmail(nick);
    const password = await generatePassword(run);

    // Insertar nuevo usuario con email y password
    const result = await query(
      `INSERT INTO usuarios (
        run, nick, nombre, apellido, direccion, telefono, 
        estado_civil, afp, rol_id, sueldo, aporte, descuento, email, password, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [...params, email, password]
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      id: (result as any).insertId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let fields: any = {};
    let userId: string | number | undefined;

    // Determinar si es FormData o JSON
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Es FormData, usar función personalizada para parsear

      fields = await parseFormData(req);

      userId = fields.id;
    } else {
      // Es JSON

      fields = req.body;
      userId = req.query.id || req.body.id;
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario es requerido'
      });
    }

    // Convertir userId a número si es string
    const userIdNumber = parseInt(userId as string, 10);

    if (isNaN(userIdNumber)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario debe ser un número válido'
      });
    }

    // Extraer campos del FormData o JSON
    const run = fields.run;
    const nick = fields.nick;
    const nombre = fields.nombre;
    const apellido = fields.apellido;
    const direccion = fields.direccion;
    const telefono = fields.telefono;
    const estado_civil = fields.estado_civil;
    const afp = fields.afp;
    const rol_id = fields.rol_id;
    const sueldo = fields.sueldo;
    const aporte = fields.aporte;
    const descuento = fields.descuento;

    // Validar que todos los campos requeridos estén presentes
    const requiredFields = {
      run,
      nick,
      nombre,
      apellido,
      direccion,
      telefono,
      estado_civil,
      afp,
      rol_id,
      sueldo,
      aporte
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
      });
    }

    // Generar email y password automáticamente
    const email = generateEmail(nick);
    const password = await generatePassword(run);

    // Verificar si el usuario existe
    const existingUser = (await query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [
      userIdNumber
    ])) as any[];

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar usuario con email y password
    await query(
      `UPDATE usuarios SET 
        run = ?, nick = ?, nombre = ?, apellido = ?, 
        direccion = ?, telefono = ?, estado_civil = ?, 
        afp = ?, rol_id = ?, sueldo = ?, aporte = ?, descuento = ?,
        email = ?, password = ?
      WHERE id_usuario = ?`,
      [
        run,
        nick,
        nombre,
        apellido,
        direccion,
        telefono,
        estado_civil,
        afp,
        rol_id,
        sueldo,
        aporte,
        descuento || null, // descuento es opcional
        email,
        password,
        userIdNumber
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id, action } = req.query;

    if (!id || !action) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros id o action'
      });
    }

    let newStatus;
    if (action === 'activate') newStatus = 1;
    else if (action === 'deactivate') newStatus = 0;
    else {
      return res.status(400).json({
        success: false,
        message: 'Acción no válida. Use "activate" o "deactivate"'
      });
    }

    // Verificar si el usuario existe
    const existingUser = (await query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [
      id
    ])) as any[];

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar estado del usuario
    await query('UPDATE usuarios SET estado = ? WHERE id_usuario = ?', [newStatus, id]);

    return res.status(200).json({
      success: true,
      message: `Usuario ${action === 'activate' ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de usuario',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario es requerido'
      });
    }

    // Verificar si el usuario existe
    const existingUser = (await query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [
      id
    ])) as any[];

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar usuario permanentemente
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    case 'POST':
      return await handlePost(req, res);
    case 'PUT':
      return await handlePut(req, res);
    case 'PATCH':
      return await handlePatch(req, res);
    case 'DELETE':
      return await handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).json({ success: false, message: `Método ${req.method} no permitido` });
  }
}

export default withAuth(handler);

// Funciones exportadas para uso externo
export const activateUser = async (userId: number) => {
  try {
    await query('UPDATE usuarios SET estado = 1 WHERE id_usuario = ?', [userId]);
    return { success: true, message: 'Usuario activado exitosamente' };
  } catch (error) {
    return { success: false, message: 'Error al activar usuario' };
  }
};

export const deactivateUser = async (userId: number) => {
  try {
    await query('UPDATE usuarios SET estado = 0 WHERE id_usuario = ?', [userId]);
    return { success: true, message: 'Usuario desactivado exitosamente' };
  } catch (error) {
    return { success: false, message: 'Error al desactivar usuario' };
  }
};

export const deleteUser = async (userId: number) => {
  try {
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [userId]);
    return { success: true, message: 'Usuario eliminado exitosamente' };
  } catch (error) {
    return { success: false, message: 'Error al eliminar usuario' };
  }
};

export const getUserById = async (userId: number) => {
  try {
    const result = (await query(
      `
      SELECT u.*, r.nombre as rol_nombre, r.id_rol 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id_rol 
      WHERE u.id_usuario = ?
    `,
      [userId]
    )) as any[];

    if (result.length === 0) {
      return null;
    }

    return mapUserFromDB(result[0]);
  } catch (error) {
    return null;
  }
};
