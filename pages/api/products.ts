import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

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
  description: z.string().min(1, 'Descripción requerida'),
  status: z.preprocess(v => Number(v), z.number()),
  foto: z.string().optional()
});

const mapProductFromDB = (row: any) => ({
  id: row.id_producto,
  code: row.codigo,
  name: row.nombre,
  category_id: row.categoria_id,
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
      return null;
    }

    const file = Array.isArray(files.foto) ? files.foto[0] : files.foto;

    // Validar tipo de archivo
    if (file.mimetype && !ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new Error('Solo se permiten archivos de imagen (JPG, PNG, GIF)');
    }

    // Validar tamaño
    if (file.size && file.size > MAX_FILE_SIZE) {
      throw new Error('La imagen no puede superar los 5MB');
    }

    const extension = path.extname(file.originalFilename || '');
    const newFileName = `product_${Date.now()}${extension}`;
    const newPath = path.join(PRODUCT_UPLOAD_DIR, newFileName);

    // Verificar que el directorio existe
    try {
      await fs.access(PRODUCT_UPLOAD_DIR);
    } catch (error) {
      await fs.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
    }

    // Guardar el archivo usando el buffer
    try {
      await fs.writeFile(newPath, file.buffer);
    } catch (writeError) {
      throw new Error('Error al guardar la imagen en el servidor');
    }

    // Verificar que el archivo se guardó correctamente
    try {
      await fs.access(newPath);
    } catch (error) {
      throw new Error('No se pudo verificar el archivo en destino');
    }

    return newFileName;
  } catch (error) {
    throw new Error(
      `Error al procesar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

async function parseFormData(
  req: NextApiRequest
): Promise<{ fields: Record<string, string>; files: any }> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
          return reject(new Error('No se encontró el boundary en Content-Type'));
        }

        console.log('Boundary encontrado:', boundary);
        console.log('Body length:', body.length);

        const parts = body.split(`--${boundary}`);
        const fields: Record<string, string> = {};
        const files: any = {};

        console.log('Número de partes encontradas:', parts.length);

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          console.log(`Procesando parte ${i}:`, part.substring(0, 100) + '...');

          if (part.includes('Content-Disposition: form-data')) {
            // Buscar el nombre del campo
            const nameMatch = part.match(/name="([^"]+)"/);
            if (!nameMatch) continue;
            
            const name = nameMatch[1];
            console.log('Nombre encontrado:', name);

            // Buscar si es un archivo
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const isFile = !!filenameMatch;
            const filename = filenameMatch ? filenameMatch[1] : '';
            
            if (isFile) {
              console.log('Archivo encontrado:', filename);
            }

            // Extraer el contenido después de la línea vacía
            const contentMatch = part.match(/\r?\n\r?\n([\s\S]*?)(?=\r?\n--|$)/);
            if (contentMatch) {
              const value = contentMatch[1].trim();
              console.log(`Campo ${name}:`, value.substring(0, 50) + '...');

              if (isFile && filename) {
                files[name] = {
                  originalFilename: filename,
                  mimetype: 'application/octet-stream', // Por defecto
                  size: value.length,
                  filepath: `/tmp/${filename}`,
                  buffer: Buffer.from(value, 'binary')
                };
                console.log('Archivo procesado:', filename, 'tamaño:', value.length);
              } else {
                fields[name] = value;
                console.log('Campo procesado:', name, '=', value);
              }
            } else {
              console.log('No se pudo extraer contenido para:', name);
            }
          } else {
            console.log('Parte ignorada - no contiene Content-Disposition');
          }
        }

        // Debug: imprimir los campos extraídos
        console.log('Campos extraídos:', fields);
        console.log('Archivos extraídos:', Object.keys(files));

        resolve({ fields, files });
      } catch (error) {
        console.error('Error al parsear FormData:', error);
        reject(error);
      }
    });

    req.on('error', (error) => {
      reject(error);
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

    // Debug: imprimir todos los campos recibidos
    console.log('=== DEBUG FORM DATA ===');
    console.log('Todos los campos recibidos:', fields);
    console.log('Campos requeridos:', ['code', 'name', 'category_id', 'price', 'commission', 'description']);
    console.log('Archivos recibidos:', Object.keys(files));

    // Validar que todos los campos requeridos estén presentes
    const requiredFields = ['code', 'name', 'category_id', 'price', 'commission', 'description'];
    const missingFields = requiredFields.filter(field => !fields[field] || fields[field] === '');
    
    console.log('Campos faltantes:', missingFields);
    console.log('Valores de campos requeridos:', requiredFields.map(field => ({ field, value: fields[field] })));
    console.log('=== FIN DEBUG ===');
    
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
        errors: parse.error.errors
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
        fields.description,
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

    return res.status(500).json({ success: false, message: 'Error al crear producto', error });
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
    const requiredFields = ['code', 'name', 'category_id', 'price', 'commission', 'description'];
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
        errors: parse.error.errors
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
        fields.description,
        fields.status ?? 1,
        foto,
        id
      ]
    );

    return res.status(200).json({ success: true, message: 'Producto actualizado correctamente' });
  } catch (error) {
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

    return res.status(500).json({ success: false, message: 'Error al actualizar producto', error });
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

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Obtener lista de productos
 *     description: Obtiene la lista completa de productos del sistema con paginación y filtros
 *     tags: [Productos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de elementos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda (nombre, descripción)
 *       - in: query
 *         name: categoria_id
 *         schema:
 *           type: integer
 *         description: Filtrar por categoría
 *       - in: query
 *         name: estado
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Filtrar por estado (0=inactivo, 1=activo)
 *       - in: query
 *         name: min_precio
 *         schema:
 *           type: number
 *           format: float
 *         description: Precio mínimo
 *       - in: query
 *         name: max_precio
 *         schema:
 *           type: number
 *           format: float
 *         description: Precio máximo
 *     responses:
 *       200:
 *         description: Lista de productos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     pages:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Crear nuevo producto
 *     description: Crea un nuevo producto en el sistema
 *     tags: [Productos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - precio
 *               - categoria_id
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Producto 1"
 *                 description: Nombre del producto
 *               precio:
 *                 type: number
 *                 format: float
 *                 example: 25.00
 *                 description: Precio del producto
 *               descripcion:
 *                 type: string
 *                 example: "Descripción del producto"
 *                 description: Descripción detallada
 *               categoria_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID de la categoría
 *               imagen:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/image.jpg"
 *                 description: URL de la imagen del producto
 *               estado:
 *                 type: integer
 *                 default: 1
 *                 example: 1
 *                 description: Estado del producto (0=inactivo, 1=activo)
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *                   example: "Producto creado exitosamente"
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Producto ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
