/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query, generateUUID } from '@/lib/db';
import { getUsersList, getAnfitrionas } from '@/lib/procedures';
import { apiWrapper } from '@/lib/api-wrapper';
import { UserCreateSchema, UserUpdateSchema } from '@/lib/schemas';
import bcrypt from 'bcryptjs';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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

const uploadDir = path.join(process.cwd(), 'public', 'img', 'users');

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const parseFormData = async (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
  ensureUploadDir();
  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024,
    filename: (_name, ext) => `user-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      
      const parsedFields: any = {};
      Object.keys(fields).forEach(key => {
        const val = fields[key];
        parsedFields[key] = Array.isArray(val) ? val[0] : val;
      });

      const parsedFiles: any = {};
      if (files.foto) {
        parsedFiles.foto = Array.isArray(files.foto) ? files.foto[0] : files.foto;
      }

      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const { anfitrionas } = req.query;
  const data = (anfitrionas === '1') ? await getAnfitrionas() : await getUsersList();
  
  return res.status(200).json({
    success: true,
    data: data.map(row => ({
      ...row,
      id: row.id_usuario,
      name: row.nombre,
      lastName: row.apellido,
      role: row.rol_nombre,
      roleId: row.id_rol,
      salary: row.sueldo,
      contributions: row.aporte,
      discount: row.descuento,
      status: row.estado,
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod,
    }))
  });
};

const handlePost = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const contentType = req.headers['content-type'] || '';
  let data: any = {};
  let fotoFilename: string = 'default.png';

  if (contentType.includes('multipart/form-data')) {
    const { fields, files } = await parseFormData(req);
    data = fields;
    if (files.foto) fotoFilename = path.basename(files.foto.filepath);
  } else {
    data = req.body;
  }

  // Validate with Zod
  const validated = UserCreateSchema.parse(data);
  
  // Check if RUN already exists
  const existing = await query<any[]>('SELECT id_usuario FROM usuarios WHERE run = ?', [validated.run]);
  if (existing.length > 0) {
    return res.status(400).json({ success: false, message: 'El RUN ya está registrado' });
  }

  const id = generateUUID();
  const email = `${validated.nick}@lasmuñecasderamon.com`;
  const password = await bcrypt.hash(validated.run, 10);

  await query(`
    INSERT INTO usuarios (
      id_usuario, run, nick, nombre, apellido, direccion, telefono, 
      estado_civil, afp, rol_id, sueldo, aporte, descuento, foto, email, password, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [
    id, validated.run, validated.nick, validated.nombre, validated.apellido, 
    validated.direccion || '', validated.telefono, validated.estado_civil || '', 
    validated.afp, validated.rol_id, validated.sueldo || 0, validated.aporte || 0, 
    validated.descuento || 0, fotoFilename, email, password
  ]);

  return res.status(201).json({ success: true, message: 'Usuario creado', id });
};

const handlePut = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const contentType = req.headers['content-type'] || '';
  let data: any = {};
  let fotoFilename: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const { fields, files } = await parseFormData(req);
    data = fields;
    if (files.foto) {
      fotoFilename = path.basename(files.foto.filepath);
    }
  } else {
    data = req.body;
  }

  const userId = req.query.id || data.id;
  if (!userId) return res.status(400).json({ success: false, message: 'ID requerido' });

  const validated = UserUpdateSchema.parse({ ...data, id: userId });

  const existing = await query<any[]>('SELECT foto FROM usuarios WHERE id_usuario = ?', [userId]);
  if (!existing.length) return res.status(404).json({ success: false, message: 'No encontrado' });

  const finalFoto = fotoFilename || data.foto || existing[0].foto || 'default.png';
  const email = validated.nick ? `${validated.nick}@lasmuñecasderamon.com` : undefined;
  const password = validated.run ? await bcrypt.hash(validated.run, 10) : undefined;

  await query(`
    UPDATE usuarios SET 
      run = COALESCE(?, run), nick = COALESCE(?, nick), 
      nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido), 
      direccion = COALESCE(?, direccion), telefono = COALESCE(?, telefono), 
      estado_civil = COALESCE(?, estado_civil), afp = COALESCE(?, afp), 
      rol_id = COALESCE(?, rol_id), sueldo = COALESCE(?, sueldo), 
      aporte = COALESCE(?, aporte), descuento = COALESCE(?, descuento),
      foto = ?, email = COALESCE(?, email), password = COALESCE(?, password)
    WHERE id_usuario = ?
  `, [
    validated.run || null, validated.nick || null, validated.nombre || null, validated.apellido || null,
    validated.direccion || null, validated.telefono || null, validated.estado_civil || null, validated.afp || null,
    validated.rol_id || null, validated.sueldo || null, validated.aporte || null, validated.descuento || null,
    finalFoto, email || null, password || null, userId
  ]);

  return res.status(200).json({ success: true, message: 'Actualizado' });
};

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, action } = req.query;
  const newStatus = action === 'activate' ? 1 : 0;
  await query('UPDATE usuarios SET estado = ? WHERE id_usuario = ?', [newStatus, id]);
  return res.status(200).json({ success: true, message: 'Estado actualizado' });
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  await query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
  return res.status(200).json({ success: true, message: 'Eliminado' });
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': return handleGet(req, res);
    case 'POST': return handlePost(req, res);
    case 'PUT': return handlePut(req, res);
    case 'PATCH': return handlePatch(req, res);
    case 'DELETE': return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).end();
  }
}

export default withAuth(apiWrapper(handler));
