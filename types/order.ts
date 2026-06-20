export interface OrderDetail {
  id: string;
  pedidoId: string;
  productoId: string;
  precio: number;
  comision: number;
  cantidad: number;
  subtotal: number;
  fechaCrea: string;
}

export interface OrderUser {
  id: string;
  usuarioId: string;
  pedidoId: string;
}

export interface Order {
  id: string;
  codigo: string;
  meseroId: string;
  clienteId: string;
  subtotal: number;
  total: number;
  totalComision: number;
  fechaCrea: string;
  estado: string;
  detalles: OrderDetail[];
  usuarios: OrderUser[];
}
