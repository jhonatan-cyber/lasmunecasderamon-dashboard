export interface AuditLog {
  id?: string;
  user_id?: string | number;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: unknown;
  ip_address?: string;
  created_at?: Date | string;
}
