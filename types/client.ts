export interface Client {
  id: string | number;
  id_cliente?: string | number;
  run: string;
  name: string;
  nombre?: string;
  lastName: string;
  apellido?: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
  saldo?: number;
}
