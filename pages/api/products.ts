import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false
  }
};

const productSchema = z.object({
  code: z.string().min(1, 'Código requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  category_id: z.preprocess(v => Number(v), z.number()),
  price: z.preprocess(v => Number(v), z.number()),
  commission: z.preprocess(v => Number(v), z.number()),
  description: z.string().optional(),
  status: z.preprocess(v => Number(v), z.number()),
  foto: z.string().optional()
});

const mapProductFromDB = (row: any) => ({
  id: row.id_producto,
  code: row.codigo,
  name: row.nombre,
  category_id: row.categoria_id,
  display_order: row.display_order,
  price: row.precio,
  commission: row.comision,
  description: row.descripcion,
  fecha_crea: row.fecha_crea,
  status: row.estado,
  foto: row.foto,
  categoria: row.categoria // Agregar el campo categoria
});

const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Asegurarse de que el directorio de carga existe (igual que en usuarios)
(async () => {
  try {
    await fs.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error al crear directorio de carga:', error);
  }
})();

async function validateAndProcessImage(files: any): Promise<string | null> {
  try {
    if (!files?.foto) {
      console.log('No se encontró archivo foto');
      return null;
    }

    const file = Array.isArray(files.foto) ? files.foto[0] : files.foto;
    
    console.log('Procesando imagen:', {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
      filepath: file.filepath
    });

    // Validar tipo de archivo
    if (file.mimetype && !ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new Error('Solo se permiten archivos de imagen (JPG, PNG, GIF)');
    }

    // Validar tamaño
    if (file.size && file.size > MAX_FILE_SIZE) {
      throw new Error('La imagen no puede superar los 5MB');
    }

    // El archivo ya está guardado por formidable, solo necesitamos obtener el nombre
    const fileName = path.basename(file.filepath);
    
    console.log('✅ Imagen procesada correctamente:', fileName);
    
    return fileName;
  } catch (error) {
    console.error('❌ Error al procesar imagen:', error);
    throw new Error(
      `Error al procesar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

async function parseFormData(
  req: NextApiRequest
): Promise<{ fields: Record<string, string>; files: any }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      uploadDir: PRODUCT_UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      filename: (name, ext, part) => {
        return `product_${Date.now()}${ext}`;
      }
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error al parsear form:', err);
        return reject(err);
      }

      // Convertir fields a formato simple
      const simpleFields: Record<string, string> = {};
      for (const key in fields) {
        const value = fields[key];
        simpleFields[key] = Array.isArray(value) ? value[0] : value || '';
      }

      console.log('✅ Formulario parseado correctamente');
      console.log('Campos:', Object.keys(simpleFields));
      console.log('Archivos:', Object.keys(files));

      resolve({ fields: simpleFields, files });
    });
  });
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { category_id } = req.query;
    let results;
    if (category_id) {
      results = await query(
        `
        SELECT 
          P.*,
          C.nombre AS categoria
        FROM productos P
        INNER JOIN categorias C ON C.id_categoria = P.categoria_id
        WHERE P.categoria_id = ?
        ORDER BY P.display_order ASC, P.id_producto ASC
      `,
        [category_id]
      );
    } else {
      results = await query(
        `
        SELECT 
          P.*,
          C.nombre AS categoria
        FROM productos P
        INNER JOIN categorias C ON C.id_categoria = P.categoria_id
        ORDER BY P.categoria_id ASC, P.display_order ASC, P.id_producto ASC
      `,
        []
      );
    }
    const products = Array.isArray(results) ? results.map(mapProductFromDB) : [];
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener productos', error });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  let uploadedFile: any = null;

  try {
    // Verificar que el directorio existe antes de procesar
    try {
      await fs.access(PRODUCT_UPLOAD_DIR);
    } catch (error) {
      await fs.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
    }

    const { fields, files } = await parseFormData(req);
    uploadedFile = files?.foto;

    // Validar que todos los campos requeridos estén presentes
    const requiredFields = ['code', 'name', 'category_id', 'price', 'commission'];
    const missingFields = requiredFields.filter(field => !fields[field] || fields[field] === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Faltan campos requeridos: ${missingFields.join(', ')}`
      });
    }

    // Validar duplicado por código
    const dup = await query('SELECT id_producto FROM productos WHERE codigo = ?', [fields.code]);
    if (Array.isArray(dup) && dup.length) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese código'
      });
    }

    // Validar duplicado por nombre en la misma categoría
    const dupName = await query(
      'SELECT id_producto FROM productos WHERE LOWER(nombre) = LOWER(?) AND categoria_id = ?',
      [fields.name, fields.category_id]
    );
    if (Array.isArray(dupName) && dupName.length) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese nombre en esta categoría'
      });
    }

    // Validar datos
    const parse = productSchema.safeParse({
      ...fields,
      status: fields.status ?? 1
    });
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: parse.error.issues
      });
    }

    // Procesar imagen con mejor manejo de errores
    let foto = 'default.png';
    try {
      if (files && Object.keys(files).length > 0) {
        const processedImage = await validateAndProcessImage(files);
        if (processedImage) {
          foto = processedImage;
        }
      }
    } catch (imageError) {
      console.error('Error al procesar imagen:', imageError);
    }

    const result: any = await query(
      'INSERT INTO productos (codigo, nombre, categoria_id, precio, comision, descripcion, estado, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        fields.code,
        fields.name,
        fields.category_id,
        fields.price,
        fields.commission,
        fields.description || '',
        fields.status ?? 1,
        foto
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Producto creado correctamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    
    // Limpiar archivo subido si hay error
    if (uploadedFile) {
      try {
        const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
        if (file?.filepath) {
          await fs.unlink(file.filepath).catch(() => {});
        }
      } catch (cleanupError) {
        console.error('Error al limpiar archivo:', cleanupError);
      }
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Error al crear producto', 
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  let uploadedFile: any = null;

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Falta el id' });

    // Verificar que el directorio existe antes de procesar
    try {
      await fs.access(PRODUCT_UPLOAD_DIR);
    } catch (error) {
      await fs.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
    }

    const { fields, files } = await parseFormData(req);
    uploadedFile = files?.foto;

    // Validar que todos los campos requeridos estén presentes
    const requiredFields = ['code', 'name', 'category_id', 'price', 'commission'];
    const missingFields = requiredFields.filter(field => !fields[field] || fields[field] === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Faltan campos requeridos: ${missingFields.join(', ')}`
      });
    }

    // Validar duplicado por código (excluyendo el actual)
    const dup = await query(
      'SELECT id_producto FROM productos WHERE codigo = ? AND id_producto != ?',
      [fields.code, id]
    );
    if (Array.isArray(dup) && dup.length) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese código'
      });
    }

    // Validar duplicado por nombre en la misma categoría (excluyendo el actual)
    const dupName = await query(
      'SELECT id_producto FROM productos WHERE LOWER(nombre) = LOWER(?) AND categoria_id = ? AND id_producto != ?',
      [fields.name, fields.category_id, id]
    );
    if (Array.isArray(dupName) && dupName.length) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese nombre en esta categoría'
      });
    }

    // Validar datos
    const parse = productSchema.safeParse({
      ...fields,
      status: fields.status ?? 1
    });
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: parse.error.issues
      });
    }

    // Obtener la imagen actual del producto
    const currentProduct = await query('SELECT foto FROM productos WHERE id_producto = ?', [id]);
    let foto =
      Array.isArray(currentProduct) && currentProduct[0] && 'foto' in currentProduct[0]
        ? (currentProduct[0] as { foto: string }).foto
        : 'default.png';

    // Procesar nueva imagen si existe
    if (files?.foto) {
      try {
        const oldPhotoPath = foto !== 'default.png' ? path.join(PRODUCT_UPLOAD_DIR, foto) : null;

        const processedImage = await validateAndProcessImage(files);
        if (processedImage) {
          foto = processedImage;

          // Eliminar imagen anterior si existe y no es la por defecto
          if (oldPhotoPath) {
            try {
              await fs.access(oldPhotoPath);
              await fs.unlink(oldPhotoPath);
            } catch (unlinkError) {
              console.error('Error al eliminar la imagen anterior:', unlinkError);
            }
          }
        }
      } catch (imageError) {
        console.error('Error al procesar imagen:', imageError);
        // Continuar con la imagen actual si hay error
      }
    }

    await query(
      'UPDATE productos SET codigo = ?, nombre = ?, categoria_id = ?, precio = ?, comision = ?, descripcion = ?, estado = ?, foto = ? WHERE id_producto = ?',
      [
        fields.code,
        fields.name,
        fields.category_id,
        fields.price,
        fields.commission,
        fields.description || '',
        fields.status ?? 1,
        foto,
        id
      ]
    );

    return res.status(200).json({ success: true, message: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    
    // Limpiar archivo subido si hay error
    if (uploadedFile) {
      try {
        const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
        if (file?.filepath) {
          await fs.unlink(file.filepath).catch(() => {});
        }
      } catch (cleanupError) {
        console.error('Error al limpiar archivo:', cleanupError);
      }
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar producto', 
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, action } = req.query;
  if (!id || !action) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros id o action' });
  }
  let newStatus;
  if (action === 'activate') newStatus = 1;
  else if (action === 'deactivate') newStatus = 0;
  else return res.status(400).json({ success: false, message: 'Acción no válida' });
  try {
    await query('UPDATE productos SET estado = ? WHERE id_producto = ?', [newStatus, id]);
    return res.status(200).json({ success: true, message: `Producto actualizado correctamente` });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Error al actualizar producto`, error });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Falta el id' });
  try {
    await query('DELETE FROM productos WHERE id_producto = ?', [id]);
    return res.status(200).json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al eliminar producto', error });
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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
        return res.status(405).json({
          success: false,
          message: `Método ${req.method} no permitido`
        });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
