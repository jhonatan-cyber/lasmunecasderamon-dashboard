export interface PropinaDetalle {
  fecha_hora: string;
  codigo_venta: string;
  monto: number;
  fecha_pago: string | null;
  estado: string;
}

export interface PropinaResumen {
  id_usuario: number;
  nombre: string;
  apellido: string;
  fecha_crea: string;
  total: number;
}