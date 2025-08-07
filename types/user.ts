export interface User {
    id: number;
    run: string;
    nick: string;
    name: string;
    lastName: string;
    email?: string;
    phone: string;
    address: string;
    maritalStatus: string;
    role: string;
    roleId?: number;
    afp: string;
    salary: number;
    contributions: number;
    housing_discount: boolean;
    discount?: number;
    status: number;
    foto?: string;
    created_at: string;
    updated_at?: string;
    deleted_at?: string;
  }