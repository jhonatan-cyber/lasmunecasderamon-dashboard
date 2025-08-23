export interface PropinaDetalle {
  fecha_hora: string;
  codigo_venta: string;
  monto: number;
  fecha_pago: string | null;
  estado: string;
}

export interface PropinaResumen {
  id_usuario: number;
  nick: string;
  nombre_completo: string;
  fecha_crea: string;
  total_propinas: number;
}