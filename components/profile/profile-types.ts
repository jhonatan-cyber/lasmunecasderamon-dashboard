export function normalizeProfileUserData(rawUser: any): ProfileUserData {
  return {
    id: rawUser.id,
    run: rawUser.run || '',
    nick: rawUser.nick || '',
    nombre: rawUser.nombre ?? rawUser.name ?? '',
    apellido: rawUser.apellido ?? rawUser.lastName ?? '',
    direccion: rawUser.direccion ?? rawUser.address ?? '',
    telefono: rawUser.telefono ?? rawUser.phone ?? '',
    estado_civil: rawUser.estado_civil ?? rawUser.maritalStatus ?? '',
    rol_id: rawUser.rol_id ?? rawUser.roleId ?? '',
    role: rawUser.role || '',
    email: rawUser.email || '',
    foto: rawUser.foto ?? null,
    fecha_mod: rawUser.fecha_mod ?? rawUser.updated_at ?? null,
    qr_token: rawUser.qr_token ?? null,
    password: rawUser.password ?? ''
  };
}

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
