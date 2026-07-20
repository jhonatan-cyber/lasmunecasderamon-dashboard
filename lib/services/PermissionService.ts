import { query } from '@/lib/database/db';
import { PermissionRepository } from '@/lib/repositories/PermissionRepository';
import { SecurityAlertService } from '@/lib/services/SecurityAlertService';

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
    const id = await PermissionRepository.create(data);
    // 🔒 Alerta de seguridad: permiso creado
    SecurityAlertService.alertPermissionChange({
      action: 'create',
      targetType: 'permission',
      targetId: id,
      targetName: data.name,
      changedBy: 'system',
      details: { module: data.module, action: data.action }
    }).catch(() => {});
    return id;
  }

  static async delete(id: string) {
    // Obtener info del permiso antes de eliminarlo
    const perms = await query<any[]>('SELECT name, module, action FROM permissions WHERE id = ?', [
      id
    ]);
    const perm = perms[0];
    await PermissionRepository.delete(id);
    // 🔒 Alerta de seguridad: permiso eliminado
    SecurityAlertService.alertPermissionChange({
      action: 'delete',
      targetType: 'permission',
      targetId: id,
      targetName: perm?.name,
      changedBy: 'system',
      details: { module: perm?.module, action: perm?.action }
    }).catch(() => {});
  }

  static async update(
    id: string,
    data: { name?: string; description?: string; module?: string; action?: string }
  ) {
    const oldPerms = await query<any[]>(
      'SELECT name, module, action FROM permissions WHERE id = ?',
      [id]
    );
    const oldPerm = oldPerms[0];
    await PermissionRepository.update(id, data);
    // 🔒 Alerta de seguridad: permiso modificado
    SecurityAlertService.alertPermissionChange({
      action: 'update',
      targetType: 'permission',
      targetId: id,
      targetName: data.name || oldPerm?.name,
      changedBy: 'system',
      details: { before: oldPerm, after: data }
    }).catch(() => {});
  }
}
