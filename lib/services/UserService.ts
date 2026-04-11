import { UserCreateSchema, UserUpdateSchema, type UserType } from '@/lib/business/schemas';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { ValidationError, NotFoundError } from '@/lib/errors/errors';
import { PermissionsCache } from '@/lib/auth/permissions-cache';
import * as argon2 from 'argon2';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';

type UserCreateInput = z.input<typeof UserCreateSchema> & { foto?: unknown };
type UserUpdateInput = z.input<typeof UserUpdateSchema> & { foto?: unknown };

export class UserService {

  static async createUser(body: UserCreateInput, fotoFilename: string = 'default.png') {
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


  static async updateUser(id: string, body: UserUpdateInput, fotoFilename: string | null = null) {
    const bodyToValidate = { ...body, id };
    if (bodyToValidate.foto && typeof bodyToValidate.foto !== 'string' && 'arrayBuffer' in (bodyToValidate.foto as any)) {
      delete bodyToValidate.foto;
    }
    const validated = UserUpdateSchema.parse(bodyToValidate);

    const existing = await UserRepository.getById(id.toString());
    if (!existing) throw new NotFoundError('Usuario', id);

    if (fotoFilename && existing.foto && existing.foto !== 'default.png' && !existing.foto.startsWith('http')) {
      const oldPath = path.join(process.cwd(), 'public', 'img', 'users', existing.foto);
      if (existsSync(oldPath)) {
        await fs.unlink(oldPath).catch(() => { });
      }
    }
    const { id: _validatedId, email: _validatedEmail, ...validatedWithoutId } = validated;
    const updateData: Partial<UserType> & { email?: string; password?: string } = {
      ...validatedWithoutId,
      email: undefined
    };

    if (validated.nick) {
      updateData.email = `${validated.nick}@lasmuñecasderamon.com`;
    }
    if (validated.run) {
      updateData.password = await argon2.hash(validated.run);
    }

    const result = await UserRepository.update(id.toString(), updateData, fotoFilename);

    // Si cambió el rol, invalidar el caché de permisos para que el próximo
    // request cargue los permisos actualizados desde la BD
    if (validated.rol_id !== undefined) {
      PermissionsCache.invalidate(id.toString());
    }

    return result;
  }

  static async toggleUserStatus(id: string, action: string) {
    if (!['activate', 'deactivate'].includes(action)) {
      throw new ValidationError('Acción de estado inválida', { action, allowed: ['activate', 'deactivate'] });
    }
    // Al desactivar un usuario, limpiar su caché de permisos
    if (action === 'deactivate') {
      PermissionsCache.invalidate(id);
    }
    return await UserRepository.updateStatus(id, action);
  }
}

