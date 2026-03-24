import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs/promises';
import formidable, { type Fields, type Files, type File as FormidableFile } from 'formidable';


// Deshabilitar el body parser automÃ¡tico de Next.js para este endpoint
export const config = {
  api: {
    bodyParser: false
  }
};

type UserRow = {
  id_usuario: string;
  run: string;
  nick: string;
  nombre: string;
  apellido: string;
  direccion: string;
  telefono: string;
  estado_civil: string;
  afp: string;
  aporte: number;
  sueldo: number;
  descuento: number | null;
  email: string;
  id_rol: number;
  foto: string | null;
  role_name: string;
  estado: number;
  fecha_crea: string;
  fecha_mod: string | null;
  qr_token: string | null;
};

type UserFields = Record<string, string | string[] | undefined>;
type ParsedFiles = {
  foto?: FormidableFile;
};

// FunciÃ³n para generar email automÃ¡ticamente
const generateEmail = (nick: string): string => {
  return `${nick}@lasmuÃ±ecasderamon.com`;
};

// FunciÃ³n para generar password hash del RUN
const generatePassword = async (run: string): Promise<string> => {
  return await bcrypt.hash(run, 10);
};

// FunciÃ³n para parsear FormData usando Formidable
const parseFormData = async (
  req: NextApiRequest
): Promise<{ fields: UserFields; files: ParsedFiles }> => {
  return new Promise((resolve, reject) => {
    // Crear directorio de uploads si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'img', 'users');
    fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB (aumentado)
      maxFields: 20, // Aumentar lÃ­mite de campos
      keepExtensions: true,
      uploadDir: uploadDir,
      filename: (_name: string, ext: string) => {
        const timestamp = Date.now();
        return `user_${timestamp}${ext}`;
      },
      filter: part => {
        // Solo procesar archivos de imagen
        return !!(part.mimetype && part.mimetype.includes('image/'));
      },
      allowEmptyFiles: false,
      minFileSize: 0
    });

    form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
      if (err) {
        reject(err);
        return;
      }

      // Convertir files a formato esperado
      const processedFiles: ParsedFiles = {};
      const fotoFile = files.foto;
      const file = Array.isArray(fotoFile) ? fotoFile[0] : fotoFile;
      if (file) {
        processedFiles.foto = file;
      }

      resolve({ fields, files: processedFiles });
    });
  });
};

// FunciÃ³n para validar y procesar imagen
const validateAndProcessImage = async (
  imageFile: FormidableFile | null
): Promise<string | null> => {
  try {
    if (!imageFile) {
      return null;
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const fileType = imageFile.mimetype || 'application/octet-stream';

    if (!allowedTypes.includes(fileType)) {
      throw new Error('Tipo de archivo no permitido. Solo se permiten JPG, PNG, GIF');
    }

    // Validar tamaÃ±o (10MB mÃ¡ximo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      throw new Error('El archivo es demasiado grande. MÃ¡ximo 10MB');
    }

    if (imageFile.newFilename) {
      return imageFile.newFilename;
    }

    return path.basename(imageFile.filepath);
  } catch (error) {
    throw error;
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const userId = id as string;

  if (req.method === 'GET') {
    try {
      // Obtener datos completos del usuario
      const users = (await query(
        `SELECT u.*, r.nombre as role_name, r.id_rol 
         FROM usuarios u 
         LEFT JOIN roles r ON u.rol_id = r.id_rol 
         WHERE u.id_usuario = ?`,
        [userId]
      )) as UserRow[];

      if (!Array.isArray(users) || users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
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
        password: '', // No devolver la contraseÃ±a por seguridad
        rol_id: user.id_rol, // Se mantiene internamente para la base de datos
        foto: user.foto,
        role: user.role_name, // Nombre del rol para mostrar
        estado: user.estado,
        fecha_crea: user.fecha_crea,
        fecha_mod: user.fecha_mod,
        qr_token: user.qr_token
      };

      return res.status(200).json({
        success: true,
        user: userData
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      let fields: UserFields = {};
      let uploadedFile: FormidableFile | null = null;

      // Determinar si es FormData o JSON
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        // Es FormData, parsear con formidable

        try {
          const parsedData = await parseFormData(req);
          fields = parsedData.fields;

          // Procesar archivo si existe
          if (parsedData.files && parsedData.files.foto) {
            uploadedFile = parsedData.files.foto;
          }
        } catch {
          return res.status(400).json({
            success: false,
            message: 'Error al procesar los datos del formulario'
          });
        }
      } else {
        // Es JSON - necesitamos parsear manualmente ya que deshabilitamos el body parser

        try {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          await new Promise<void>((resolve, reject) => {
            req.on('end', () => {
              try {
                fields = JSON.parse(body) as UserFields;
                resolve();
              } catch (parseError) {
                reject(parseError);
              }
            });
            req.on('error', reject);
          });
        } catch {
          return res.status(400).json({
            success: false,
            message: 'Error al procesar los datos JSON'
          });
        }
      }

      // Extraer valores de los campos (formidable devuelve arrays)
      const run = Array.isArray(fields.run) ? fields.run[0] : fields.run;
      const nick = Array.isArray(fields.nick) ? fields.nick[0] : fields.nick;
      const nombre = Array.isArray(fields.nombre) ? fields.nombre[0] : fields.nombre;
      const apellido = Array.isArray(fields.apellido) ? fields.apellido[0] : fields.apellido;
      const direccion = Array.isArray(fields.direccion) ? fields.direccion[0] : fields.direccion;
      const telefono = Array.isArray(fields.telefono) ? fields.telefono[0] : fields.telefono;
      const estado_civil = Array.isArray(fields.estado_civil)
        ? fields.estado_civil[0]
        : fields.estado_civil;
      const rol_id = Array.isArray(fields.rol_id) ? fields.rol_id[0] : fields.rol_id;
      const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;
      const confirmPassword = Array.isArray(fields.confirmPassword) ? fields.confirmPassword[0] : fields.confirmPassword;

      // Validar campos requeridos
      const requiredFields = [
        { name: 'run', value: run },
        { name: 'nick', value: nick },
        { name: 'nombre', value: nombre },
        { name: 'apellido', value: apellido }
      ];
      const missingFields = requiredFields.filter(field => !field.value).map(field => field.name);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        });
      }

      const safeRun = run!;
      const safeNick = nick!;
      const safeNombre = nombre!;
      const safeApellido = apellido!;
      const safeDireccion = direccion ?? null;
      const safeTelefono = telefono ?? null;
      const safeEstadoCivil = estado_civil ?? null;

      // Verificar si el usuario existe y obtener datos actuales
      const existingUser = (await query(
        'SELECT id_usuario, run, nick, foto FROM usuarios WHERE id_usuario = ?',
        [userId]
      )) as Array<Pick<UserRow, 'id_usuario' | 'run' | 'nick' | 'foto'>>;

      if (existingUser.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const currentUser = existingUser[0];
      let newPassword = null;
      let newEmail = null;

      // LÃ“GICA DE ACTUALIZACIÃ“N AUTOMÃTICA:
      // - La contraseÃ±a SOLO se actualiza si cambia el RUN
      // - El email se actualiza automÃ¡ticamente si cambia el nick
      // - Si no cambia el RUN, la contraseÃ±a se mantiene igual

      // Verificar si el RUN cambiÃ³ para actualizar contraseÃ±a
      if (safeRun !== currentUser.run) {
        newPassword = await generatePassword(safeRun);
      }

      // Verificar si se proporcionÃ³ una nueva contraseÃ±a manualmente
      if (password && confirmPassword) {
        if (password !== confirmPassword) {
          return res.status(400).json({
            success: false,
            message: 'Las contraseÃ±as no coinciden'
          });
        }
        
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'La contraseÃ±a debe tener al menos 6 caracteres'
          });
        }
        
        newPassword = await bcrypt.hash(password, 10);
      }

      // Verificar si el nick cambiÃ³ para actualizar email
      if (safeNick !== currentUser.nick) {
        newEmail = generateEmail(safeNick);
      }

      // Procesar imagen si se subiÃ³ una nueva
      let foto = currentUser.foto;
      if (uploadedFile) {
        try {
          const newFoto = await validateAndProcessImage(uploadedFile);
          if (newFoto) {
            // Eliminar imagen anterior solo si existe, no es la por defecto y es diferente a la nueva
            if (foto && foto !== 'default.png' && foto !== newFoto) {
              try {
                const oldPhotoPath = path.join(process.cwd(), 'public', 'img', 'users', foto);
                await fs.access(oldPhotoPath);
                await fs.unlink(oldPhotoPath);
              } catch (unlinkError) {
                console.error(
                  'ðŸ”µ [PROFILE UPDATE] Error al eliminar imagen anterior:',
                  unlinkError
                );
                // No fallar la actualizaciÃ³n si no se puede eliminar la foto anterior
              }
            } else if (foto === 'default.png') {
              console.warn('ðŸ”µ [PROFILE UPDATE] Foto anterior es default.png, no se elimina');
            } else if (foto === newFoto) {
              console.warn('ðŸ”µ [PROFILE UPDATE] Nueva foto es igual a la anterior, no se elimina');
            } else {
              console.warn('ðŸ”µ [PROFILE UPDATE] No hay foto anterior para eliminar');
            }

            foto = newFoto;
          }
        } catch (imageError) {
          return res.status(400).json({
            success: false,
            message: `Error al procesar imagen: ${imageError instanceof Error ? imageError.message : 'Error desconocido'}`
          });
        }
      } else {
        console.warn('ðŸ”µ [PROFILE UPDATE] No se subiÃ³ nueva imagen, manteniendo foto actual:', foto);
      }

      // Preparar la consulta de actualizaciÃ³n
      let updateQuery = `
        UPDATE usuarios SET 
          run = ?, nick = ?, nombre = ?, apellido = ?, 
          direccion = ?, telefono = ?, estado_civil = ?, 
          foto = ?, fecha_mod = NOW()
      `;

      const params: Array<string | number | null> = [
        safeRun,
        safeNick,
        safeNombre,
        safeApellido,
        safeDireccion,
        safeTelefono,
        safeEstadoCivil,
        foto
      ];

      // Agregar rol_id si se proporciona
      if (rol_id) {
        updateQuery += ', rol_id = ?';
        params.push(rol_id);
      }

      // Agregar email si cambió
      if (newEmail) {
        updateQuery += ', email = ?';
        params.push(newEmail);
      }

      // Agregar password si cambió
      if (newPassword) {
        updateQuery += ', password = ?';
        params.push(newPassword);
      }

      updateQuery += ' WHERE id_usuario = ?';
      params.push(userId);

      await query(updateQuery, params);      // Preparar mensaje de respuesta
      let message = 'Perfil actualizado exitosamente';
      const changes: string[] = [];

      if (newPassword) {
        if (safeRun !== currentUser.run) {
          changes.push('contraseña actualizada (RUN cambió)');
        } else {
          changes.push('contraseña actualizada');
        }
      }
      if (newEmail) changes.push('email actualizado (nick cambió)');
      if (uploadedFile) changes.push('foto actualizada');

      if (changes.length > 0) {
        message += ` (${changes.join(', ')})`;
      }

      return res.status(200).json({
        success: true,
        message,
        changes: {
          passwordUpdated: !!newPassword,
          emailUpdated: !!newEmail,
          photoUpdated: !!uploadedFile
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar perfil',
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


