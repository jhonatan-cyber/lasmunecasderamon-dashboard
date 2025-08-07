export interface OrderDetail {
  id: number;
  pedidoId: number;
  productoId: number;
  precio: number;
  comision: number;
  cantidad: number;
  subtotal: number;
  fechaCrea: string; // o Date si prefieres
}

export interface OrderUser {
  id: number;
  usuarioId: number;
  pedidoId: number;
}

export interface Order {
  id: number;
  codigo: string;
  meseroId: number;
  clienteId: number;
  subtotal: number;
  total: number;
  totalComision: number;
  fechaCrea: string; // o Date si prefieres
  estado: string;
  detalles: OrderDetail[];
  usuarios: OrderUser[];
} 