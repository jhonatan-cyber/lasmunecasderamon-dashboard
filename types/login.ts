// types/login.ts
export interface Login {
  id_login: number;
  usuario_id: number;
  fecha_login?: string;
  fecha_logout?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  estado?: 'activo' | 'cerrado' | 'expirado';
  token_session?: string | null;
  usuario_nombre?: string;
  usuario_nick?: string;
  usuario_rol?: string;
}