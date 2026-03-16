import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
    api: {
        bodyParser: false
    }
};

const parseFormData = (req: NextApiRequest): Promise<any> => {
    const uploadDir = path.join(process.cwd(), 'public', 'img', 'users');

    // Asegurar que el directorio existe
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
        uploadDir,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024 // 5MB
    });

    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error('Error parseando form para perfil:', err);
                return reject(err);
            }

            const parsedFields: any = {};
            Object.keys(fields).forEach(key => {
                const value = fields[key];
                parsedFields[key] = Array.isArray(value) ? value[0] : value;
            });

            resolve({ fields: parsedFields, files });
        });
    });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const userData = getCurrentUser(req);
    if (!userData) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    if (req.method === 'GET') {
        try {
            const users = await query(
                'SELECT id_usuario, foto, telefono, direccion, estado_civil, nick, nombre, apellido, email, qr_token FROM usuarios WHERE id_usuario = ?',
                [userData.id]
            ) as any[];

            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            const u = users[0];
            return res.status(200).json({
                success: true,
                user: {
                    id: u.id_usuario,
                    name: u.nombre,
                    lastName: u.apellido,
                    email: u.email,
                    foto: u.foto,
                    phone: u.telefono,
                    address: u.direccion,
                    estado_civil: u.estado_civil,
                    nick: u.nick,
                    qr_token: u.qr_token
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: 'Error al obtener perfil' });
        }
    }

    if (req.method !== 'PUT') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }
    try {
        const { fields, files } = await parseFormData(req);
        const { nick, telefono, direccion, estado_civil, password } = fields;

        // Obtener información actual del usuario
        const users = await query(
            'SELECT id_usuario, foto, telefono, direccion, estado_civil, nick FROM usuarios WHERE id_usuario = ?',
            [userData.id]
        ) as any[];

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const currentUser = users[0];
        let finalFoto = currentUser.foto;

        // Si hay una nueva foto, procesarla y borrar la anterior
        if (files.foto) {
            const fotoFile = Array.isArray(files.foto) ? files.foto[0] : files.foto;
            if (fotoFile && fotoFile.filepath) {
                finalFoto = path.basename(fotoFile.filepath);

                // Si había una foto previa y no era "default.png" o similar, borrarla
                if (currentUser.foto && currentUser.foto !== '' && currentUser.foto !== 'default.png') {
                    const oldPhotoPath = path.join(process.cwd(), 'public', 'img', 'users', currentUser.foto);
                    if (fs.existsSync(oldPhotoPath)) {
                        try {
                            fs.unlinkSync(oldPhotoPath);
                        } catch (err) {
                            console.error('Error al borrar foto anterior:', err);
                        }
                    }
                }
            }
        }

        // Construir consulta dinámicamente
        let queryParts = [
            'telefono = ?',
            'direccion = ?',
            'estado_civil = ?',
            'nick = ?',
            'foto = ?'
        ];
        let params = [
            telefono !== undefined ? telefono : currentUser.telefono,
            direccion !== undefined ? direccion : currentUser.direccion,
            estado_civil !== undefined ? estado_civil : currentUser.estado_civil,
            nick !== undefined ? nick : currentUser.nick,
            finalFoto
        ];

        // Password es opcional
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            queryParts.push('password = ?');
            params.push(hashedPassword);
        }

        const sql = `UPDATE usuarios SET ${queryParts.join(', ')} WHERE id_usuario = ?`;
        params.push(userData.id);

        await query(sql, params);

        // Obtener el usuario actualizado para devolverlo si es necesario
        const [updatedUser] = await query('SELECT id_usuario, foto, telefono, direccion, estado_civil, nick, nombre, apellido, email FROM usuarios WHERE id_usuario = ?', [userData.id]) as any[];

        return res.status(200).json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            user: {
                id: updatedUser.id_usuario,
                name: updatedUser.nombre,
                lastName: updatedUser.apellido,
                email: updatedUser.email,
                foto: updatedUser.foto,
                phone: updatedUser.telefono,
                address: updatedUser.direccion,
                estado_civil: updatedUser.estado_civil,
                nick: updatedUser.nick
            }
        });

    } catch (error: any) {
        console.error('Error en profile update:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar el perfil',
            error: error.message
        });
    }
};

export default withAuth(handler);
