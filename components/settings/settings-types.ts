import type { Permission } from '@/components/permissions/PermissionTable';

export interface CompanyConfig {
  empresa_nombre: string;
  empresa_rut: string;
  empresa_direccion: string;
  empresa_telefono: string;
  empresa_email: string;
  empresa_facebook: string;
  empresa_instagram: string;
  empresa_whatsapp: string;
  empresa_tiktok?: string;
}

export interface BillingConfig {
  impuesto_iva: string;
  propina_venta: string;
  moneda: string;
  /** Split pago con tarjeta. Deben sumar 100. Categoría `comisiones`. */
  split_tarjeta_venta?: string;
  split_tarjeta_propina?: string;
}

export interface BackupItem {
  id_backup: string;
  nombre: string;
  fecha_crea: string;
  registros_count: number;
  tamano_bytes: number;
}

export interface PermissionFormData {
  name: string;
  module: string;
  action: string;
  description: string;
}

export type { Permission };
