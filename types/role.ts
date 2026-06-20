
export interface Role {
  id: number;
  name: string;
  description: string;
  status: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}
  
  export interface RolePermission {
    role_id: number;
    permission_id: number;
  }
  
  export interface Permission {
    id: number;
    name: string;
    description: string;
    created_at: Date;
  }