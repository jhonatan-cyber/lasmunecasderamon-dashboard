/* eslint-disable @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { apiWrapper } from '@/lib/api-wrapper';
import { ProductSchema } from '@/lib/schemas';
import { getProductsList, checkProductExists } from '@/lib/procedures';
import fs from 'fs/promises';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false
  }
};

const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');

const parseFormData = async (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
  const form = formidable({
    uploadDir: PRODUCT_UPLOAD_DIR,
    keepExtensions: true,
    filename: (name, ext) => `product_${Date.now()}${ext}`
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      const simpleFields: any = {};
      for (const key in fields) simpleFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      resolve({ fields: simpleFields, files });
    });
  });
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const { category_id } = req.query;
  const data = await getProductsList(category_id as string);
  return res.status(200).json({ success: true, data });
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  await fs.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
  const { fields, files } = await parseFormData(req);
  
  const validated = ProductSchema.parse(fields);
  const exists = await checkProductExists(validated.code, validated.name, validated.category_id);
  if (exists) return res.status(400).json({ success: false, message: 'Producto ya existe (código o nombre duplicado)' });

  const id = generateUUID();
  const foto = files?.foto ? path.basename((Array.isArray(files.foto) ? files.foto[0] : files.foto).filepath) : 'default.png';

  await query(
    'INSERT INTO productos (id_producto, codigo, nombre, categoria_id, precio, comision, descripcion, estado, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, validated.code, validated.name, validated.category_id, validated.price, validated.commission, validated.description || '', validated.status, foto]
  );

  return res.status(201).json({ success: true, message: 'Producto creado', id });
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const { fields, files } = await parseFormData(req);
  const validated = ProductSchema.parse(fields);

  const exists = await checkProductExists(validated.code, validated.name, validated.category_id, id as string);
  if (exists) return res.status(400).json({ success: false, message: 'Duplicado detectado' });

  let foto = fields.foto; // Keep current if no new file
  if (files?.foto) {
    foto = path.basename((Array.isArray(files.foto) ? files.foto[0] : files.foto).filepath);
  }

  await query(
    'UPDATE productos SET codigo = ?, nombre = ?, categoria_id = ?, precio = ?, comision = ?, descripcion = ?, estado = ?, foto = ? WHERE id_producto = ?',
    [validated.code, validated.name, validated.category_id, validated.price, validated.commission, validated.description || '', validated.status, foto, id]
  );

  return res.status(200).json({ success: true, message: 'Producto actualizado' });
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  await query('DELETE FROM productos WHERE id_producto = ?', [id]);
  return res.status(200).json({ success: true, message: 'Producto eliminado' });
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': return handleGet(req, res);
    case 'POST': return handlePost(req, res);
    case 'PUT': return handlePut(req, res);
    case 'DELETE': return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end();
  }
}

export default apiWrapper(handler);
