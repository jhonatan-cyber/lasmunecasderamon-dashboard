export interface Product {
  id: string;
  code: string;
  name: string;
  category_id: string;
  display_order?: number;
  price: number;
  commission: number;
  description: string;
  fecha_crea?: string;
  status: number;
  foto?: string;
} 