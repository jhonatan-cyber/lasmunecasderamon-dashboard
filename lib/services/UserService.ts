import { UserCreateSchema, UserUpdateSchema, type UserType } from '@/lib/business/schemas';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { ValidationError } from '@/lib/errors/errors';
import * as argon2 from 'argon2';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export class UserService {

  static async createUser(body: any, fotoFilename: string = 'default.png') {
    const bodyToValidate = { ...body };
    if (bodyToValidate.foto && typeof bodyToValidate.foto !== 'string' && 'arrayBuffer' in (bodyToValidate.foto as any)) {
      delete bodyToValidate.foto;
    }

    const validated = UserCreateSchema.parse(bodyToValidate);

    const existing = await UserRepository.getByRun(validated.run);
    if (existing) {
      throw new ValidationError('El RUN ya está registrado');
    }
    const email = `${validated.nick}@lasmuñecasderamon.com`;
    const password = await argon2.hash(validated.run);

    return await UserRepository.create({ ...validated, email, password }, fotoFilename);
  }


  static async updateUser(id: string, body: any, fotoFilename: string | null = null) {
    const bodyToValidate = { ...body, id };
    if (bodyToValidate.foto && typeof bodyToValidate.foto !== 'string' && 'arrayBuffer' in (bodyToValidate.foto as any)) {
      delete bodyToValidate.foto;
    }
    const validated = UserUpdateSchema.parse(bodyToValidate);

    const existing = await UserRepository.getById(id.toString());
    if (!existing) throw new Error('Usuario no encontrado');

    if (fotoFilename && existing.foto && existing.foto !== 'default.png' && !existing.foto.startsWith('http')) {
      const oldPath = path.join(process.cwd(), 'public', 'img', 'users', existing.foto);
      if (existsSync(oldPath)) {
        await fs.unlink(oldPath).catch(() => { });
      }
    }

    const updateData: any = { ...validated };

    if (validated.nick) {
      updateData.email = `${validated.nick}@lasmuñecasderamon.com`;
    }
    if (validated.run) {
      updateData.password = await argon2.hash(validated.run);
    }

    return await UserRepository.update(id.toString(), updateData, fotoFilename);
  }

  static async toggleUserStatus(id: string, action: string) {
    if (!['activate', 'deactivate'].includes(action)) {
      throw new Error('Acción de estado inválida');
    }
    return await UserRepository.updateStatus(id, action);
  }
}
