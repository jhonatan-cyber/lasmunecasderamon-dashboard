import { UserCreateSchema, UserUpdateSchema, type UserType } from '@/lib/business/schemas';
import { UserRepository } from '@/lib/repositories/UserRepository';
import * as argon2 from 'argon2';

export class UserService {
  /**
   * Procesa la creación de un nuevo usuario.
   */
  static async createUser(body: any, fotoFilename: string = 'default.png') {
    const validated = UserCreateSchema.parse(body);
    
    // Business Logic: Verificar si el RUN ya existe
    const existing = await UserRepository.getByRun(validated.run);
    if (existing) {
      throw new Error('El RUN ya está registrado');
    }

    // Business Logic: Generar email automático y password (basada en RUN)
    const email = `${validated.nick}@lasmuñecasderamon.com`;
    const password = await argon2.hash(validated.run);

    return await UserRepository.create({ ...validated, email, password }, fotoFilename);
  }

  /**
   * Actualiza un usuario existente.
   */
  static async updateUser(id: string, body: any) {
    const validated = UserUpdateSchema.parse({ ...body, id });
    
    const existing = await UserRepository.getById(id.toString());
    if (!existing) throw new Error('Usuario no encontrado');

    const updateData: any = { ...validated };

    // Si cambió el nick, regenerar email
    if (validated.nick) {
      updateData.email = `${validated.nick}@lasmuñecasderamon.com`;
    }

    // Si cambió el RUN, hashear nueva password
    if (validated.run) {
      updateData.password = await argon2.hash(validated.run);
    }

    return await UserRepository.update(id.toString(), updateData);
  }

  /**
   * Activa o desactiva un usuario.
   */
  static async toggleUserStatus(id: string, action: string) {
    if (!['activate', 'deactivate'].includes(action)) {
      throw new Error('Acción de estado inválida');
    }
    return await UserRepository.updateStatus(id, action);
  }
}
