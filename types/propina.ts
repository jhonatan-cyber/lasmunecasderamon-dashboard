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
  usuario_foto?: string;
  fecha_crea: string;
  total_propinas: number;
  propinas_pendientes?: number;
  propinas_cobradas?: number;
}