export interface Client {
  id: number;
  run: string;
  name: string;
  lastName: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}
