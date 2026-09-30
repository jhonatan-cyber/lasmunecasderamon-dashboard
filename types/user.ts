export interface User {
  id: string | number;
  run: string;
  nick: string;
  name: string;
  lastName: string;
  email?: string;
  phone: string;
  address: string;
  maritalStatus: string;
  role: string;
  rol_id?: string | number;
  afp: string;
  salary: number;
  contributions: number;
  housing_discount: boolean;
  discount?: number;
  status: number;
  foto?: string;
  // Asistencia biométrica: código que reporta el lector de la puerta y estado
  // de cada modalidad (la plantilla real vive en el equipo).
  biometrico_codigo?: string | null;
  biometrico_huella?: number;
  biometrico_facial?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}
