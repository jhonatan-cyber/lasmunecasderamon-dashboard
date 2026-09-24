import { UserCreateSchema, UserUpdateSchema, type UserType } from '@/lib/business/schemas';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { ValidationError, NotFoundError } from '@/lib/errors/errors';
import { PermissionsCache } from '@/lib/auth/permissions-cache';
import * as argon2 from 'argon2';
import { EMAIL_DOMAIN } from '@/lib/constants/email';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';

type UserCreateInput = z.input<typeof UserCreateSchema> & { foto?: unknown };
type UserUpdateInput = z.input<typeof UserUpdateSchema> & { foto?: unknown };

export class UserService {
  static async createUser(body: UserCreateInput, fotoFilename: string = 'default.png') {
    const bodyToValidate = { ...body };
    if (
      bodyToValidate.foto &&
      typeof bodyToValidate.foto !== 'string' &&
      'arrayBuffer' in (bodyToValidate.foto as any)
    ) {
      delete bodyToValidate.foto;
    }

    const validated = UserCreateSchema.parse(bodyToValidate);

    const existing = await UserRepository.getByRun(validated.run);
    if (existing) {
      throw new ValidationError('El RUN ya está registrado');
    }
    const email = `${validated.nick}${EMAIL_DOMAIN}`;
    // La contraseña inicial es el RUN (RUT) del trabajador, hasheada con argon2.
    // Se exige cambio en el primer inicio de sesión (force_password_change).
    const tempPassword = String(validated.run).trim();
    const password = await argon2.hash(tempPassword);

    const user = await UserRepository.create(
      { ...validated, email, password, force_password_change: 1 },
      fotoFilename
    );
    return { user, tempPassword };
  }

  static async updateUser(id: string, body: UserUpdateInput, fotoFilename: string | null = null) {
    const bodyToValidate = { ...body, id };
    if (
      bodyToValidate.foto &&
      typeof bodyToValidate.foto !== 'string' &&
      'arrayBuffer' in (bodyToValidate.foto as any)
    ) {
      delete bodyToValidate.foto;
    }
    const validated = UserUpdateSchema.parse(bodyToValidate);

    const existing = await UserRepository.getById(id.toString());
    if (!existing) throw new NotFoundError('Usuario', id);

    if (
      fotoFilename &&
      existing.foto &&
      existing.foto !== 'default.png' &&
      !existing.foto.startsWith('http')
    ) {
      const oldPath = path.join(process.cwd(), 'public', 'img', 'users', existing.foto);
      if (existsSync(oldPath)) {
        await fs.unlink(oldPath).catch(() => {});
      }
    }
    const { id: _validatedId, email: _validatedEmail, ...validatedWithoutId } = validated;
    const updateData: Partial<UserType> & {
      email?: string;
      password?: string;
      force_password_change?: number;
    } = {
      ...validatedWithoutId,
      email: undefined
    };

    if (validated.nick) {
      updateData.email = `${validated.nick}@lasmuñecasderamon.com`;
    }
    let newTempPassword: string | undefined;
    if (validated.run) {
      // Al cambiar el RUN, la contraseña se reinicia al nuevo RUN (hasheado).
      newTempPassword = String(validated.run).trim();
      updateData.password = await argon2.hash(newTempPassword);
      updateData.force_password_change = 1;
    }

    const result = await UserRepository.update(id.toString(), updateData, fotoFilename);

    if (validated.rol_id !== undefined) {
      await PermissionsCache.invalidate(id.toString());
    }

    return { user: result, newTempPassword };
  }

  static async toggleUserStatus(id: string, action: string) {
    if (!['activate', 'deactivate'].includes(action)) {
      throw new ValidationError('Acción de estado inválida', {
        action,
        allowed: ['activate', 'deactivate']
      });
    }

    if (action === 'deactivate') {
      await PermissionsCache.invalidate(id);
    }
    return await UserRepository.updateStatus(id, action);
  }

  static async getAll(params?: Record<string, unknown>) {
    return await UserRepository.getAll(params);
  }

  static async getById(id: string | number) {
    return await UserRepository.getById(id.toString());
  }

  static async delete(id: string | number) {
    return await UserRepository.delete(id.toString());
  }

  static async update(id: string | number, body: Record<string, unknown>) {
    const validated = UserUpdateSchema.omit({ id: true }).parse(body);
    const { email, ...rest } = validated;
    return await UserRepository.update(id.toString(), {
      ...rest,
      ...(email != null ? { email } : {})
    });
  }

  static async getAvailableAnfitrionas() {
    return await UserRepository.getAvailableAnfitrionas();
  }

  static async updateServiceStatus(id: string | number, status: number) {
    return await UserRepository.updateServiceStatus(id.toString(), status);
  }

  static async getStaff() {
    return await UserRepository.getStaff();
  }
}
