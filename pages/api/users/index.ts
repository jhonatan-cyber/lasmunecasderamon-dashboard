/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query, generateUUID } from '@/lib/db';
import bcrypt from 'bcryptjs';
import formidable, { type Fields, type Files, type File as FormidableFile } from 'formidable';
import fs from 'fs';
import path from 'path';

// Configurar para que Next.js no parseé automáticamente el body
export const config = {
  api: {
    bodyParser: false
  }
};

type AuthenticatedRequest = NextApiRequest & {
  user?: {
    id?: string;
    role?: string;
    roleId?: string | number;
    nick?: string;
  };
};

type PermissionRow = {
  has_permission: number;
};

type UserRow = {
  id_usuario: string;
  run: string;
  nick: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  estado_civil: string;
  rol_nombre: string;
  id_rol: number;
  afp: string;
  sueldo: number;
  aporte: number;
  descuento: number | null;
  estado: number;
  foto: string | null;
  qr_token: string | null;
  fecha_crea: string;
  fecha_mod: string | null;
  fecha_baja: string | null;
  en_servicio?: number;
  habitacion_nombre?: string | null;
};

type UserFields = Record<string, string | undefined>;
type ParsedFiles = {
  foto?: FormidableFile;
};

// Función para verificar permisos
const checkPermission = async (
  req: AuthenticatedRequest,
  module: string,
  action: string
): Promise<boolean> => {
  try {
    // Obtener el usuario actual desde la sesión o token
    const user = req.user;
    
    // Si es administrador, tiene acceso a todo
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }

    // Obtener el rol del usuario
    if (!user?.roleId) {
      return false;
    }

    // Consultar si el usuario tiene el permiso específico
    const permissionCheck = (await query(`
      SELECT COUNT(*) as has_permission 
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.module = ? AND p.action = ?
    `, [user.roleId, module, action])) as PermissionRow[];

    const hasPermission = permissionCheck[0]?.has_permission > 0;
    
    return hasPermission;
  } catch (error) {
    console.error('[checkPermission API] Error:', error);
    return false;
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

// Función para parsear FormData con archivos usando formidable
const parseFormData = async (
  req: NextApiRequest
): Promise<{ fields: UserFields; files: ParsedFiles }> => {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(process.cwd(), 'public', 'img', 'users');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filename: (_name, ext) => {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return `user-${uniqueSuffix}${ext}`;
      }
    });

    form.parse(req, (err, fields: Fields, files: Files) => {
      if (err) {
        console.error('Error parsing form:', err);
        reject(err);
        return;
      }

      // Convertir arrays de formidable a valores simples
      const parsedFields: UserFields = {};
      Object.keys(fields).forEach(key => {
        const value = fields[key];
        parsedFields[key] =
          typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
      });

      const parsedFiles: ParsedFiles = {};
      if (files.foto) {
        parsedFiles.foto = Array.isArray(files.foto) ? files.foto[0] : files.foto;
      }

      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });
};

const mapUserFromDB = (row: UserRow) => ({
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
  qr_token: row.qr_token,
  created_at: row.fecha_crea,
  updated_at: row.fecha_mod,
  deleted_at: row.fecha_baja
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { anfitrionas } = req.query;

    if (anfitrionas === '1') {
      // Obtener todas las anfitrionas (sin filtrar por estado)
      const anfitrionasData = (await query(
        `SELECT u.*, r.nombre as rol_nombre, r.id_rol, (SELECT COUNT(*) FROM servicios s INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id WHERE ds.usuario_id = u.id_usuario AND s.estado = 2) as en_servicio, (SELECT h.nombre FROM servicios s INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id INNER JOIN habitaciones h ON s.habitacion_id = h.id_habitacion WHERE ds.usuario_id = u.id_usuario AND s.estado = 2 LIMIT 1) as habitacion_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE r.nombre = 'anfitriona'`
      )) as UserRow[];

      return res.status(200).json({
        success: true,
        data: anfitrionasData.map((row) => ({ ...mapUserFromDB(row), estado_servicio: (row.en_servicio || 0) > 0 ? 1 : 0, habitacion_nombre: row.habitacion_nombre || null }))
      });
    }

    // Obtener todos los usuarios (activos e inactivos)
    const usuarios = (await query(
      `SELECT u.*, r.nombre as rol_nombre, r.id_rol FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol`
    )) as UserRow[];

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
    // Verificar permiso para crear usuarios
    const hasPermission = await checkPermission(req, 'users', 'create');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear usuarios'
      });
    }

    let fields: UserFields = {};
    let fotoFilename: string | null = null;

    // Determinar si es FormData o JSON
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Es FormData, usar formidable para parsear
      const { fields: parsedFields, files } = await parseFormData(req);
      fields = parsedFields;

      // Procesar archivo de foto si existe
      if (files.foto) {
        const fotoFile = Array.isArray(files.foto) ? files.foto[0] : files.foto;
        if (fotoFile && fotoFile.filepath) {
          // Obtener solo el nombre del archivo
          fotoFilename = path.basename(fotoFile.filepath);
          console.log('📸 Foto guardada:', fotoFilename);
        }
      }
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
    ])) as Array<Pick<UserRow, 'id_usuario'>>;

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
      descuento || null, // descuento es opcional
      fotoFilename || 'default.png' // usar foto por defecto si no hay foto
    ];

    // Verificar que no haya undefined en los parámetros (excepto foto que puede ser null)
    const undefinedParams = params
      .slice(0, -1) // Excluir foto de la validación
      .map((param, index) => ({ param, index }))
      .filter(({ param }) => param === undefined);
    if (undefinedParams.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos undefined detectados: ${undefinedParams.map(p => p.index).join(', ')}`
      });
    }

    // Generar email y password automáticamente
    const email = generateEmail(nick!);
    const password = await generatePassword(run!);

    const id = generateUUID();
    // Insertar nuevo usuario con email, password y foto
    await query(
      `INSERT INTO usuarios (
        id_usuario, run, nick, nombre, apellido, direccion, telefono, 
        estado_civil, afp, rol_id, sueldo, aporte, descuento, foto, email, password, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, ...params, email, password]
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      id: id
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Verificar permiso para editar usuarios
    const hasPermission = await checkPermission(req, 'users', 'edit');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar usuarios'
      });
    }

    let fields: UserFields = {};
    let userId: string | number | undefined;
    let fotoFilename: string | null = null;

    // Determinar si es FormData o JSON
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Es FormData, usar formidable para parsear
      const { fields: parsedFields, files } = await parseFormData(req);
      fields = parsedFields;
      userId = fields.id;

      // Procesar archivo de foto si existe
      if (files.foto) {
        const fotoFile = Array.isArray(files.foto) ? files.foto[0] : files.foto;
        if (fotoFile && fotoFile.filepath) {
          // Obtener solo el nombre del archivo
          fotoFilename = path.basename(fotoFile.filepath);
          console.log('📸 Foto actualizada:', fotoFilename);

          // Eliminar foto anterior si existe
          if (fields.foto_anterior) {
            const oldPhotoPath = path.join(process.cwd(), 'public', 'img', 'users', fields.foto_anterior);
            if (fs.existsSync(oldPhotoPath)) {
              try {
                fs.unlinkSync(oldPhotoPath);
                console.log('🗑️ Foto anterior eliminada:', fields.foto_anterior);
              } catch (err) {
                console.error('Error eliminando foto anterior:', err);
              }
            }
          }
        }
      }
    } else {
      // Es JSON
      fields = req.body;
      userId = req.query.id || req.body.id;
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

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario es requerido'
      });
    }

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
      .filter(([_key, value]) => !value || value === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
      });
    }

    // Generar email y password automáticamente
    const email = generateEmail(nick!);
    const password = await generatePassword(run!);

    // Verificar si el usuario existe
    const existingUser = (await query('SELECT id_usuario, foto FROM usuarios WHERE id_usuario = ?', [
      userId
    ])) as Array<Pick<UserRow, 'id_usuario' | 'foto'>>;

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si no hay nueva foto, mantener la foto anterior o usar default
    const finalFoto = fotoFilename || existingUser[0].foto || 'default.png';

    // Actualizar usuario con email, password y foto
    await query(
      `UPDATE usuarios SET 
        run = ?, nick = ?, nombre = ?, apellido = ?, 
        direccion = ?, telefono = ?, estado_civil = ?, 
        afp = ?, rol_id = ?, sueldo = ?, aporte = ?, descuento = ?,
        foto = ?, email = ?, password = ?
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
        finalFoto,
        email,
        password,
        userId
      ]
    );

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

    let hasPermission = false;
    let actionMessage = '';

    // Verificar permisos según la acción
    if (action === 'activate') {
      hasPermission = await checkPermission(req, 'users', 'activate');
      actionMessage = 'activar';
    } else if (action === 'deactivate') {
      hasPermission = await checkPermission(req, 'users', 'deactivate');
      actionMessage = 'desactivar';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Acción no válida. Use "activate" o "deactivate"'
      });
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `No tienes permisos para ${actionMessage} usuarios`
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
    ])) as Array<Pick<UserRow, 'id_usuario'>>;

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
    // Verificar permiso para eliminar usuarios
    const hasPermission = await checkPermission(req, 'users', 'delete');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar usuarios'
      });
    }

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
    ])) as Array<Pick<UserRow, 'id_usuario'>>;
    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
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
export const activateUser = async (userId: string) => {
  try {
    await query('UPDATE usuarios SET estado = 1 WHERE id_usuario = ?', [userId]);
    return { success: true, message: 'Usuario activado exitosamente' };
  } catch (error) {
    return { success: false, message: 'Error al activar usuario' };
  }
};

export const deactivateUser = async (userId: string) => {
  try {
    await query('UPDATE usuarios SET estado = 0 WHERE id_usuario = ?', [userId]);
    return { success: true, message: 'Usuario desactivado exitosamente' };
  } catch (error) {
    return { success: false, message: 'Error al desactivar usuario' };
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [userId]);
    return { success: true, message: 'Usuario eliminado exitosamente' };
  } catch (error) {
    return { success: false, message: 'Error al eliminar usuario' };
  }
};

export const getUserById = async (userId: string) => {
  try {
    const result = (await query(
      `
      SELECT u.*, r.nombre as rol_nombre, r.id_rol 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id_rol 
      WHERE u.id_usuario = ?
    `,
      [userId]
    )) as UserRow[];

    if (result.length === 0) {
      return null;
    }

    return mapUserFromDB(result[0]);
  } catch (error) {
    return null;
  }
};
