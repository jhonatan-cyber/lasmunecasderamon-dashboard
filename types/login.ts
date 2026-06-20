export interface Login {
  id_login: string;
  usuario_id: string;
  last_login: string;
  estado: number;
  ip_address?: string | null;
  en_local: number;
  usuario_nombre?: string;
  usuario_nick?: string;
  usuario_rol?: string;
}
