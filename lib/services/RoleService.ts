import { RoleRepository } from '@/lib/repositories/RoleRepository';

export class RoleService {
  static async getAll() {
    return await RoleRepository.getAll();
  }

  static async getById(id: string) {
    return await RoleRepository.getById(id);
  }

  static async create(data: { nombre: string; descripcion?: string }) {
    return await RoleRepository.create(data);
  }

  static async updateRole(id: string, data: { nombre: string; descripcion?: string }) {
    return await RoleRepository.updateRole(id, data);
  }

  static async delete(id: string) {
    return await RoleRepository.delete(id);
  }

  static async getAdminPermissions() {
    return await RoleRepository.getAdminPermissions();
  }
}
