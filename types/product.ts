export interface Product {
  id: number;
  code: string;
  name: string;
  category_id: number;
  display_order?: number;
  price: number;
  commission: number;
  description: string;
  fecha_crea?: string;
  status: number;
  foto?: string;
} 