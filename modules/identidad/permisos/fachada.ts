import { PermissionRepository } from '@/modules/identidad/permisos/registro';
import { SecurityAlertService } from '@/modules/auditoria';

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
    const perms = await PermissionRepository.getDetails(id);
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
    const oldPerms = await PermissionRepository.getDetails(id);
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
