import type React from 'react';
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
  impuesto_propina: string;
  moneda: string;
  facturacion_activada: boolean;
  resolucion_sii: string;
}

export interface SystemConfig {
  ambiente: string;
  timezone: string;
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

export type SetCompanyConfig = React.Dispatch<React.SetStateAction<CompanyConfig>>;
export type SetBillingConfig = React.Dispatch<React.SetStateAction<BillingConfig>>;
export type SetSystemConfig = React.Dispatch<React.SetStateAction<SystemConfig>>;

export type { Permission };
