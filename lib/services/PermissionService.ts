import { PermissionRepository } from '@/lib/repositories/PermissionRepository';

export class PermissionService {
  static async getAll() {
    return await PermissionRepository.getAll();
  }

  static async create(data: {
    name: string;
    description?: string;
    module: string;
    action: string;
  }) {
    return await PermissionRepository.create(data);
  }

  static async delete(id: string) {
    return await PermissionRepository.delete(id);
  }

  static async update(
    id: string,
    data: { name?: string; description?: string; module?: string; action?: string }
  ) {
    return await PermissionRepository.update(id, data);
  }
}
