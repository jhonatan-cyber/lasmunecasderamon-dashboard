export interface ProfileCurrentUser {
  id: string | number;
  name: string;
  lastName: string;
  role: string;
}

export interface ProfileUserOption {
  id: string | number;
  name: string;
  lastName: string;
  role: string;
}

export interface ProfileRoleOption {
  id_rol: string | number;
  nombre: string;
}

export interface ProfileUserData {
  id: string | number;
  run: string;
  nick: string;
  nombre: string;
  apellido: string;
  direccion: string;
  telefono: string;
  estado_civil: string;
  rol_id: string | number;
  role: string;
  email: string;
  foto?: string | null;
  fecha_mod?: string | null;
  qr_token?: string | null;
  password?: string;
}
